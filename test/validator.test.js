const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { readEventsAt } = require("../src/events");
const { ValidationError, assertValidEvents, formatValidationErrors, validateEvents } = require("../src/validator");

const root = path.resolve(__dirname, "..");
const canonicalLog = path.join(root, ".clista", "events.ndjson");
const fixtureLog = path.join(root, "examples", "first-test-thread", "events.ndjson");
const cliPath = path.join(root, "src", "cli.js");

test("validates the canonical ClisTa event logs", () => {
  assert.deepEqual(validateEvents(readEventsAt(canonicalLog)), { valid: true, errors: [] });
  assert.deepEqual(validateEvents(readEventsAt(fixtureLog)), { valid: true, errors: [] });
});

test("assertValidEvents throws a readable validation error", () => {
  const events = cloneCanonicalEvents();
  eventOf(events, "ClaimCreated").payload.claim.evidenceIds = ["evd_missing"];

  assert.throws(() => assertValidEvents(events), (error) => {
    assert.ok(error instanceof ValidationError);
    assert.match(error.message, /evidence reference does not exist: evd_missing/);
    assert.match(error.errors[0].event_id, /^evt_/);
    return true;
  });
});

test("rejects events missing required envelope fields", () => {
  for (const field of ["event_id", "event_type", "thread_id", "actor_id", "timestamp", "payload"]) {
    const events = cloneCanonicalEvents();
    delete events[4][field];

    assertInvalid(events, new RegExp(`missing ${field}`));
  }
});

test("rejects claim references to unknown evidence", () => {
  const events = cloneCanonicalEvents();
  eventOf(events, "ClaimCreated").payload.claim.evidenceIds = ["evd_missing"];

  assertInvalid(events, /evidence reference does not exist: evd_missing/);
});

test("rejects position references to unknown participants", () => {
  const events = cloneCanonicalEvents();
  eventOf(events, "PositionTaken").payload.position.participantId = "par_missing";

  assertInvalid(events, /position references unknown participant par_missing/);
});

test("rejects objection references to unknown claims, positions, and decision requests", () => {
  for (const [targetObjectType, targetObjectId, expected] of [
    ["claim", "clm_missing", /claim target does not exist: clm_missing/],
    ["position", "pos_missing", /position target does not exist: pos_missing/],
    ["decisionRequest", "drq_missing", /decisionRequest target does not exist: drq_missing/]
  ]) {
    const events = cloneCanonicalEvents();
    const objection = eventOf(events, "ObjectionRaised").payload.objection;
    objection.targetObjectType = targetObjectType;
    objection.targetObjectId = targetObjectId;

    assertInvalid(events, expected);
  }
});

test("rejects minority reports that reference unknown decisions", () => {
  const events = cloneCanonicalEvents();
  eventOf(events, "MinorityReportFiled").payload.minorityReport.decisionRecordId = "dcr_missing";

  assertInvalid(events, /minority report references unknown decision dcr_missing/);
});

test("rejects reviews that reference unknown decision requests", () => {
  const events = cloneCanonicalEvents();
  eventOf(events, "ReviewSubmitted").payload.review.decisionRequestId = "drq_missing";

  assertInvalid(events, /review references unknown decision request drq_missing/);
});

test("rejects decision merge before a decision request is opened", () => {
  const events = cloneCanonicalEvents();
  moveEventBefore(events, "DecisionMerged", "DecisionRequestOpened");

  assertInvalid(events, /decision merge before decision request opened: drq_protocol_first_architecture/);
});

test("rejects reviews submitted after a decision already merged", () => {
  const events = cloneCanonicalEvents();
  const review = clone(eventOf(events, "ReviewSubmitted"));
  review.event_id = "evt_invalid_review_after_merge";
  review.timestamp = "2026-06-06T00:00:00.000Z";
  review.payload.review.id = "rev_invalid_after_merge";
  events.push(review);

  assertInvalid(events, /review submitted after decision already merged for drq_protocol_first_architecture/);
});

test("rejects objection resolution before the objection exists", () => {
  const events = cloneCanonicalEvents();
  events.push(makeEvent({
    event_id: "evt_invalid_objection_resolved_missing",
    event_type: "ObjectionResolved",
    actor_id: "par_troy",
    payload: {
      objectionId: "obj_missing",
      resolution: "Resolved by assertion."
    }
  }));

  assertInvalid(events, /objection resolved before objection exists: obj_missing/);
});

test("rejects duplicate final decisions for the same request", () => {
  const events = cloneCanonicalEvents();
  const duplicate = clone(eventOf(events, "DecisionMerged"));
  duplicate.event_id = "evt_invalid_duplicate_decision";
  duplicate.timestamp = "2026-06-06T00:01:00.000Z";
  duplicate.payload.decisionRecord.id = "dcr_duplicate_protocol_first_architecture";
  events.push(duplicate);

  assertInvalid(events, /duplicate final decision for request drq_protocol_first_architecture/);
});

test("rejects decisions merged without evidence", () => {
  const events = cloneCanonicalEvents();
  eventOf(events, "DecisionRequestOpened").payload.decisionRequest.supportingEvidenceIds = [];
  eventOf(events, "DecisionMerged").payload.decisionRecord.supportingEvidenceIds = [];

  assertInvalid(events, /decision merged without evidence/);
});

test("rejects decisions merged without review", () => {
  const events = cloneCanonicalEvents().filter((event) => event.event_type !== "ReviewSubmitted");

  assertInvalid(events, /decision merged without review/);
});

test("rejects decisions merged with unresolved blocking objections omitted", () => {
  const events = cloneCanonicalEvents();
  eventOf(events, "DecisionMerged").payload.decisionRecord.preservedObjectionIds = [];

  assertInvalid(events, /decision record omits unresolved objection obj_object_model_too_broad/);
});

test("rejects decisions merged without an authorized decision owner", () => {
  const events = cloneCanonicalEvents();
  const merge = eventOf(events, "DecisionMerged");
  merge.actor_id = "par_codex";
  merge.payload.decisionRecord.decidedByParticipantId = "par_codex";

  assertInvalid(events, /decision merged without authorized decision owner par_codex/);
});

test("rejects resolved objections without resolution text", () => {
  const events = cloneCanonicalEvents();
  eventWithObject(events, "ObjectionRaised", "obj_future_models").payload.objection.resolution = "";

  assertInvalid(events, /objection obj_future_models marked resolved without resolution text/);
});

test("rejects objections resolved by unauthorized actors", () => {
  const events = cloneCanonicalEvents();
  events.push(makeEvent({
    event_id: "evt_invalid_objection_unauthorized_resolution",
    event_type: "ObjectionResolved",
    actor_id: "par_chatgpt",
    payload: {
      objectionId: "obj_object_model_too_broad",
      resolution: "Resolved over the objector."
    }
  }));

  assertInvalid(events, /objection obj_object_model_too_broad resolved by unauthorized actor par_chatgpt/);
});

test("rejects preserved objections without minority reports", () => {
  const events = cloneCanonicalEvents().filter((event) => event.event_type !== "MinorityReportFiled");

  assertInvalid(events, /decision record preserves obj_object_model_too_broad without minority report/);
});

test("rejects duplicate event ids", () => {
  const events = cloneCanonicalEvents();
  events[1].event_id = events[0].event_id;

  assertInvalid(events, /duplicate event_id/);
});

test("rejects invalid previous_hash chains when hashes exist", () => {
  const events = cloneCanonicalEvents();
  events[1].previous_hash = `sha256:${"0".repeat(64)}`;

  assertInvalid(events, /invalid previous_hash chain/);
});

test("rejects malformed timestamps", () => {
  const events = cloneCanonicalEvents();
  events[0].timestamp = "tomorrow-ish";

  assertInvalid(events, /malformed timestamp tomorrow-ish/);
});

test("rejects out-of-order sequence numbers when sequence numbers exist", () => {
  const events = cloneCanonicalEvents();
  events[0].sequence_number = 2;
  events[1].sequence_number = 1;

  assertInvalid(events, /events applied out of order by sequence number/);
});

test("CLI validate reports valid logs and exits zero", () => {
  const result = spawnSync("node", [cliPath, "validate", "--events", fixtureLog], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), { valid: true, errors: [] });
  assert.equal(result.stderr, "");
});

test("CLI validate reports invalid logs and exits nonzero", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "clista-invalid-"));
  const invalidLog = path.join(dir, "events.ndjson");
  const events = cloneCanonicalEvents();
  eventOf(events, "ClaimCreated").payload.claim.evidenceIds = ["evd_missing"];
  writeFileSync(invalidLog, `${events.map((event) => JSON.stringify(event)).join("\n")}\n`, "utf8");

  const result = spawnSync("node", [cliPath, "validate", "--events", invalidLog], {
    cwd: root,
    encoding: "utf8"
  });
  const output = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(output.valid, false);
  assert.match(formatValidationErrors(output.errors), /evd_missing/);
  assert.equal(result.stderr, "");
});

function cloneCanonicalEvents() {
  return clone(readEventsAt(canonicalLog));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function eventOf(events, eventType) {
  const event = events.find((candidate) => candidate.event_type === eventType);
  assert.ok(event, `expected ${eventType} event`);
  return event;
}

function eventWithObject(events, eventType, objectId) {
  const event = events.find((candidate) => {
    if (candidate.event_type !== eventType) {
      return false;
    }
    return Object.values(candidate.payload || {}).some((object) => object?.id === objectId);
  });
  assert.ok(event, `expected ${eventType} event for ${objectId}`);
  return event;
}

function moveEventBefore(events, movingType, targetType) {
  const movingIndex = events.findIndex((event) => event.event_type === movingType);
  assert.notEqual(movingIndex, -1, `expected ${movingType} event`);
  const [moving] = events.splice(movingIndex, 1);
  const targetIndex = events.findIndex((event) => event.event_type === targetType);
  assert.notEqual(targetIndex, -1, `expected ${targetType} event`);
  events.splice(targetIndex, 0, moving);
}

function makeEvent({ event_id, event_type, actor_id, payload }) {
  return {
    event_id,
    event_type,
    thread_id: "thd_thread_0001",
    actor_id,
    timestamp: "2026-06-06T00:02:00.000Z",
    payload
  };
}

function assertInvalid(events, expectedReason) {
  const result = validateEvents(events);
  assert.equal(result.valid, false);
  assert.match(formatValidationErrors(result.errors), expectedReason);
  for (const error of result.errors) {
    assert.ok(Object.hasOwn(error, "event_id"));
    assert.ok(Object.hasOwn(error, "reason"));
  }
}

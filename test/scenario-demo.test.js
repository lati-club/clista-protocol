const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { readEventsAt } = require("../src/events");
const { exportProtocol, projectEvents, selectThreadState } = require("../src/projector");

const root = path.resolve(__dirname, "..");
const cliPath = path.join(root, "src", "cli.js");
const scenarioDir = path.join(root, "examples", "scenario-demo");
const fixtureLog = path.join(scenarioDir, "events.ndjson");
const expectedPath = path.join(scenarioDir, "expected-state.json");
const canonicalLog = path.join(root, ".clista", "events.ndjson");
const threadId = "thd_scenario_demo";

test("scenario demo documents the replay path with existing CLI commands", () => {
  const readme = readFileSync(path.join(scenarioDir, "README.md"), "utf8");
  const commands = readFileSync(path.join(scenarioDir, "commands.md"), "utf8");

  assert.match(readme, /node src\/cli\.js validate --events examples\/scenario-demo\/events\.ndjson/);
  assert.match(readme, /node src\/cli\.js state show --thread thd_scenario_demo --events examples\/scenario-demo\/events\.ndjson/);
  assert.match(readme, /node src\/cli\.js export --events examples\/scenario-demo\/events\.ndjson/);
  assert.match(commands, /node src\/cli\.js attribution list --thread thd_scenario_demo --events examples\/scenario-demo\/events\.ndjson/);
  assert.match(commands, /node src\/cli\.js provenance trace dcr_limited_beta --events examples\/scenario-demo\/events\.ndjson/);
  assert.doesNotMatch(commands, /clista (scenario|demo) run/);
});

test("scenario demo validates and replays through the documented CLI path", () => {
  const validation = runCli(["validate", "--events", fixtureLog]);
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);

  const state = runCli(["state", "show", "--thread", threadId, "--events", fixtureLog]);
  assert.equal(state.schema, "clista.threadState.v0");
  assert.equal(state.reasoningState.decision.id, "dcr_limited_beta");
  assert.equal(state.reasoningState.decision.status, "approved");
  assert.equal(state.reasoningState.objections[0].status, "preserved");

  const exported = runCli(["export", "--events", fixtureLog]);
  assert.equal(exported.schema, "clista.protocol.v0");
  assert.equal(exported.threads[0].id, threadId);
  assert.equal(exported.events.length, 23);
});

test("scenario demo projects the expected durable reasoning state", () => {
  const expected = JSON.parse(readFileSync(expectedPath, "utf8"));
  const events = readEventsAt(fixtureLog);
  const state = selectThreadState(projectEvents(events), expected.threadId);
  const decision = state.decisionStatus.decisionRecord;

  assert.equal(events.length, expected.durableState.eventCount);
  assert.equal(state.reasoningState.question, expected.question);
  assert.equal(decision.id, expected.decision.id);
  assert.equal(decision.status, expected.decision.status);
  assert.equal(decision.summary, expected.decision.summary);
  assert.equal(decision.nextAction, expected.decision.nextAction);
  assert.deepEqual(state.reasoningState.evidence.map((item) => item.id), expected.durableState.evidenceIds);
  assert.deepEqual(state.reasoningState.assumptions.map((item) => item.id), expected.durableState.assumptionIds);
  assert.deepEqual(state.reasoningState.claims.map((item) => item.id), expected.durableState.claimIds);
  assert.deepEqual(state.reasoningState.positions.map((item) => item.id), expected.durableState.positionIds);
  assert.deepEqual(state.reasoningState.objections.map((item) => item.id), expected.durableState.objectionIds);
  assert.deepEqual(state.decisionStatus.reviews.map((item) => item.id), expected.durableState.reviewIds);
  assert.deepEqual(state.reasoningState.minority_reports.map((item) => item.id), expected.durableState.minorityReportIds);
  assert.equal(state.reasoningState.audit_summary.source, "append_only_event_log");
  assert.equal(state.reasoningState.audit_summary.events_replayed, expected.durableState.eventCount);
});

test("scenario demo export preserves audit trail, attribution, and provenance", () => {
  const events = readEventsAt(fixtureLog);
  const exported = exportProtocol(projectEvents(events));
  const decisionAttribution = exported.contributionAttributions.find((record) => {
    return record.contributionId === "dcr_limited_beta";
  });
  const decisionProvenance = exported.contributionProvenance.find((record) => {
    return record.contributionId === "dcr_limited_beta";
  });

  assert.equal(exported.integrity.valid, true);
  assert.equal(exported.events.length, 23);
  assert.equal(exported.evidence.length, 4);
  assert.equal(exported.assumptions.length, 2);
  assert.equal(exported.claims.length, 3);
  assert.equal(exported.positions.length, 3);
  assert.equal(exported.objections[0].status, "preserved");
  assert.equal(exported.reviews.length, 2);
  assert.equal(exported.decisionRecords[0].id, "dcr_limited_beta");
  assert.equal(exported.minorityReports[0].id, "mnr_privacy_gate");
  assert.equal(decisionAttribution.participantId, "par_maya");
  assert.equal(decisionAttribution.authorityContext.requiredAuthority, "decision_owner");
  assert.equal(decisionAttribution.authorityContext.permitted, true);
  assert.ok(decisionProvenance.sourceRefs.some((sourceRef) => sourceRef.sourceId === "evd_privacy_risk"));
  assert.ok(decisionProvenance.sourceRefs.some((sourceRef) => sourceRef.objectId === "obj_unredacted_data_risk"));
  assert.ok(decisionProvenance.sourceRefs.some((sourceRef) => sourceRef.objectId === "rev_privacy_conditions"));
});

test("scenario demo replay is read-only and does not create forbidden boundary claims", () => {
  const canonicalBefore = readFileSync(canonicalLog, "utf8");
  const fixtureBefore = readFileSync(fixtureLog, "utf8");
  const expected = JSON.parse(readFileSync(expectedPath, "utf8"));

  runCli(["validate", "--events", fixtureLog]);
  const state = runCli(["state", "show", "--thread", threadId, "--events", fixtureLog]);
  const exported = runCli(["export", "--events", fixtureLog]);

  assert.equal(readFileSync(canonicalLog, "utf8"), canonicalBefore);
  assert.equal(readFileSync(fixtureLog, "utf8"), fixtureBefore);
  assertNoTrueBoundaryClaims(expected.boundary);
  assertNoTrueBoundaryClaims(state);
  assertNoTrueBoundaryClaims(exported);
});

function runCli(args) {
  const result = spawnSync("node", [cliPath, ...args], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function assertNoTrueBoundaryClaims(value) {
  const forbidden = new Set([
    "trusted",
    "protocolAuthority",
    "governanceApproval",
    "amendmentApproval",
    "compatibilityProof",
    "distributionProof",
    "productReady"
  ]);
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") {
      continue;
    }
    for (const [key, nested] of Object.entries(current)) {
      assert.notEqual(forbidden.has(key) && nested === true, true, `${key} was created`);
      if (nested && typeof nested === "object") {
        stack.push(nested);
      }
    }
  }
}

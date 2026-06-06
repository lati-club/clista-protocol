const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { readEventsAt } = require("../src/events");
const { projectEvents, selectThreadState } = require("../src/projector");
const { formatValidationErrors, validateEvents } = require("../src/validator");

const root = path.resolve(__dirname, "..");
const cliPath = path.join(root, "src", "cli.js");
const canonicalLog = path.join(root, ".clista", "events.ndjson");

test("learning review derives deterministic pattern-level signals from outcomes", () => {
  const cwd = createLearningOutcomeStore();

  const first = runCli(cwd, ["learning", "review", "--thread", "thd_learning"]);
  const second = runCli(cwd, ["learning", "review", "--thread", "thd_learning"]);
  assert.deepEqual(first.learning.signals, second.learning.signals);

  assert.equal(first.schema, "clista.learning.review.v0");
  assert.equal(first.hardLaw, "learning != reputation");
  assert.ok(first.learning.signals.length >= 5);
  assert.ok(first.learning.patterns.some((pattern) => pattern.pattern === "expected_outcome_failed"));
  assert.ok(first.learning.signals.some((signal) => signal.signalType === "assumption_accuracy"));
  assert.ok(first.learning.signals.some((signal) => signal.signalType === "evidence_sufficiency"));
  assert.ok(first.learning.revisitRecommendations.some((recommendation) => {
    return recommendation.pattern === "failed_outcome_requires_revisit";
  }));

  for (const signal of first.learning.signals) {
    assert.equal(signal.actorScoring, false);
    assert.equal(signal.sourceScoring, false);
    assert.equal(signal.modelRanking, false);
    assert.equal(signal.authorityMutation, false);
    assert.ok(["low", "medium", "high"].includes(signal.confidence));
    assert.equal(Object.prototype.hasOwnProperty.call(signal, "participantScore"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(signal, "sourceScore"), false);
  }
});

test("learning CLI lists, shows, verifies, and projects into thread state", () => {
  const cwd = createLearningOutcomeStore();

  const list = runCli(cwd, ["learning", "list", "--thread", "thd_learning"]);
  assert.equal(list.schema, "clista.learning.list.v0");
  assert.ok(list.count > 0);

  const shown = runCli(cwd, ["learning", "show", list.signals[0].id]);
  assert.equal(shown.schema, "clista.learning.item.v0");
  assert.equal(shown.item.id, list.signals[0].id);

  const verify = runCli(cwd, ["learning", "verify"]);
  assert.equal(verify.valid, true);
  assert.equal(verify.learningValidationStatus.actorScoring, false);
  assert.equal(verify.learningValidationStatus.sourceScoring, false);
  assert.equal(verify.learningValidationStatus.modelRanking, false);

  const state = runCli(cwd, ["state", "show", "--thread", "thd_learning"]);
  assert.equal(state.reasoningState.learning.hardLaw, "learning != reputation");
  assert.equal(state.reasoningState.learning.signals.length, list.count);

  const projection = projectEvents(readStoreEvents(cwd));
  const threadState = selectThreadState(projection, "thd_learning");
  assert.equal(threadState.reasoningState.learning.signals.length, list.count);
});

test("learning validation rejects participant/source/model scoring and authority mutation", () => {
  const cwd = createLearningOutcomeStore();
  const events = readStoreEvents(cwd);

  assertInvalid([
    ...events,
    makeLearningSignalEvent({
      id: "lrn_bad_participant_score",
      participantScore: 0.2
    })
  ], /learning cannot include reputation, scoring, or ranking field participantScore/);

  assertInvalid([
    ...events,
    makeLearningSignalEvent({
      id: "lrn_bad_source_score",
      sourceScores: {
        launch_plan: 0.1
      }
    })
  ], /learning cannot include reputation, scoring, or ranking field sourceScores/);

  assertInvalid([
    ...events,
    makeLearningSignalEvent({
      id: "lrn_bad_model_ranking",
      modelRanking: true
    })
  ], /learning cannot include reputation, scoring, or ranking field modelRanking/);

  assertInvalid([
    ...events,
    makeLearningSignalEvent({
      id: "lrn_bad_authority_mutation",
      authorityMutation: true
    })
  ], /learning field authorityMutation must be false/);
});

test("learning validation rejects future references and missing uncertainty", () => {
  const cwd = createLearningOutcomeStore();
  const events = readStoreEvents(cwd);
  const outcomeIndex = events.findIndex((event) => event.payload?.outcomeAudit?.id === "out_growth");
  const futureOutcomeEvents = clone(events);
  futureOutcomeEvents.splice(outcomeIndex, 0, makeLearningSignalEvent({
    id: "lrn_future_outcome",
    outcomeRefs: ["out_growth"]
  }));
  assertInvalid(futureOutcomeEvents, /learning references unknown or future outcome out_growth/);

  assertInvalid([
    ...events,
    makeLearningSignalEvent({
      id: "lrn_missing_confidence",
      confidence: "certain"
    })
  ], /learning signal requires confidence low, medium, or high/);
});

test("explicit learning events project without becoming actor reputation", () => {
  const cwd = createLearningOutcomeStore();
  const events = readStoreEvents(cwd);
  events.push(makeLearningSignalEvent({
    id: "lrn_explicit_pattern",
    pattern: "reviewed_failure_pattern",
    finding: "Failure was reviewed as a pattern, not as participant reputation.",
    confidence: "medium"
  }));

  const validation = validateEvents(events);
  assert.equal(validation.valid, true, formatValidationErrors(validation.errors));

  const projected = projectEvents(events).learning.bySignal.lrn_explicit_pattern;
  assert.equal(projected.explicit, true);
  assert.equal(projected.actorScoring, false);
  assert.equal(projected.sourceScoring, false);
  assert.equal(projected.modelRanking, false);
});

test("legacy event logs remain learning-compatible without outcomes", () => {
  const events = readEventsAt(canonicalLog);
  const validation = validateEvents(events);
  assert.equal(validation.valid, true, formatValidationErrors(validation.errors));

  const projection = projectEvents(events);
  assert.equal(projection.learning.learningValidationStatus.valid, true);
  assert.equal(projection.learning.signals.length, 0);
});

function createLearningOutcomeStore() {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "clista-learning-"));
  runCli(cwd, ["init"]);
  runCli(cwd, [
    "thread",
    "create",
    "--id",
    "thd_learning",
    "--title",
    "Learning Thread",
    "--question",
    "Can ClisTa learn from outcomes without reputation?",
    "--participant",
    "Troy:decision owner"
  ]);
  runCli(cwd, [
    "evidence",
    "commit",
    "--id",
    "evd_capacity",
    "--thread",
    "thd_learning",
    "--source",
    "Launch plan",
    "--finding",
    "Capacity was expected to support launch growth."
  ]);
  runCli(cwd, [
    "assumption",
    "declare",
    "--id",
    "asm_capacity",
    "--thread",
    "thd_learning",
    "--text",
    "Capacity will support launch growth.",
    "--evidence",
    "evd_capacity"
  ]);
  runCli(cwd, [
    "claim",
    "create",
    "--id",
    "clm_growth",
    "--thread",
    "thd_learning",
    "--text",
    "The launch should grow revenue.",
    "--evidence",
    "evd_capacity",
    "--assumptions",
    "asm_capacity"
  ]);
  runCli(cwd, [
    "decision",
    "open",
    "--id",
    "drq_launch",
    "--thread",
    "thd_learning",
    "--proposal",
    "Launch in Q4.",
    "--evidence",
    "evd_capacity",
    "--claims",
    "clm_growth",
    "--assumptions",
    "asm_capacity"
  ]);
  runCli(cwd, [
    "review",
    "submit",
    "--id",
    "rev_launch",
    "--thread",
    "thd_learning",
    "--request",
    "drq_launch",
    "--reviewer",
    "Troy",
    "--status",
    "approve",
    "--comment",
    "Proceed, but audit capacity after launch."
  ]);
  runCli(cwd, [
    "decision",
    "merge",
    "--id",
    "dcr_launch",
    "--thread",
    "thd_learning",
    "--request",
    "drq_launch",
    "--decider",
    "Troy"
  ]);
  runCli(cwd, [
    "outcome",
    "expect",
    "--id",
    "exo_growth",
    "--thread",
    "thd_learning",
    "--decision",
    "dcr_launch",
    "--metric",
    "growth",
    "--operator",
    ">",
    "--target",
    "0.15",
    "--review-date",
    "2027-03-01",
    "--assumptions",
    "asm_capacity",
    "--evidence",
    "evd_capacity",
    "--description",
    "Growth should exceed 15%."
  ]);
  runCli(cwd, [
    "outcome",
    "audit",
    "--id",
    "out_growth",
    "--thread",
    "thd_learning",
    "--expected",
    "exo_growth",
    "--actual",
    "0.08",
    "--result",
    "failed",
    "--summary",
    "Growth was 8%, below target.",
    "--failed-assumptions",
    "asm_capacity",
    "--failed-evidence",
    "evd_capacity",
    "--auditor",
    "Troy"
  ]);
  runCli(cwd, [
    "decision",
    "score",
    "--id",
    "dsc_launch",
    "--thread",
    "thd_learning",
    "--decision",
    "dcr_launch",
    "--score",
    "0.4",
    "--status",
    "failed",
    "--rationale",
    "Growth missed because capacity assumptions failed.",
    "--audits",
    "out_growth",
    "--scorer",
    "Troy"
  ]);
  return cwd;
}

function makeLearningSignalEvent(overrides = {}) {
  return {
    event_id: overrides.eventId || `evt_${overrides.id || "learning_signal"}`,
    event_type: "LearningSignalRecorded",
    thread_id: "thd_learning",
    actor_id: "par_troy",
    timestamp: "2027-03-02T00:00:00.000Z",
    payload: {
      learningSignal: {
        id: overrides.id || "lrn_manual_pattern",
        object: "learningSignal",
        signalType: "outcome_review",
        pattern: overrides.pattern || "manual_pattern_review",
        relatedContributions: overrides.relatedContributions || ["dcr_launch", "asm_capacity"],
        outcomeRefs: overrides.outcomeRefs || ["out_growth"],
        finding: overrides.finding || "Manual learning signal records a pattern without scoring actors.",
        confidence: overrides.confidence || "medium",
        actorScoring: false,
        sourceScoring: false,
        modelRanking: false,
        authorityMutation: false,
        ...overrides
      }
    }
  };
}

function runCli(cwd, args) {
  const result = spawnSync("node", [cliPath, ...args], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function readStoreEvents(cwd) {
  return readEventsAt(path.join(cwd, ".clista", "events.ndjson"));
}

function assertInvalid(events, pattern) {
  const result = validateEvents(events);
  assert.equal(result.valid, false, "expected validation to fail");
  assert.match(formatValidationErrors(result.errors), pattern);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

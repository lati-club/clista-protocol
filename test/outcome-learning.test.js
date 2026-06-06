const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const protocolSchema = require("../schemas/clista-protocol.schema.json");
const { buildDelegationGrant } = require("../src/delegation");
const {
  buildExecutionCompletion,
  buildExecutionStart
} = require("../src/execution");
const {
  buildOutcomeEvaluation,
  buildOutcomeExpectation,
  buildOutcomeObservation
} = require("../src/outcome");
const {
  buildOutcomeLearningDispute,
  buildOutcomeLearningSignal,
  buildOutcomeLearningViolation,
  buildOutcomeLesson
} = require("../src/outcome-learning");
const { readEvents } = require("../src/events");
const { exportProtocol, projectEvents } = require("../src/projector");
const { formatValidationErrors, validateEvents } = require("../src/validator");

const root = path.resolve(__dirname, "..");
const cliPath = path.join(root, "src", "cli.js");

test("outcome-learning derive, lesson, dispute, violation, list, show, verify, state, and export preserve evaluated-outcome learning", () => {
  const cwd = createOutcomeLearningStore();
  const granted = grantViaCli(cwd);
  const started = runCli(cwd, ["execution", "start", "--delegation", granted.delegationGrant.id]);
  const expected = runCli(cwd, [
    "outcome",
    "expect",
    "--execution",
    started.executionRecord.id,
    "--expected-effect",
    "Remote packet accepted under strict verification"
  ]);

  runCli(cwd, [
    "execution",
    "complete",
    "--execution",
    started.executionRecord.id,
    "--evidence",
    "strict execution evidence"
  ]);
  runCli(cwd, [
    "outcome",
    "observe",
    "--outcome",
    expected.outcomeRecord.id,
    "--observed-effect",
    "Remote packet accepted under strict verification",
    "--evidence",
    "observed acceptance evidence"
  ]);
  runCli(cwd, [
    "outcome",
    "evaluate",
    "--outcome",
    expected.outcomeRecord.id,
    "--result",
    "success",
    "--comparison",
    "Observed effect satisfied expected effect",
    "--evidence",
    "evaluation evidence",
    "--confidence",
    "0.9"
  ]);
  const derived = runCli(cwd, [
    "outcome-learning",
    "derive",
    "--outcome",
    expected.outcomeRecord.id,
    "--lesson",
    "Strict packet acceptance should require replay evidence",
    "--confidence",
    "high"
  ]);
  const lesson = runCli(cwd, [
    "outcome-learning",
    "lesson",
    "--signal",
    derived.outcomeLearningSignal.id,
    "--lesson",
    "Require strict replay evidence before accepting similar packets"
  ]);
  const dispute = runCli(cwd, [
    "outcome-learning",
    "dispute",
    "--learning",
    derived.outcomeLearningSignal.id,
    "--reason",
    "This lesson may overfit one successful exchange"
  ]);
  const violation = runCli(cwd, [
    "outcome-learning",
    "violation",
    "--learning",
    lesson.outcomeLesson.id,
    "--type",
    "universal_truth_claim",
    "--reason",
    "A lesson was treated as universal truth"
  ]);
  const listed = runCli(cwd, ["outcome-learning", "list", "--thread", "thd_outcome_learning"]);
  const shown = runCli(cwd, ["outcome-learning", "show", derived.outcomeLearningSignal.id]);
  const verified = runCli(cwd, ["outcome-learning", "verify"]);
  const state = runCli(cwd, ["state", "show", "--thread", "thd_outcome_learning"]);
  const exported = runCli(cwd, ["export"]);

  assert.equal(derived.derived, true);
  assert.equal(derived.outcomeLearningSignal.evaluationResult, "success");
  assert.equal(derived.outcomeLearningSignal.evidence[0].value, "evaluation evidence");
  assert.equal(derived.outcomeLearningSignal.retroactiveJustification, false);
  assert.equal(lesson.recorded, true);
  assert.equal(lesson.outcomeLesson.learningSignalId, derived.outcomeLearningSignal.id);
  assert.equal(dispute.disputed, true);
  assert.equal(violation.violated, true);
  assert.equal(listed.count, 1);
  assert.equal(shown.signal.id, derived.outcomeLearningSignal.id);
  assert.equal(shown.disputes[0].id, dispute.outcomeLearningDispute.id);
  assert.equal(verified.valid, true);
  assert.equal(verified.outcomeLearningValidationStatus.signalCount, 1);
  assert.equal(verified.outcomeLearningValidationStatus.lessonCount, 1);
  assert.equal(state.reasoningState.outcome_learning.signals[0].id, derived.outcomeLearningSignal.id);
  assert.equal(exported.outcomeLearning.lessons[0].id, lesson.outcomeLesson.id);
});

test("outcome learning validation rejects learning from unevaluated outcomes", () => {
  const { events, grantRecord, start, expected, observed } = activeOutcomeLearningFixture();
  const signal = outcomeLearningSignal({ expected });
  const validation = validateEvents([
    ...events,
    event("evt_ol_grant_unevaluated", "DelegationGranted", "par_troy", { delegationGrant: grantRecord }),
    event("evt_ol_start_unevaluated", "ExecutionStarted", "par_reviewer", { executionRecord: start }, "2026-06-06T00:01:00.000Z"),
    event("evt_ol_expect_unevaluated", "OutcomeExpected", "par_reviewer", { outcomeRecord: expected }, "2026-06-06T00:02:00.000Z"),
    event("evt_ol_observe_unevaluated", "OutcomeObserved", "par_reviewer", { outcomeRecord: observed }, "2026-06-06T00:04:00.000Z"),
    event("evt_ol_signal_unevaluated", "LearningSignalDerived", "par_reviewer", { outcomeLearningSignal: signal }, "2026-06-06T00:06:00.000Z")
  ]);
  const message = formatValidationErrors(validation.errors);

  assert.equal(validation.valid, false);
  assert.match(message, /outcome learning signal requires evaluated outcome oco_outcome_learning/);
});

test("outcome learning validation rejects evaluation result rewrites", () => {
  const { allEvents, expected } = validOutcomeLearningEvents({ evaluationResult: "failure" });
  const signal = outcomeLearningSignal({
    expected,
    evaluationResult: "success"
  });
  const validation = validateEvents([
    ...allEvents,
    event("evt_ol_signal_result_rewrite", "LearningSignalDerived", "par_reviewer", { outcomeLearningSignal: signal }, "2026-06-06T00:06:00.000Z")
  ]);
  const message = formatValidationErrors(validation.errors);

  assert.equal(validation.valid, false);
  assert.match(message, /outcome learning signal evaluationResult must match evaluated outcome/);
});

test("outcome learning validation rejects intended-effect rewrites and retroactive justification guard fields", () => {
  const { allEvents, expected } = validOutcomeLearningEvents();
  const guarded = {
    ...outcomeLearningSignal({ expected }),
    expectedEffect: "Different intended effect",
    retroactiveJustification: true,
    authorityMutation: true,
    universalTruthClaim: true,
    failureRecastAsSuccess: true
  };
  const validation = validateEvents([
    ...allEvents,
    event("evt_ol_signal_guarded", "LearningSignalDerived", "par_reviewer", { outcomeLearningSignal: guarded }, "2026-06-06T00:06:00.000Z")
  ]);
  const message = formatValidationErrors(validation.errors);

  assert.equal(validation.valid, false);
  assert.match(message, /outcome learning signal must not rewrite intended effect/);
  assert.match(message, /outcome learning field retroactiveJustification must be false/);
  assert.match(message, /outcome learning field authorityMutation must be false/);
  assert.match(message, /outcome learning field universalTruthClaim must be false/);
  assert.match(message, /outcome learning field failureRecastAsSuccess must be false/);
});

test("outcome learning lessons, disputes, and violations project without changing outcome success", () => {
  const { allEvents, expected } = validOutcomeLearningEvents();
  const signal = outcomeLearningSignal({ expected });
  const lesson = buildOutcomeLesson({
    id: "les_outcome_learning",
    learningSignalId: signal.id,
    outcomeId: signal.outcomeId,
    executionId: signal.executionId,
    threadId: signal.threadId,
    lesson: "Require replay evidence for similar acceptance claims",
    evidence: ["lesson evidence"],
    recordedByParticipantId: "par_reviewer",
    recordedAt: "2026-06-06T00:07:00.000Z"
  });
  const dispute = buildOutcomeLearningDispute({
    id: "old_outcome_learning",
    learningId: signal.id,
    outcomeId: signal.outcomeId,
    executionId: signal.executionId,
    threadId: signal.threadId,
    reason: "Lesson may be too broad",
    disputedByParticipantId: "par_troy",
    disputedAt: "2026-06-06T00:08:00.000Z"
  });
  const violation = buildOutcomeLearningViolation({
    id: "olv_outcome_learning",
    learningId: lesson.id,
    outcomeId: lesson.outcomeId,
    executionId: lesson.executionId,
    threadId: lesson.threadId,
    violationType: "retroactive_justification",
    reason: "Lesson was used to justify the original rationale after the fact",
    detectedByParticipantId: "par_troy",
    detectedAt: "2026-06-06T00:09:00.000Z"
  });
  const events = [
    ...allEvents,
    event("evt_ol_signal_valid", "LearningSignalDerived", "par_reviewer", { outcomeLearningSignal: signal }, "2026-06-06T00:06:00.000Z"),
    event("evt_ol_lesson_valid", "LessonRecorded", "par_reviewer", { outcomeLesson: lesson }, "2026-06-06T00:07:00.000Z"),
    event("evt_ol_dispute_valid", "LearningDisputed", "par_troy", { outcomeLearningDispute: dispute }, "2026-06-06T00:08:00.000Z"),
    event("evt_ol_violation_valid", "LearningViolationRecorded", "par_troy", { outcomeLearningViolation: violation }, "2026-06-06T00:09:00.000Z")
  ];
  const validation = validateEvents(events);
  const projected = projectEvents(events);

  assert.equal(validation.valid, true, formatValidationErrors(validation.errors));
  assert.equal(projected.outcome.evaluated[0].evaluationResult, "success");
  assert.equal(projected.outcomeLearning.signals[0].id, signal.id);
  assert.equal(projected.outcomeLearning.lessonsBySignal[signal.id][0].id, lesson.id);
  assert.equal(projected.outcomeLearning.disputesByLearning[signal.id][0].id, dispute.id);
  assert.equal(projected.outcomeLearning.violationsByLearning[lesson.id][0].id, violation.id);
});

test("export schema defines outcome learning records and exported records satisfy it", () => {
  const { allEvents, expected } = validOutcomeLearningEvents();
  const signal = outcomeLearningSignal({ expected });
  const events = [
    ...allEvents,
    event("evt_ol_signal_schema", "LearningSignalDerived", "par_reviewer", { outcomeLearningSignal: signal }, "2026-06-06T00:06:00.000Z")
  ];
  const exported = exportProtocol(projectEvents(events));
  const projectionSchema = protocolSchema.$defs.outcomeLearningProjection;

  assert.ok(protocolSchema.$defs.event.properties.event_type.enum.includes("LearningSignalDerived"));
  assert.equal(projectionSchema.properties.signals.items.$ref, "#/$defs/outcomeLearningSignal");
  assert.equal(projectionSchema.properties.lessons.items.$ref, "#/$defs/outcomeLesson");
  assertRecordMatchesDefinition(protocolSchema.$defs.outcomeLearningSignal, exported.outcomeLearning.signals[0]);
});

function createOutcomeLearningStore() {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "clista-outcome-learning-"));
  runCli(cwd, ["init"]);
  runCli(cwd, [
    "thread",
    "create",
    "--id",
    "thd_outcome_learning",
    "--title",
    "Outcome Learning Thread",
    "--question",
    "Can evaluated outcomes produce accountable lessons?",
    "--participant",
    "Troy:decision_owner",
    "--participant",
    "Reviewer:delegated_actor"
  ]);
  return cwd;
}

function grantViaCli(cwd) {
  return runCli(cwd, [
    "delegation",
    "grant",
    "--thread",
    "thd_outcome_learning",
    "--delegator",
    "Troy",
    "--delegate",
    "Reviewer",
    "--action",
    "verify",
    "--scope",
    "thread:thd_outcome_learning",
    "--limit",
    "Verify only the delegated execution scope"
  ]);
}

function baseEvents() {
  return readEvents(createOutcomeLearningStore());
}

function activeOutcomeLearningFixture() {
  const events = baseEvents();
  const grantRecord = grant();
  const start = executionStart();
  const expected = outcomeExpected();
  const observed = outcomeObserved({ expected });
  return { events, grantRecord, start, expected, observed };
}

function validOutcomeLearningEvents(options = {}) {
  const { events, grantRecord, start, expected, observed } = activeOutcomeLearningFixture();
  const completion = executionCompletion();
  const evaluated = outcomeEvaluated({ expected, evaluationResult: options.evaluationResult });
  const allEvents = [
    ...events,
    event("evt_ol_grant_valid", "DelegationGranted", "par_troy", { delegationGrant: grantRecord }),
    event("evt_ol_start_valid", "ExecutionStarted", "par_reviewer", { executionRecord: start }, "2026-06-06T00:01:00.000Z"),
    event("evt_ol_expect_valid", "OutcomeExpected", "par_reviewer", { outcomeRecord: expected }, "2026-06-06T00:02:00.000Z"),
    event("evt_ol_complete_valid", "ExecutionCompleted", "par_reviewer", { executionRecord: completion }, "2026-06-06T00:03:00.000Z"),
    event("evt_ol_observe_valid", "OutcomeObserved", "par_reviewer", { outcomeRecord: observed }, "2026-06-06T00:04:00.000Z"),
    event("evt_ol_evaluate_valid", "OutcomeEvaluated", "par_reviewer", { outcomeRecord: evaluated }, "2026-06-06T00:05:00.000Z")
  ];
  return { allEvents, expected, evaluated };
}

function grant() {
  return buildDelegationGrant({
    id: "dlg_outcome_learning",
    threadId: "thd_outcome_learning",
    delegatorParticipantId: "par_troy",
    delegateId: "par_reviewer",
    delegateType: "participant",
    action: "verify",
    scope: "thread:thd_outcome_learning",
    limits: ["Verify only the delegated execution scope"],
    grantedAt: "2026-06-06T00:00:00.000Z"
  });
}

function executionStart() {
  return buildExecutionStart({
    id: "exe_outcome_learning",
    threadId: "thd_outcome_learning",
    actorId: "par_reviewer",
    delegationId: "dlg_outcome_learning",
    actionType: "verify",
    scope: "thread:thd_outcome_learning",
    constraints: ["Verify only the delegated execution scope"],
    startedAt: "2026-06-06T00:01:00.000Z"
  });
}

function executionCompletion() {
  return buildExecutionCompletion({
    id: "exe_outcome_learning",
    threadId: "thd_outcome_learning",
    actorId: "par_reviewer",
    delegationId: "dlg_outcome_learning",
    actionType: "verify",
    scope: "thread:thd_outcome_learning",
    constraints: ["Verify only the delegated execution scope"],
    evidence: ["execution completed with evidence"],
    completedAt: "2026-06-06T00:03:00.000Z"
  });
}

function outcomeExpected() {
  return buildOutcomeExpectation({
    id: "oco_outcome_learning",
    executionId: "exe_outcome_learning",
    threadId: "thd_outcome_learning",
    actorId: "par_reviewer",
    expectedEffect: "Remote packet accepted under strict verification",
    createdAt: "2026-06-06T00:02:00.000Z"
  });
}

function outcomeObserved({ expected } = {}) {
  const record = expected || outcomeExpected();
  return buildOutcomeObservation({
    id: record.id,
    executionId: record.executionId,
    threadId: record.threadId,
    actorId: record.actorId,
    expectedEffect: record.expectedEffect,
    observedEffect: "Remote packet accepted under strict verification",
    evidence: ["observed effect evidence"],
    observedAt: "2026-06-06T00:04:00.000Z"
  });
}

function outcomeEvaluated({ expected, evaluationResult } = {}) {
  const record = expected || outcomeExpected();
  return buildOutcomeEvaluation({
    id: record.id,
    executionId: record.executionId,
    threadId: record.threadId,
    actorId: record.actorId,
    expectedEffect: record.expectedEffect,
    observedEffect: "Remote packet accepted under strict verification",
    evidence: ["evaluation evidence"],
    evaluationResult: evaluationResult || "success",
    comparison: "Observed effect compared against expected effect",
    confidence: 0.9,
    evaluatedByParticipantId: record.actorId,
    evaluatedAt: "2026-06-06T00:05:00.000Z"
  });
}

function outcomeLearningSignal({ expected, evaluationResult } = {}) {
  const record = expected || outcomeExpected();
  return buildOutcomeLearningSignal({
    id: "ols_outcome_learning",
    outcomeId: record.id,
    executionId: record.executionId,
    threadId: record.threadId,
    evaluationResult: evaluationResult || "success",
    lesson: "Strict verification evidence supports similar packet acceptance",
    evidence: ["evaluation evidence"],
    confidence: "medium",
    derivedByParticipantId: "par_reviewer",
    derivedAt: "2026-06-06T00:06:00.000Z"
  });
}

function event(eventId, eventType, actorId, payload, timestamp = "2026-06-06T00:00:00.000Z") {
  return {
    event_id: eventId,
    event_type: eventType,
    thread_id: "thd_outcome_learning",
    actor_id: actorId,
    timestamp,
    payload
  };
}

function runCli(cwd, args) {
  const result = spawnSync("node", [cliPath, ...args], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function assertRecordMatchesDefinition(definition, record) {
  assert.ok(record);
  for (const field of definition.required || []) {
    assert.ok(Object.hasOwn(record, field), `${record.object || "record"} missing ${field}`);
  }
  for (const [field, property] of Object.entries(definition.properties || {})) {
    if (!Object.hasOwn(record, field)) {
      continue;
    }
    if (Object.hasOwn(property, "const")) {
      assert.equal(record[field], property.const);
    }
    if (property.$ref === "#/$defs/outcomeLearningConfidence") {
      assert.ok(protocolSchema.$defs.outcomeLearningConfidence.enum.includes(record[field]));
    }
    if (property.$ref === "#/$defs/outcomeEvaluationResult") {
      assert.ok(protocolSchema.$defs.outcomeEvaluationResult.enum.includes(record[field]));
    }
    if (property.minLength) {
      assert.ok(String(record[field]).length >= property.minLength);
    }
  }
}

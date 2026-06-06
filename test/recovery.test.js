const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const protocolSchema = require("../schemas/clista-protocol.schema.json");
const {
  buildRecoveryPlan,
  buildRecoveryQuarantine,
  buildRecoveryRequest,
  buildRecoveryViolation
} = require("../src/recovery");
const { readEvents } = require("../src/events");
const { exportProtocol, projectEvents } = require("../src/projector");
const { formatValidationErrors, validateEvents } = require("../src/validator");

const root = path.resolve(__dirname, "..");
const cliPath = path.join(root, "src", "cli.js");
const hash = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

test("recovery request, plan, quarantine, apply, verify, list, show, state, and export restore trusted projection without rewriting history", () => {
  const cwd = createRecoveryStore();
  const requested = runCli(cwd, [
    "recovery",
    "request",
    "--thread",
    "thd_recovery",
    "--subject",
    "artifact_bad_packet",
    "--subject-type",
    "external_artifact",
    "--artifact-hash",
    hash,
    "--evidence",
    "Bad packet remains visible in recovery evidence",
    "--reason",
    "Continuity packet failed verification",
    "--actor",
    "Recovery Reviewer"
  ]);
  const planned = runCli(cwd, [
    "recovery",
    "plan",
    "--recovery",
    requested.recoveryRequest.id,
    "--plan",
    "Quarantine the bad packet from trusted projection and append repair evidence",
    "--actor",
    "Recovery Reviewer"
  ]);
  runCli(cwd, [
    "review",
    "complete",
    "--review",
    planned.protocolReview.id,
    "--summary",
    "Reviewed recovery plan without approving history rewrite",
    "--reviewer",
    "Recovery Reviewer"
  ]);
  const quarantined = runCli(cwd, [
    "recovery",
    "quarantine",
    "--recovery",
    requested.recoveryRequest.id,
    "--reason",
    "Bad packet is visible but not trusted",
    "--actor",
    "Recovery Reviewer"
  ]);
  const applied = runCli(cwd, [
    "recovery",
    "apply",
    "--recovery",
    requested.recoveryRequest.id,
    "--summary",
    "Applied reviewed repair marker without event deletion",
    "--evidence",
    "repair evidence",
    "--actor",
    "Recovery Reviewer"
  ]);
  const recordedVerification = runCli(cwd, [
    "recovery",
    "verify",
    "--recovery",
    requested.recoveryRequest.id,
    "--actor",
    "Recovery Reviewer"
  ]);
  const listed = runCli(cwd, ["recovery", "list", "--thread", "thd_recovery"]);
  const shown = runCli(cwd, ["recovery", "show", requested.recoveryRequest.id]);
  const verified = runCli(cwd, ["recovery", "verify"]);
  const state = runCli(cwd, ["state", "show", "--thread", "thd_recovery"]);
  const exported = runCli(cwd, ["export"]);

  assert.equal(requested.requested, true);
  assert.equal(planned.planned, true);
  assert.equal(planned.protocolReview.subjectType, "recovery_request");
  assert.equal(quarantined.quarantined, true);
  assert.equal(quarantined.recoveryQuarantine.visible, true);
  assert.equal(quarantined.recoveryQuarantine.trusted, false);
  assert.equal(applied.applied, true);
  assert.equal(recordedVerification.recorded, true);
  assert.equal(listed.count, 1);
  assert.equal(shown.recovery.status, "verified");
  assert.equal(verified.valid, true);
  assert.equal(verified.recoveryValidationStatus.verifiedCount, 1);
  assert.equal(verified.quarantined_subjects[0].trusted, false);
  assert.equal(state.reasoningState.recovery.verified[0].id, requested.recoveryRequest.id);
  assert.equal(exported.recovery.records[0].id, requested.recoveryRequest.id);
  assert.equal(exported.recovery.hardLaw, "recovery != history rewrite");
  assert.equal(readEvents(cwd).some((event) => event.event_type === "RecoveryRequested"), true);
});

test("RecoveryRequested does not require completed review", () => {
  const request = recoveryRequest();
  const validation = validateEvents([
    ...baseRecoveryEvents(),
    event("evt_recovery_request_only", "RecoveryRequested", "par_troy", { recoveryRequest: request }, "2026-06-06T00:03:00.000Z")
  ]);

  assert.equal(validation.valid, true, formatValidationErrors(validation.errors));
});

test("RecoveryPlanCreated requires a request and review basis", () => {
  const plan = buildRecoveryPlan({
    id: "rcp_missing_request",
    recoveryId: "rcv_missing",
    threadId: "thd_recovery",
    plan: "Plan without request is invalid",
    reviewId: "prv_missing",
    plannedByParticipantId: "par_troy",
    plannedAt: "2026-06-06T00:04:00.000Z"
  });
  const validation = validateEvents([
    ...baseRecoveryEvents(),
    event("evt_recovery_plan_missing_request", "RecoveryPlanCreated", "par_troy", { recoveryPlan: plan }, "2026-06-06T00:04:00.000Z")
  ]);
  const message = formatValidationErrors(validation.errors);

  assert.equal(validation.valid, false);
  assert.match(message, /recovery plan references unknown recovery request/);
  assert.match(message, /recovery plan references unknown review/);
});

test("RecoveryQuarantined requires completed review unless emergency references pending review", () => {
  const { request, review, plan } = recoveryPlanFixture();
  const quarantine = buildRecoveryQuarantine({
    id: "rcq_needs_completed_review",
    recoveryId: request.id,
    planId: plan.id,
    threadId: "thd_recovery",
    subjectType: request.subjectType,
    subjectId: request.subjectId,
    reason: "Non-emergency quarantine needs completed review",
    reviewId: review.id,
    quarantinedByParticipantId: "par_troy",
    quarantinedAt: "2026-06-06T00:06:00.000Z"
  });
  const nonEmergency = validateEvents([
    ...baseRecoveryEvents(),
    event("evt_recovery_request", "RecoveryRequested", "par_troy", { recoveryRequest: request }, "2026-06-06T00:03:00.000Z"),
    event("evt_recovery_review_required", "ReviewRequired", "par_troy", { protocolReview: review }, "2026-06-06T00:04:00.000Z"),
    event("evt_recovery_plan", "RecoveryPlanCreated", "par_troy", { recoveryPlan: plan }, "2026-06-06T00:05:00.000Z"),
    event("evt_recovery_quarantine_no_review", "RecoveryQuarantined", "par_troy", { recoveryQuarantine: quarantine }, "2026-06-06T00:06:00.000Z")
  ]);
  const emergency = validateEvents([
    ...baseRecoveryEvents(),
    event("evt_recovery_request_e", "RecoveryRequested", "par_troy", { recoveryRequest: request }, "2026-06-06T00:03:00.000Z"),
    event("evt_recovery_review_required_e", "ReviewRequired", "par_troy", { protocolReview: review }, "2026-06-06T00:04:00.000Z"),
    event("evt_recovery_plan_e", "RecoveryPlanCreated", "par_troy", { recoveryPlan: plan }, "2026-06-06T00:05:00.000Z"),
    event("evt_recovery_quarantine_emergency", "RecoveryQuarantined", "par_troy", {
      recoveryQuarantine: { ...quarantine, id: "rcq_emergency", emergency: true, status: "emergency_quarantined" }
    }, "2026-06-06T00:06:00.000Z")
  ]);

  assert.equal(nonEmergency.valid, false);
  assert.match(formatValidationErrors(nonEmergency.errors), /recovery quarantine requires completed M23 review/);
  assert.equal(emergency.valid, true, formatValidationErrors(emergency.errors));
});

test("RecoveryApplied and RecoveryVerified require completed review and valid restored hashes", () => {
  const cwd = createVerifiedRecoveryStore();
  const events = readEvents(cwd);
  const tampered = clone(events);
  tampered.at(-1).payload.recoveryVerification.restoredStateHash = "sha256:0000000000000000000000000000000000000000000000000000000000000000";
  const validation = validateEvents(tampered);

  assert.equal(validation.valid, false);
  assert.match(formatValidationErrors(validation.errors), /restoredStateHash does not match recomputed restored state/);
});

test("recovery rejects unverified checkpoints, release-only checkpoints, missing external evidence, and guard-field rewrites", () => {
  const releaseOnly = recoveryRequest({
    id: "rcv_release_only",
    checkpointRef: {
      checkpointId: "v0.24.0",
      checkpointType: "release_tag_snapshot",
      sourceThreadId: "thd_recovery",
      protocolVersion: "clista.protocol.v0",
      projectionHash: hash,
      stateHash: hash,
      verificationLayerResults: { validity: { valid: true }, integrity: { valid: true } },
      verified: true
    }
  });
  const noArtifact = recoveryRequest({
    id: "rcv_no_artifact",
    subjectId: "external_missing",
    evidence: [],
    artifactRef: null
  });
  const guarded = {
    ...recoveryRequest({ id: "rcv_guarded" }),
    eventDeleted: true,
    eventReplaced: true,
    historyRewrite: true,
    silentRepair: true,
    recoveryAsApproval: true,
    recoveryAsAmendment: true,
    recoveryAsConsensus: true,
    authorityCreated: true,
    governanceMutation: true
  };
  const validation = validateEvents([
    ...baseRecoveryEvents(),
    event("evt_release_only", "RecoveryRequested", "par_troy", { recoveryRequest: releaseOnly }, "2026-06-06T00:03:00.000Z"),
    event("evt_no_artifact", "RecoveryRequested", "par_troy", { recoveryRequest: noArtifact }, "2026-06-06T00:04:00.000Z"),
    event("evt_guarded", "RecoveryRequested", "par_troy", { recoveryRequest: guarded }, "2026-06-06T00:05:00.000Z")
  ]);
  const message = formatValidationErrors(validation.errors);

  assert.equal(validation.valid, false);
  assert.match(message, /unsupported recovery checkpointType release_tag_snapshot/);
  assert.match(message, /external subject requires artifact hash/);
  assert.match(message, /external subject requires evidence/);
  assert.match(message, /recovery field eventDeleted must be false or absent/);
  assert.match(message, /recovery field historyRewrite must be false or absent/);
  assert.match(message, /recovery field recoveryAsApproval must be false or absent/);
  assert.match(message, /recovery field authorityCreated must be false or absent/);
});

test("recovery violation projects and export schema declares recovery records", () => {
  const request = recoveryRequest();
  const violation = buildRecoveryViolation({
    id: "rcv_recovery_violation",
    recoveryId: request.id,
    threadId: "thd_recovery",
    violationType: "history_rewrite_attempt",
    reason: "A repair tried to hide invalid history",
    detectedByParticipantId: "par_troy",
    detectedAt: "2026-06-06T00:04:00.000Z"
  });
  const events = [
    ...baseRecoveryEvents(),
    event("evt_recovery_request_project", "RecoveryRequested", "par_troy", { recoveryRequest: request }, "2026-06-06T00:03:00.000Z"),
    event("evt_recovery_violation_project", "RecoveryViolationRecorded", "par_troy", { recoveryViolation: violation }, "2026-06-06T00:04:00.000Z")
  ];
  const validation = validateEvents(events);
  const projected = projectEvents(events).recovery;
  const exported = exportProtocol(projectEvents(events));

  assert.equal(validation.valid, true, formatValidationErrors(validation.errors));
  assert.equal(projected.violated[0].id, request.id);
  assert.equal(projected.violationsByRecovery[request.id][0].id, violation.id);
  assert.ok(protocolSchema.required.includes("recovery"));
  assert.equal(protocolSchema.properties.recovery.$ref, "#/$defs/recoveryProjection");
  assert.equal(protocolSchema.$defs.recoveryProjection.properties.records.items.$ref, "#/$defs/recoveryRequest");
  assert.equal(protocolSchema.$defs.recoveryProjection.properties.verifications.items.$ref, "#/$defs/recoveryVerification");
  assert.ok(protocolSchema.$defs.event.properties.event_type.enum.includes("RecoveryRequested"));
  assert.ok(protocolSchema.$defs.event.properties.event_type.enum.includes("RecoveryVerified"));
  assert.equal(exported.recovery.violated[0].status, "violated");
});

test("read-only recovery commands support --events", () => {
  const cwd = createVerifiedRecoveryStore();
  const eventsPath = path.join(cwd, "recovery-events.ndjson");
  writeFileSync(eventsPath, readEvents(cwd).map((event) => JSON.stringify(event)).join("\n") + "\n", "utf8");

  const listed = runCli(cwd, ["recovery", "list", "--events", eventsPath]);
  const verified = runCli(cwd, ["recovery", "verify", "--events", eventsPath]);

  assert.equal(listed.count, 1);
  assert.equal(verified.valid, true);
});

function createRecoveryStore() {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "clista-recovery-"));
  runCli(cwd, [
    "thread",
    "create",
    "--id",
    "thd_recovery",
    "--title",
    "Protocol Recovery",
    "--question",
    "Can recovery restore trusted projection without rewriting history?",
    "--actor",
    "Troy"
  ]);
  return cwd;
}

function createVerifiedRecoveryStore() {
  const cwd = createRecoveryStore();
  const requested = runCli(cwd, [
    "recovery", "request",
    "--thread", "thd_recovery",
    "--subject", "artifact_bad_packet",
    "--subject-type", "external_artifact",
    "--artifact-hash", hash,
    "--evidence", "Bad packet remains visible",
    "--reason", "Continuity packet failed verification",
    "--actor", "Recovery Reviewer"
  ]);
  const planned = runCli(cwd, [
    "recovery", "plan",
    "--recovery", requested.recoveryRequest.id,
    "--plan", "Quarantine and repair",
    "--actor", "Recovery Reviewer"
  ]);
  runCli(cwd, [
    "review", "complete",
    "--review", planned.protocolReview.id,
    "--summary", "Reviewed recovery plan",
    "--reviewer", "Recovery Reviewer"
  ]);
  runCli(cwd, [
    "recovery", "quarantine",
    "--recovery", requested.recoveryRequest.id,
    "--reason", "Visible but untrusted",
    "--actor", "Recovery Reviewer"
  ]);
  runCli(cwd, [
    "recovery", "apply",
    "--recovery", requested.recoveryRequest.id,
    "--summary", "Applied repair marker",
    "--actor", "Recovery Reviewer"
  ]);
  runCli(cwd, [
    "recovery", "verify",
    "--recovery", requested.recoveryRequest.id,
    "--actor", "Recovery Reviewer"
  ]);
  return cwd;
}

function recoveryPlanFixture() {
  const request = recoveryRequest();
  const review = {
    id: "prv_recovery_required",
    object: "protocolReview",
    threadId: "thd_recovery",
    subjectType: "recovery_request",
    subjectId: request.id,
    subjectRef: {
      type: "recovery_request",
      id: request.id
    },
    subjectKey: `recovery_request:${request.id}`,
    triggerType: "recovery_plan",
    reason: "Recovery requires review",
    required: true,
    status: "required",
    requiredReviewerRole: "reviewer",
    requiredByParticipantId: "par_troy",
    requiredAt: "2026-06-06T00:04:00.000Z",
    reviewAsApproval: false,
    governanceMutation: false,
    authorityCreated: false,
    authorityMutation: false,
    consensusCreated: false,
    amendmentApproval: false,
    recoveryPerformed: false,
    rollbackPerformed: false,
    accountabilityScoreAssigned: false,
    blameAssigned: false,
    violationResolved: false,
    outcomeMutation: false,
    executionMutation: false,
    delegationMutation: false,
    learningMutation: false,
    stateMutation: false
  };
  const plan = buildRecoveryPlan({
    id: "rcp_recovery",
    recoveryId: request.id,
    threadId: "thd_recovery",
    plan: "Quarantine unsafe subject",
    reviewId: review.id,
    plannedByParticipantId: "par_troy",
    plannedAt: "2026-06-06T00:05:00.000Z"
  });
  return { request, review, plan };
}

function recoveryRequest(overrides = {}) {
  return buildRecoveryRequest({
    id: overrides.id || "rcv_recovery",
    threadId: "thd_recovery",
    subjectType: overrides.subjectType || "external_artifact",
    subjectId: overrides.subjectId || "artifact_bad_packet",
    reason: overrides.reason || "Bad packet needs recovery",
    checkpointRef: overrides.checkpointRef || checkpoint(),
    evidence: overrides.evidence === undefined ? ["artifact evidence"] : overrides.evidence,
    artifactRef: overrides.artifactRef === undefined ? { uri: "bad-packet.json", hash } : overrides.artifactRef,
    requestedByParticipantId: "par_troy",
    requestedAt: "2026-06-06T00:03:00.000Z"
  });
}

function checkpoint() {
  return {
    checkpointId: "chk_recovery",
    checkpointType: "projection_boundary",
    sourceThreadId: "thd_recovery",
    protocolVersion: "clista.protocol.v0",
    boundaryEventId: "evt_recovery_thread",
    eventLogHash: hash,
    projectionHash: hash,
    stateHash: hash,
    verificationLayerResults: {
      validity: { valid: true },
      integrity: { valid: true }
    },
    evidence: ["checkpoint evidence"],
    verified: true
  };
}

function baseRecoveryEvents() {
  return [
    event("evt_recovery_participant_troy", "ParticipantAdded", "par_troy", {
      participant: {
        id: "par_troy",
        object: "participant",
        kind: "human",
        name: "Troy"
      }
    }, "2026-06-06T00:00:00.000Z"),
    event("evt_recovery_thread", "ThreadCreated", "par_troy", {
      thread: {
        id: "thd_recovery",
        object: "thread",
        title: "Protocol Recovery",
        question: "Can recovery restore trusted projection without rewriting history?",
        status: "active",
        participantIds: ["par_troy"],
        createdAt: "2026-06-06T00:01:00.000Z",
        updatedAt: "2026-06-06T00:01:00.000Z"
      }
    }, "2026-06-06T00:01:00.000Z")
  ];
}

function event(id, type, actorId, payload, timestamp = "2026-06-06T00:00:00.000Z") {
  return {
    event_id: id,
    event_type: type,
    thread_id: "thd_recovery",
    actor_id: actorId,
    timestamp,
    payload
  };
}

function runCli(cwd, args) {
  const result = spawnSync("node", [cliPath, ...args], {
    cwd,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

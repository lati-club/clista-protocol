const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { readEventsAt } = require("../src/events");
const { exportProtocol, projectEvents, selectThreadState } = require("../src/projector");
const { formatValidationErrors, validateEvents } = require("../src/validator");

const root = path.resolve(__dirname, "..");
const cliPath = path.join(root, "src", "cli.js");
const canonicalLog = path.join(root, ".clista", "events.ndjson");

test("amendment CLI proposes, lists, shows, verifies, exports, and projects into thread state", () => {
  const cwd = createAmendmentStore();

  const proposed = runCli(cwd, [
    "amendment",
    "propose",
    "--id",
    "amd_evidence_threshold",
    "--thread",
    "thd_amend",
    "--title",
    "Require stronger evidence for capacity claims",
    "--type",
    "evidence_threshold",
    "--target",
    "docs/protocol/v0/governance.md#evidence",
    "--rationale",
    "Adaptation recommended reviewing evidence requirements after failed outcomes.",
    "--change",
    "Future capacity decisions require two independent evidence references.",
    "--actor",
    "par_troy"
  ]);
  assert.equal(proposed.protocolAmendment.id, "amd_evidence_threshold");
  assert.equal(proposed.event.event_type, "ProtocolAmendmentProposed");

  const list = runCli(cwd, ["amendment", "list", "--thread", "thd_amend"]);
  assert.equal(list.schema, "clista.amendment.list.v0");
  assert.equal(list.hardLaw, "recommendation != amendment");
  assert.equal(list.count, 1);
  assert.equal(list.amendments[0].status, "pending");
  assert.equal(list.amendments[0].active, false);

  const shown = runCli(cwd, ["amendment", "show", "amd_evidence_threshold"]);
  assert.equal(shown.schema, "clista.amendment.item.v0");
  assert.equal(shown.amendment.id, "amd_evidence_threshold");

  const verify = runCli(cwd, ["amendment", "verify"]);
  assert.equal(verify.valid, true);
  assert.equal(verify.amendmentValidationStatus.automaticAmendment, false);
  assert.equal(verify.amendmentValidationStatus.implicitMutation, false);
  assert.equal(verify.amendmentValidationStatus.retroactiveMutation, false);
  assert.equal(verify.amendmentValidationStatus.recommendationBecomesAmendment, false);

  const projection = projectEvents(readStoreEvents(cwd));
  const exported = exportProtocol(projection);
  assert.equal(exported.amendments.hardLaw, "recommendation != amendment");
  assert.equal(exported.activeAmendments.length, 0);
  assert.deepEqual(exported.amendmentHistory.amd_evidence_threshold.map((entry) => entry.kind), ["proposal"]);

  const state = runCli(cwd, ["state", "show", "--thread", "thd_amend"]);
  assert.equal(state.reasoningState.amendments.hardLaw, "recommendation != amendment");
  assert.equal(state.reasoningState.amendments.pendingAmendments.length, 1);

  const threadState = selectThreadState(projection, "thd_amend");
  assert.equal(threadState.reasoningState.amendments.amendments.length, 1);
});

test("approved amendments become active only with governance authority", () => {
  const cwd = createAmendmentStore();
  const events = [
    ...readStoreEvents(cwd),
    makeAmendmentProposed({ id: "amd_active_threshold" }),
    makeAmendmentReviewed({ amendmentId: "amd_active_threshold" }),
    makeAmendmentApproved({ amendmentId: "amd_active_threshold" })
  ];

  const validation = validateEvents(events);
  assert.equal(validation.valid, true, formatValidationErrors(validation.errors));

  const projection = projectEvents(events).amendments;
  assert.equal(projection.activeAmendments.length, 1);
  assert.equal(projection.byAmendment.amd_active_threshold.status, "approved");
  assert.equal(projection.byAmendment.amd_active_threshold.active, true);
  assert.deepEqual(projection.historyByAmendment.amd_active_threshold.map((entry) => entry.kind), [
    "proposal",
    "review",
    "approval"
  ]);
});

test("rejected amendments preserve history without active effect", () => {
  const cwd = createAmendmentStore();
  const events = [
    ...readStoreEvents(cwd),
    makeAmendmentProposed({ id: "amd_rejected_gate" }),
    makeAmendmentRejected({ amendmentId: "amd_rejected_gate" })
  ];

  const validation = validateEvents(events);
  assert.equal(validation.valid, true, formatValidationErrors(validation.errors));

  const projection = projectEvents(events).amendments;
  assert.equal(projection.activeAmendments.length, 0);
  assert.equal(projection.rejectedAmendments.length, 1);
  assert.equal(projection.byAmendment.amd_rejected_gate.status, "rejected");
  assert.equal(projection.byAmendment.amd_rejected_gate.active, false);
});

test("superseded amendments deactivate prior active amendments while preserving history", () => {
  const cwd = createAmendmentStore();
  const events = [
    ...readStoreEvents(cwd),
    makeAmendmentProposed({ id: "amd_original_gate", title: "Original gate amendment" }),
    makeAmendmentApproved({ id: "ama_original_gate", amendmentId: "amd_original_gate" }),
    makeAmendmentProposed({ id: "amd_replacement_gate", title: "Replacement gate amendment" }),
    makeAmendmentApproved({ id: "ama_replacement_gate", amendmentId: "amd_replacement_gate" }),
    makeAmendmentSuperseded({
      amendmentId: "amd_original_gate",
      supersededByAmendmentId: "amd_replacement_gate"
    })
  ];

  const validation = validateEvents(events);
  assert.equal(validation.valid, true, formatValidationErrors(validation.errors));

  const projection = projectEvents(events).amendments;
  assert.equal(projection.byAmendment.amd_original_gate.status, "superseded");
  assert.equal(projection.byAmendment.amd_original_gate.active, false);
  assert.equal(projection.byAmendment.amd_replacement_gate.status, "approved");
  assert.equal(projection.byAmendment.amd_replacement_gate.active, true);
  assert.equal(projection.activeAmendments.length, 1);
  assert.deepEqual(projection.historyByAmendment.amd_original_gate.map((entry) => entry.kind), [
    "proposal",
    "approval",
    "supersession"
  ]);
});

test("adaptation recommendations do not become amendments without proposal and approval", () => {
  const cwd = createAmendmentStore();
  const events = [
    ...readStoreEvents(cwd),
    makeLearningSignalEvent(),
    makeAdaptationRecommendationEvent()
  ];

  const validation = validateEvents(events);
  assert.equal(validation.valid, true, formatValidationErrors(validation.errors));

  const projection = projectEvents(events);
  assert.equal(projection.adaptation.recommendations.some((item) => item.id === "adp_review_threshold"), true);
  assert.equal(projection.amendments.amendments.length, 0);
  assert.equal(projection.amendments.activeAmendments.length, 0);
});

test("amendment validation rejects unauthorized approval and invalid lifecycle transitions", () => {
  const cwd = createAmendmentStore();
  runCli(cwd, ["participant", "declare", "--id", "par_reviewer", "--name", "Reviewer", "--thread", "thd_amend"]);
  const events = readStoreEvents(cwd);

  assertInvalid([
    ...events,
    makeAmendmentProposed({ id: "amd_unauthorized" }),
    makeAmendmentApproved({
      amendmentId: "amd_unauthorized",
      approvedBy: "par_reviewer",
      actorId: "par_reviewer"
    })
  ], /protocol amendment approval requires decision_owner authority par_reviewer/);

  assertInvalid([
    ...events,
    makeAmendmentProposed({ id: "amd_reject_then_approve" }),
    makeAmendmentRejected({ amendmentId: "amd_reject_then_approve" }),
    makeAmendmentApproved({ amendmentId: "amd_reject_then_approve" })
  ], /protocol amendment approval references rejected amendment amd_reject_then_approve/);

  assertInvalid([
    ...events,
    makeAmendmentProposed({ id: "amd_not_approved" }),
    makeAmendmentProposed({ id: "amd_replacement" }),
    makeAmendmentSuperseded({
      amendmentId: "amd_not_approved",
      supersededByAmendmentId: "amd_replacement"
    })
  ], /protocol amendment supersession requires approved amendment amd_not_approved/);
});

test("amendment validation rejects future references and implicit or retroactive mutation", () => {
  const cwd = createAmendmentStore();
  const events = readStoreEvents(cwd);

  assertInvalid([
    ...events,
    makeAmendmentProposed({
      id: "amd_future_adaptation",
      adaptationRecommendationIds: ["adp_review_threshold"]
    }),
    makeLearningSignalEvent(),
    makeAdaptationRecommendationEvent()
  ], /protocol amendment references unknown or future adaptation recommendation adp_review_threshold/);

  assertInvalid([
    ...events,
    makeAmendmentProposed({
      id: "amd_automatic",
      automaticAmendment: true
    })
  ], /amendment field automaticAmendment must be false/);

  assertInvalid([
    ...events,
    makeAmendmentProposed({
      id: "amd_retroactive",
      retroactiveMutation: true
    })
  ], /protocol amendment cannot rewrite past event validity/);

  assertInvalid([
    ...events,
    makeAmendmentProposed({
      id: "amd_duplicate"
    }),
    makeAmendmentProposed({
      id: "amd_duplicate"
    })
  ], /duplicate protocol amendment amd_duplicate/);
});

test("legacy event logs remain amendment-compatible without amendment events", () => {
  const events = readEventsAt(canonicalLog);
  const validation = validateEvents(events);
  assert.equal(validation.valid, true, formatValidationErrors(validation.errors));

  const projection = projectEvents(events);
  assert.equal(projection.amendments.amendmentValidationStatus.valid, true);
  assert.equal(projection.amendments.amendments.length, 0);
});

function createAmendmentStore() {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "clista-amendment-"));
  runCli(cwd, ["init"]);
  runCli(cwd, [
    "thread",
    "create",
    "--id",
    "thd_amend",
    "--title",
    "Amendment Thread",
    "--question",
    "Can ClisTa amend protocol rules only through authority?",
    "--participant",
    "Troy:decision owner"
  ]);
  return cwd;
}

function makeLearningSignalEvent(overrides = {}) {
  return {
    event_id: overrides.eventId || `evt_${overrides.id || "learning_signal"}`,
    event_type: "LearningSignalRecorded",
    thread_id: "thd_amend",
    actor_id: "par_troy",
    timestamp: "2027-04-01T00:00:00.000Z",
    payload: {
      learningSignal: {
        id: overrides.id || "lrn_review_threshold",
        object: "learningSignal",
        signalType: "outcome_review",
        pattern: overrides.pattern || "manual_threshold_review",
        finding: overrides.finding || "Learning signal says evidence thresholds should be reviewed.",
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

function makeAdaptationRecommendationEvent(overrides = {}) {
  return {
    event_id: overrides.eventId || `evt_${overrides.id || "adaptation_recommendation"}`,
    event_type: "GovernanceReviewRecommended",
    thread_id: "thd_amend",
    actor_id: "par_troy",
    timestamp: "2027-04-02T00:00:00.000Z",
    payload: {
      governanceReviewRecommendation: {
        id: overrides.id || "adp_review_threshold",
        object: "adaptationRecommendation",
        recommendationType: "governance_review",
        pattern: "manual_threshold_review",
        learningSignalIds: ["lrn_review_threshold"],
        finding: "Adaptation recommends governance review of evidence thresholds.",
        recommendation: "Review evidence threshold requirements through explicit amendment.",
        confidence: "medium",
        authorityMutation: false,
        governanceMutation: false,
        ruleMutation: false,
        thresholdMutation: false,
        participantScoring: false,
        sourceScoring: false,
        modelRanking: false,
        ...overrides
      }
    }
  };
}

function makeAmendmentProposed(overrides = {}) {
  const id = overrides.id || "amd_manual_threshold";
  return {
    event_id: overrides.eventId || `evt_${id}`,
    event_type: "ProtocolAmendmentProposed",
    thread_id: "thd_amend",
    actor_id: overrides.actorId || "par_troy",
    timestamp: overrides.timestamp || "2027-04-03T00:00:00.000Z",
    payload: {
      protocolAmendment: {
        id,
        object: "protocolAmendment",
        title: overrides.title || "Require stronger evidence thresholds",
        amendmentType: overrides.amendmentType || "evidence_threshold",
        target: overrides.target || "docs/protocol/v0/governance.md#evidence",
        rationale: overrides.rationale || "Adaptation recommended reviewing evidence requirements.",
        proposedChange: overrides.proposedChange || "Future capacity decisions require two independent evidence references.",
        effectScope: overrides.effectScope || "future_only",
        threadId: "thd_amend",
        adaptationRecommendationIds: overrides.adaptationRecommendationIds || [],
        learningSignalIds: overrides.learningSignalIds || [],
        sourceEventIds: overrides.sourceEventIds || [],
        proposedBy: overrides.proposedBy || overrides.actorId || "par_troy",
        automaticAmendment: false,
        implicitMutation: false,
        hiddenPolicyMutation: false,
        retroactiveMutation: false,
        rewritesPastEvents: false,
        recommendationBecomesAmendment: false,
        ...overrides
      }
    }
  };
}

function makeAmendmentReviewed(overrides = {}) {
  return {
    event_id: overrides.eventId || `evt_${overrides.id || "amendment_review"}`,
    event_type: "ProtocolAmendmentReviewed",
    thread_id: "thd_amend",
    actor_id: overrides.actorId || "par_troy",
    timestamp: "2027-04-04T00:00:00.000Z",
    payload: {
      protocolAmendmentReview: {
        id: overrides.id || "amr_threshold",
        object: "protocolAmendmentReview",
        amendmentId: overrides.amendmentId || "amd_manual_threshold",
        status: overrides.status || "approve",
        reviewerParticipantId: overrides.reviewerParticipantId || overrides.actorId || "par_troy",
        rationale: overrides.rationale || "The amendment has explicit scope and does not rewrite past events.",
        automaticAmendment: false,
        implicitMutation: false,
        hiddenPolicyMutation: false,
        retroactiveMutation: false,
        rewritesPastEvents: false,
        recommendationBecomesAmendment: false,
        ...overrides
      }
    }
  };
}

function makeAmendmentApproved(overrides = {}) {
  return {
    event_id: overrides.eventId || `evt_${overrides.id || "amendment_approval"}_${overrides.amendmentId || "amd_manual_threshold"}`,
    event_type: "ProtocolAmendmentApproved",
    thread_id: "thd_amend",
    actor_id: overrides.actorId || overrides.approvedBy || "par_troy",
    timestamp: "2027-04-05T00:00:00.000Z",
    payload: {
      protocolAmendmentApproval: {
        id: overrides.id || `ama_${overrides.amendmentId || "amd_manual_threshold"}`,
        object: "protocolAmendmentApproval",
        amendmentId: overrides.amendmentId || "amd_manual_threshold",
        approvedBy: overrides.approvedBy || overrides.actorId || "par_troy",
        authority: "decision_owner",
        rationale: overrides.rationale || "Authorized decision owner approves this future-only amendment.",
        effectScope: overrides.effectScope || "future_only",
        automaticAmendment: false,
        implicitMutation: false,
        hiddenPolicyMutation: false,
        retroactiveMutation: false,
        rewritesPastEvents: false,
        recommendationBecomesAmendment: false,
        ...overrides
      }
    }
  };
}

function makeAmendmentRejected(overrides = {}) {
  return {
    event_id: overrides.eventId || `evt_${overrides.id || "amendment_rejection"}_${overrides.amendmentId || "amd_manual_threshold"}`,
    event_type: "ProtocolAmendmentRejected",
    thread_id: "thd_amend",
    actor_id: overrides.actorId || overrides.rejectedBy || "par_troy",
    timestamp: "2027-04-05T00:00:00.000Z",
    payload: {
      protocolAmendmentRejection: {
        id: overrides.id || `amj_${overrides.amendmentId || "amd_manual_threshold"}`,
        object: "protocolAmendmentRejection",
        amendmentId: overrides.amendmentId || "amd_manual_threshold",
        rejectedBy: overrides.rejectedBy || overrides.actorId || "par_troy",
        authority: "decision_owner",
        rationale: overrides.rationale || "Authorized decision owner rejects this amendment.",
        automaticAmendment: false,
        implicitMutation: false,
        hiddenPolicyMutation: false,
        retroactiveMutation: false,
        rewritesPastEvents: false,
        recommendationBecomesAmendment: false,
        ...overrides
      }
    }
  };
}

function makeAmendmentSuperseded(overrides = {}) {
  return {
    event_id: overrides.eventId || `evt_${overrides.id || "amendment_supersession"}_${overrides.amendmentId || "amd_manual_threshold"}`,
    event_type: "ProtocolAmendmentSuperseded",
    thread_id: "thd_amend",
    actor_id: overrides.actorId || overrides.supersededBy || "par_troy",
    timestamp: "2027-04-06T00:00:00.000Z",
    payload: {
      protocolAmendmentSupersession: {
        id: overrides.id || `ams_${overrides.amendmentId || "amd_manual_threshold"}`,
        object: "protocolAmendmentSupersession",
        amendmentId: overrides.amendmentId || "amd_manual_threshold",
        supersededByAmendmentId: overrides.supersededByAmendmentId || "amd_replacement_threshold",
        supersededBy: overrides.supersededBy || overrides.actorId || "par_troy",
        authority: "decision_owner",
        rationale: overrides.rationale || "Replacement amendment supersedes the prior approved rule.",
        automaticAmendment: false,
        implicitMutation: false,
        hiddenPolicyMutation: false,
        retroactiveMutation: false,
        rewritesPastEvents: false,
        recommendationBecomesAmendment: false,
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

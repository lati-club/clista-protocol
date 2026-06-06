const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { formatValidationErrors, validateEvents } = require("../src/validator");

const root = path.resolve(__dirname, "..");
const cliPath = path.join(root, "src", "cli.js");

test("CLI reconstructs governed fork merge from the event log", () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "clista-merges-"));

  runCli(cwd, ["init"]);
  runCli(cwd, [
    "thread",
    "create",
    "--id",
    "thd_parent",
    "--title",
    "Parent Reasoning",
    "--question",
    "Should fork reasoning be integrated?",
    "--participant",
    "Troy:decision owner"
  ]);
  runCli(cwd, [
    "evidence",
    "commit",
    "--id",
    "evd_parent",
    "--thread",
    "thd_parent",
    "--source",
    "Parent source",
    "--finding",
    "Parent evidence remains valid."
  ]);
  runCli(cwd, [
    "assumption",
    "declare",
    "--id",
    "asm_parent",
    "--thread",
    "thd_parent",
    "--text",
    "Parent assumption remains active.",
    "--evidence",
    "evd_parent"
  ]);
  const parentClaim = runCli(cwd, [
    "claim",
    "create",
    "--id",
    "clm_parent",
    "--thread",
    "thd_parent",
    "--text",
    "Parent claim remains the baseline.",
    "--evidence",
    "evd_parent",
    "--assumptions",
    "asm_parent"
  ]);

  runCli(cwd, [
    "thread",
    "fork",
    "--parent",
    "thd_parent",
    "--fork",
    "thd_fork",
    "--title",
    "Fork Reasoning",
    "--reason",
    "Try a different integration path.",
    "--through",
    parentClaim.event.event_id,
    "--changed-assumptions",
    "asm_parent",
    "--changed-claims",
    "clm_parent",
    "--forked-by",
    "Troy"
  ]);
  runCli(cwd, [
    "evidence",
    "commit",
    "--id",
    "evd_fork",
    "--thread",
    "thd_fork",
    "--source",
    "Fork source",
    "--finding",
    "Fork evidence adds a useful constraint."
  ]);
  runCli(cwd, [
    "assumption",
    "declare",
    "--id",
    "asm_fork",
    "--thread",
    "thd_fork",
    "--text",
    "Fork assumption should be integrated.",
    "--evidence",
    "evd_fork"
  ]);
  runCli(cwd, [
    "claim",
    "create",
    "--id",
    "clm_fork",
    "--thread",
    "thd_fork",
    "--text",
    "Fork claim improves the parent reasoning.",
    "--evidence",
    "evd_fork",
    "--assumptions",
    "asm_fork"
  ]);
  runCli(cwd, [
    "objection",
    "raise",
    "--id",
    "obj_fork_dissent",
    "--thread",
    "thd_fork",
    "--participant",
    "Troy",
    "--target",
    "clm_fork",
    "--target-type",
    "claim",
    "--text",
    "Preserve the concern that the fork claim may overfit."
  ]);

  const preMergeParent = runCli(cwd, ["state", "show", "--thread", "thd_parent"]);
  assert.equal(preMergeParent.assumptions.some((assumption) => assumption.id === "asm_fork"), false);

  runCli(cwd, [
    "merge",
    "open",
    "--id",
    "mrg_fork_parent",
    "--source",
    "thd_fork",
    "--target",
    "thd_parent",
    "--summary",
    "Integrate the useful fork reasoning.",
    "--opened-by",
    "Troy"
  ]);
  runCli(cwd, [
    "merge",
    "review",
    "--id",
    "mrv_troy_approve",
    "--request",
    "mrg_fork_parent",
    "--reviewer",
    "Troy",
    "--status",
    "approve",
    "--summary",
    "The merge is ready if dissent remains visible."
  ]);
  runCli(cwd, [
    "merge",
    "conflict",
    "declare",
    "--id",
    "cnf_assumption",
    "--request",
    "mrg_fork_parent",
    "--type",
    "assumption",
    "--parent",
    "asm_parent",
    "--fork",
    "asm_fork",
    "--summary",
    "The fork assumption revises the parent assumption."
  ]);
  runCli(cwd, [
    "merge",
    "conflict",
    "resolve",
    "--id",
    "mcr_assumption",
    "--request",
    "mrg_fork_parent",
    "--conflict",
    "cnf_assumption",
    "--resolution",
    "preserve_both",
    "--rationale",
    "The parent remains the baseline while the fork assumption enters as a preserved alternative."
  ]);

  const eligibility = runCli(cwd, ["merge", "eligibility", "--request", "mrg_fork_parent"]);
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.mergeRequestState.conflicts[0].status, "resolved");

  runCli(cwd, [
    "merge",
    "complete",
    "--request",
    "mrg_fork_parent",
    "--merged-by",
    "Troy"
  ]);

  const validation = runCli(cwd, ["validate"]);
  const parentState = runCli(cwd, ["state", "show", "--thread", "thd_parent"]);
  const forkState = runCli(cwd, ["state", "show", "--thread", "thd_fork"]);

  assert.deepEqual(validation, { valid: true, errors: [] });
  assert.equal(parentState.assumptions.some((assumption) => {
    return assumption.id === "asm_fork" && assumption.mergedFromThreadId === "thd_fork";
  }), true);
  assert.equal(parentState.claims.some((claim) => {
    return claim.id === "clm_fork" && claim.mergeRequestId === "mrg_fork_parent";
  }), true);
  assert.equal(parentState.mergeState.completed.length, 1);
  assert.equal(parentState.mergeState.completed[0].completion.mergeRequestId, "mrg_fork_parent");
  assert.equal(parentState.mergeState.completed[0].preservedObjections[0].id, "obj_fork_dissent");
  assert.equal(parentState.mergeState.completed[0].auditTrail.some((entry) => entry.event_type === "MergeCompleted"), true);
  assert.equal(forkState.forkLineage.parentThreadId, "thd_parent");
  assert.equal(forkState.claims.some((claim) => claim.id === "clm_fork"), true);
});

test("rejects illegitimate merge scenarios", () => {
  const base = baseMergeEvents();
  const request = mergeRequest();
  const approval = mergeReview({ status: "approve" });
  const completion = mergeCompletion();

  assertInvalid([
    ...base,
    mergeRequest({ sourceForkThreadId: "thd_missing" })
  ], /merge request source is not a known fork: thd_missing/);

  assertInvalid([
    ...base,
    makeEvent({
      event_id: "evt_threadcreated_other",
      event_type: "ThreadCreated",
      thread_id: "thd_other",
      payload: {
        thread: {
          id: "thd_other",
          object: "thread",
          title: "Other",
          question: "Other?",
          status: "active",
          participantIds: ["par_troy"],
          createdAt: "2026-06-06T00:00:00.000Z",
          updatedAt: "2026-06-06T00:00:00.000Z"
        }
      }
    }),
    mergeRequest({ targetThreadId: "thd_other", threadId: "thd_other" })
  ], /is not descended from target thd_other/);

  assertInvalid([
    ...base,
    completion
  ], /merge completion before merge request exists: mrg_fork_parent/);

  assertInvalid([
    ...base,
    request,
    approval,
    mergeConflict(),
    completion
  ], /merge conflict remains unresolved: cnf_assumption/);

  assertInvalid([
    ...base,
    request,
    mergeReview({ id: "mrv_changes", status: "request_changes" }),
    completion
  ], /has unresolved request_changes/);

  assertInvalid([
    ...base,
    request,
    approval,
    makeEvent({
      event_id: "evt_participant_reviewer",
      event_type: "ParticipantAdded",
      thread_id: "thd_parent",
      actor_id: "par_reviewer",
      payload: {
        participant: {
          id: "par_reviewer",
          object: "participant",
          kind: "human",
          name: "Reviewer",
          role: "reviewer"
        }
      }
    }),
    mergeCompletion({ mergedBy: "par_reviewer", actor_id: "par_reviewer" })
  ], /merge completed without authorized decision owner par_reviewer/);

  assertInvalid([
    ...base,
    request,
    approval,
    mergeCompletion({ preservedObjectionIds: [] })
  ], /blocking objection obj_fork_dissent dropped without preservation or rejection rationale/);

  assertInvalid([
    ...base,
    request,
    approval,
    completion,
    mergeCompletion({ id: "mcm_duplicate", event_id: "evt_mergecompleted_duplicate" })
  ], /duplicate merge completion for request mrg_fork_parent/);

  assertInvalid([
    ...base,
    request,
    approval,
    mergeCompletion({ acceptedObjectIds: ["asm_missing"] })
  ], /acceptedObjectId does not exist in source fork state: asm_missing/);

  assertInvalid([
    ...base,
    request,
    mergeConflictResolution({ conflictId: "cnf_missing" })
  ], /references unknown conflict cnf_missing/);
});

function baseMergeEvents() {
  return [
    makeEvent({
      event_id: "evt_participant_troy",
      event_type: "ParticipantAdded",
      thread_id: "thd_parent",
      payload: {
        participant: {
          id: "par_troy",
          object: "participant",
          kind: "human",
          name: "Troy",
          role: "decision owner"
        }
      }
    }),
    makeEvent({
      event_id: "evt_threadcreated_parent",
      event_type: "ThreadCreated",
      thread_id: "thd_parent",
      payload: {
        thread: {
          id: "thd_parent",
          object: "thread",
          title: "Parent",
          question: "Parent?",
          status: "active",
          participantIds: ["par_troy"],
          createdAt: "2026-06-06T00:00:00.000Z",
          updatedAt: "2026-06-06T00:00:00.000Z"
        }
      }
    }),
    evidence("evt_evidence_parent", "evd_parent", "thd_parent", "Parent evidence."),
    assumption("evt_assumption_parent", "asm_parent", "thd_parent", "Parent assumption.", ["evd_parent"]),
    claim("evt_claim_parent", "clm_parent", "thd_parent", "Parent claim.", ["evd_parent"], ["asm_parent"]),
    makeEvent({
      event_id: "evt_threadforked_fork",
      event_type: "ThreadForked",
      thread_id: "thd_fork",
      payload: {
        threadFork: {
          id: "thd_fork",
          object: "threadFork",
          parentThreadId: "thd_parent",
          forkThreadId: "thd_fork",
          forkTitle: "Fork",
          forkedBy: "par_troy",
          forkedAt: "2026-06-06T00:01:00.000Z",
          inheritedThroughEventId: "evt_claim_parent",
          forkReason: "Diverge.",
          changedAssumptionIds: ["asm_parent"],
          changedClaimIds: ["clm_parent"]
        }
      }
    }),
    evidence("evt_evidence_fork", "evd_fork", "thd_fork", "Fork evidence."),
    assumption("evt_assumption_fork", "asm_fork", "thd_fork", "Fork assumption.", ["evd_fork"]),
    claim("evt_claim_fork", "clm_fork", "thd_fork", "Fork claim.", ["evd_fork"], ["asm_fork"]),
    makeEvent({
      event_id: "evt_objection_fork",
      event_type: "ObjectionRaised",
      thread_id: "thd_fork",
      payload: {
        objection: {
          id: "obj_fork_dissent",
          object: "objection",
          threadId: "thd_fork",
          participantId: "par_troy",
          targetObjectId: "clm_fork",
          targetObjectType: "claim",
          text: "Fork dissent.",
          blocking: true,
          status: "open",
          raisedAt: "2026-06-06T00:05:00.000Z"
        }
      }
    })
  ];
}

function evidence(event_id, id, threadId, finding) {
  return makeEvent({
    event_id,
    event_type: "EvidenceCommitted",
    thread_id: threadId,
    payload: {
      evidence: {
        id,
        object: "evidence",
        threadId,
        source: "Test",
        finding,
        committedByParticipantId: "par_troy",
        committedAt: "2026-06-06T00:02:00.000Z",
        contentHash: `sha256:${"0".repeat(64)}`
      }
    }
  });
}

function assumption(event_id, id, threadId, text, evidenceIds) {
  return makeEvent({
    event_id,
    event_type: "AssumptionDeclared",
    thread_id: threadId,
    payload: {
      assumption: {
        id,
        object: "assumption",
        threadId,
        text,
        status: "active",
        evidenceIds,
        declaredByParticipantId: "par_troy",
        declaredAt: "2026-06-06T00:03:00.000Z",
        contentHash: `sha256:${"1".repeat(64)}`
      }
    }
  });
}

function claim(event_id, id, threadId, text, evidenceIds, assumptionIds) {
  return makeEvent({
    event_id,
    event_type: "ClaimCreated",
    thread_id: threadId,
    payload: {
      claim: {
        id,
        object: "claim",
        threadId,
        text,
        status: "draft",
        evidenceIds,
        assumptionIds,
        createdByParticipantId: "par_troy",
        createdAt: "2026-06-06T00:04:00.000Z"
      }
    }
  });
}

function mergeRequest(overrides = {}) {
  const request = {
    id: "mrg_fork_parent",
    mergeRequestId: "mrg_fork_parent",
    object: "mergeRequest",
    threadId: overrides.threadId || overrides.targetThreadId || "thd_parent",
    sourceForkThreadId: "thd_fork",
    targetThreadId: "thd_parent",
    openedBy: "par_troy",
    openedAt: "2026-06-06T00:06:00.000Z",
    summary: "Merge fork.",
    status: "review",
    proposedAssumptionIds: ["asm_fork"],
    proposedEvidenceIds: ["evd_fork"],
    proposedClaimIds: ["clm_fork"],
    proposedObjectionIds: ["obj_fork_dissent"],
    proposedDecisionRecordIds: [],
    ...overrides
  };
  return makeEvent({
    event_id: overrides.event_id || "evt_mergerequest",
    event_type: "MergeRequestOpened",
    thread_id: request.threadId,
    payload: { mergeRequest: request }
  });
}

function mergeReview({ id = "mrv_approve", status = "approve" } = {}) {
  return makeEvent({
    event_id: `evt_mergereview_${id}`,
    event_type: "MergeReviewSubmitted",
    thread_id: "thd_parent",
    payload: {
      mergeReview: {
        id,
        object: "mergeReview",
        threadId: "thd_parent",
        mergeRequestId: "mrg_fork_parent",
        reviewerId: "par_troy",
        reviewerParticipantId: "par_troy",
        status,
        summary: "Review.",
        requiredChanges: status === "request_changes" ? ["Change required."] : [],
        reviewedAt: "2026-06-06T00:07:00.000Z"
      }
    }
  });
}

function mergeConflict() {
  return makeEvent({
    event_id: "evt_mergeconflict",
    event_type: "MergeConflictDeclared",
    thread_id: "thd_parent",
    payload: {
      mergeConflict: {
        id: "cnf_assumption",
        conflictId: "cnf_assumption",
        object: "mergeConflict",
        threadId: "thd_parent",
        mergeRequestId: "mrg_fork_parent",
        conflictType: "assumption",
        parentObjectId: "asm_parent",
        forkObjectId: "asm_fork",
        summary: "Conflict.",
        status: "open",
        declaredBy: "par_troy",
        declaredAt: "2026-06-06T00:08:00.000Z"
      }
    }
  });
}

function mergeConflictResolution({ conflictId = "cnf_assumption", resolution = "preserve_both" } = {}) {
  return makeEvent({
    event_id: `evt_mergeconflictresolution_${conflictId}`,
    event_type: "MergeConflictResolved",
    thread_id: "thd_parent",
    payload: {
      mergeConflictResolution: {
        id: `mcr_${conflictId}`,
        object: "mergeConflictResolution",
        threadId: "thd_parent",
        mergeRequestId: "mrg_fork_parent",
        conflictId,
        resolution,
        rationale: "Resolve conflict.",
        resolvedBy: "par_troy",
        resolvedAt: "2026-06-06T00:09:00.000Z"
      }
    }
  });
}

function mergeCompletion(overrides = {}) {
  const completion = {
    id: "mcm_fork_parent",
    object: "mergeCompletion",
    threadId: "thd_parent",
    mergeRequestId: "mrg_fork_parent",
    mergedBy: "par_troy",
    mergedAt: "2026-06-06T00:10:00.000Z",
    acceptedObjectIds: ["evd_fork", "asm_fork", "clm_fork"],
    preservedObjectionIds: ["obj_fork_dissent"],
    rejectedObjectIds: [],
    authorityTrail: [{
      participantId: "par_troy",
      role: "decision owner",
      source: "ParticipantAdded.role"
    }],
    ...overrides
  };
  const actor_id = overrides.actor_id || completion.mergedBy;
  delete completion.actor_id;
  delete completion.event_id;
  return makeEvent({
    event_id: overrides.event_id || "evt_mergecompleted",
    event_type: "MergeCompleted",
    thread_id: completion.threadId,
    actor_id,
    payload: { mergeCompletion: completion }
  });
}

function makeEvent({ event_id, event_type, thread_id, actor_id = "par_troy", payload }) {
  return {
    event_id,
    event_type,
    thread_id,
    actor_id,
    timestamp: "2026-06-06T00:00:00.000Z",
    payload
  };
}

function assertInvalid(events, expectedReason) {
  const result = validateEvents(events);
  assert.equal(result.valid, false);
  assert.match(formatValidationErrors(result.errors), expectedReason);
}

function runCli(cwd, args) {
  const result = spawnSync("node", [cliPath, ...args], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

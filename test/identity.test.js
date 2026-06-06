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

test("CLI identity events grant decision_owner authority for a governed decision", () => {
  const cwd = createIdentityDecisionStore();
  runCli(cwd, [
    "participant",
    "authority",
    "grant",
    "--participant",
    "par_troy",
    "--authority",
    "decision_owner",
    "--scope",
    "thread",
    "--thread",
    "thd_identity"
  ]);
  runCli(cwd, [
    "decision",
    "merge",
    "--id",
    "dcr_identity",
    "--thread",
    "thd_identity",
    "--request",
    "drq_identity",
    "--decider",
    "par_troy"
  ]);

  assert.deepEqual(runCli(cwd, ["validate"]), { valid: true, errors: [] });

  const identity = runCli(cwd, ["identity", "show", "--participant", "par_troy"]);
  assert.equal(identity.participant.id, "par_troy");
  assert.equal(identity.activeAuthorities.length, 1);
  assert.equal(identity.activeAuthorities[0].authority, "decision_owner");
  assert.equal(identity.identityValidationStatus.valid, true);

  const state = selectThreadState(projectEvents(readEventsAt(path.join(cwd, ".clista", "events.ndjson"))), "thd_identity");
  assert.equal(state.identityState.activeAuthorities[0].participantId, "par_troy");
});

test("revoked decision_owner authority cannot be used after revocation", () => {
  const cwd = createIdentityDecisionStore();
  runCli(cwd, [
    "participant",
    "authority",
    "grant",
    "--participant",
    "par_troy",
    "--authority",
    "decision_owner",
    "--scope",
    "thread",
    "--thread",
    "thd_identity"
  ]);
  runCli(cwd, [
    "participant",
    "authority",
    "revoke",
    "--participant",
    "par_troy",
    "--authority",
    "decision_owner",
    "--scope",
    "thread",
    "--thread",
    "thd_identity"
  ]);
  const identity = runCli(cwd, ["identity", "show", "--participant", "par_troy"]);
  assert.equal(identity.revokedAuthorities.length, 1);
  assert.equal(identity.activeAuthorities.length, 0);

  runCli(cwd, [
    "decision",
    "merge",
    "--id",
    "dcr_identity_revoked",
    "--thread",
    "thd_identity",
    "--request",
    "drq_identity",
    "--decider",
    "par_troy"
  ]);

  const validation = runCli(cwd, ["validate"], { allowFailure: true });
  assert.equal(validation.status, 1);
  assert.match(JSON.stringify(validation.output.errors), /decision merged without authorized decision owner par_troy/);
});

test("identity validation rejects unknown authority actors, duplicate participants, and invalid scopes", () => {
  const events = clone(readEventsAt(canonicalLog));
  events.push(makeIdentityEvent({
    event_id: "evt_duplicate_participant",
    event_type: "ParticipantDeclared",
    actor_id: "par_troy",
    payload: {
      participant: {
        id: "par_troy",
        object: "participant",
        kind: "human",
        name: "Duplicate Troy"
      }
    }
  }));
  assertInvalid(events, /duplicate participant id par_troy/);

  const unknownActor = clone(readEventsAt(canonicalLog));
  unknownActor.push(makeIdentityEvent({
    event_id: "evt_unknown_authority_actor",
    event_type: "ParticipantAuthorityGranted",
    actor_id: "par_missing",
    payload: {
      participantAuthority: {
        id: "auth_unknown_actor",
        object: "participantAuthority",
        participantId: "par_troy",
        authority: "decision_owner",
        scope: "global",
        grantedBy: "par_missing"
      }
    }
  }));
  assertInvalid(unknownActor, /actor_id par_missing is not a known participant/);

  const invalidScope = clone(readEventsAt(canonicalLog));
  invalidScope.push(makeIdentityEvent({
    event_id: "evt_invalid_scope",
    event_type: "ParticipantAuthorityGranted",
    actor_id: "par_troy",
    payload: {
      participantAuthority: {
        id: "auth_invalid_scope",
        object: "participantAuthority",
        participantId: "par_troy",
        authority: "decision_owner",
        scope: "organization",
        grantedBy: "par_troy"
      }
    }
  }));
  assertInvalid(invalidScope, /unsupported authority scope organization/);
});

test("role assignments and authority grants require known participants", () => {
  const roleEvents = clone(readEventsAt(canonicalLog));
  roleEvents.push(makeIdentityEvent({
    event_id: "evt_role_unknown_participant",
    event_type: "ParticipantRoleAssigned",
    actor_id: "par_troy",
    payload: {
      participantRole: {
        id: "rol_missing",
        object: "participantRole",
        participantId: "par_missing",
        role: "reviewer",
        scope: "global",
        assignedBy: "par_troy"
      }
    }
  }));
  assertInvalid(roleEvents, /role assignment references unknown participant par_missing/);

  const grantEvents = clone(readEventsAt(canonicalLog));
  grantEvents.push(makeIdentityEvent({
    event_id: "evt_grant_unknown_participant",
    event_type: "ParticipantAuthorityGranted",
    actor_id: "par_troy",
    payload: {
      participantAuthority: {
        id: "auth_missing",
        object: "participantAuthority",
        participantId: "par_missing",
        authority: "decision_owner",
        scope: "global",
        grantedBy: "par_troy"
      }
    }
  }));
  assertInvalid(grantEvents, /authority grant references unknown participant par_missing/);
});

function createIdentityDecisionStore() {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "clista-identity-"));
  runCli(cwd, ["init"]);
  runCli(cwd, [
    "participant",
    "declare",
    "--id",
    "par_troy",
    "--name",
    "Troy"
  ]);
  runCli(cwd, [
    "thread",
    "create",
    "--id",
    "thd_identity",
    "--title",
    "Identity Thread",
    "--question",
    "Can identity authorize portable reasoning?",
    "--actor",
    "par_troy",
    "--actor-role",
    "contributor",
    "--participant",
    "par_troy:Troy:contributor"
  ]);
  runCli(cwd, [
    "evidence",
    "commit",
    "--id",
    "evd_identity",
    "--thread",
    "thd_identity",
    "--source",
    "Identity theorem",
    "--finding",
    "Portable reasoning needs participant authority.",
    "--actor",
    "par_troy"
  ]);
  runCli(cwd, [
    "assumption",
    "declare",
    "--id",
    "asm_identity",
    "--thread",
    "thd_identity",
    "--text",
    "Authority must be explicit after portability.",
    "--evidence",
    "evd_identity",
    "--actor",
    "par_troy"
  ]);
  runCli(cwd, [
    "claim",
    "create",
    "--id",
    "clm_identity",
    "--thread",
    "thd_identity",
    "--text",
    "Protocol identity should authorize decisions.",
    "--evidence",
    "evd_identity",
    "--assumptions",
    "asm_identity",
    "--actor",
    "par_troy"
  ]);
  runCli(cwd, [
    "decision",
    "open",
    "--id",
    "drq_identity",
    "--thread",
    "thd_identity",
    "--proposal",
    "Adopt protocol identity.",
    "--evidence",
    "evd_identity",
    "--claims",
    "clm_identity",
    "--assumptions",
    "asm_identity",
    "--actor",
    "par_troy"
  ]);
  runCli(cwd, [
    "review",
    "submit",
    "--id",
    "rev_identity",
    "--thread",
    "thd_identity",
    "--request",
    "drq_identity",
    "--reviewer",
    "par_troy",
    "--status",
    "approve"
  ]);
  return cwd;
}

function runCli(cwd, args, options = {}) {
  const result = spawnSync("node", [cliPath, ...args], {
    cwd,
    encoding: "utf8"
  });
  if (!options.allowFailure) {
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  }
  return {
    status: result.status,
    output: result.stdout ? JSON.parse(result.stdout) : null,
    stderr: result.stderr
  };
}

function makeIdentityEvent({ event_id, event_type, actor_id, payload }) {
  return {
    event_id,
    event_type,
    thread_id: "thd_thread_0001",
    actor_id,
    timestamp: "2026-06-06T00:03:00.000Z",
    payload
  };
}

function assertInvalid(events, expectedReason) {
  const result = validateEvents(events);
  assert.equal(result.valid, false);
  assert.match(formatValidationErrors(result.errors), expectedReason);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

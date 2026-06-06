const VALID_AUTHORITY_SCOPES = new Set(["global", "thread"]);
const VALID_AUTHORITIES = new Set(["decision_owner"]);

function emptyIdentityState() {
  return {
    participants: new Map(),
    participantEvents: new Map(),
    roles: [],
    authorityHistory: [],
    activeAuthorities: new Map(),
    revokedAuthorities: [],
    participantThreadIds: new Map()
  };
}

function buildIdentityState(events = []) {
  const state = emptyIdentityState();
  for (const event of events) {
    applyIdentityEvent(state, event);
  }
  return state;
}

function applyIdentityEvent(state, event) {
  const payload = event?.payload || {};
  switch (event?.event_type) {
    case "ParticipantAdded":
      applyParticipant(state, payload.participant, event, { legacy: true });
      break;
    case "ParticipantDeclared":
      applyParticipant(state, payload.participant, event, { legacy: false });
      break;
    case "ParticipantRoleAssigned":
      applyRoleAssignment(state, payload.participantRole, event);
      break;
    case "ParticipantAuthorityGranted":
      applyAuthorityGrant(state, payload.participantAuthority, event);
      break;
    case "ParticipantAuthorityRevoked":
      applyAuthorityRevocation(state, payload.participantAuthorityRevocation, event);
      break;
    default:
      break;
  }
}

function applyParticipant(state, participant, event, options = {}) {
  if (!participant?.id) {
    return;
  }
  const source = options.legacy ? "ParticipantAdded" : "ParticipantDeclared";
  state.participants.set(participant.id, {
    ...participant,
    identitySource: source,
    declaredAt: participant.declaredAt || event.timestamp,
    declaredBy: participant.declaredBy || event.actor_id
  });
  state.participantEvents.set(participant.id, event);
  addParticipantThread(state, participant.id, event.thread_id);

  if (participant.role) {
    const role = {
      id: `rol_${event.event_id || participant.id}`,
      object: "participantRole",
      participantId: participant.id,
      role: normalizeRole(participant.role),
      displayRole: participant.role,
      scope: event.thread_id ? "thread" : "global",
      threadId: event.thread_id || null,
      assignedBy: event.actor_id,
      assignedAt: event.timestamp,
      sourceEventId: event.event_id,
      legacy: Boolean(options.legacy)
    };
    state.roles.push(role);
    if (isDecisionOwnerRole(role.role)) {
      applyAuthorityGrant(state, {
        id: `auth_${event.event_id || participant.id}`,
        object: "participantAuthority",
        participantId: participant.id,
        authority: "decision_owner",
        scope: role.scope,
        threadId: role.threadId,
        grantedBy: event.actor_id,
        grantedAt: event.timestamp,
        source: `${source}.role`,
        legacy: Boolean(options.legacy)
      }, event);
    }
  }
}

function applyRoleAssignment(state, role, event) {
  if (!role?.participantId || !role.role) {
    return;
  }
  state.roles.push({
    id: role.id || `rol_${event.event_id}`,
    object: "participantRole",
    participantId: role.participantId,
    role: normalizeRole(role.role),
    displayRole: role.role,
    scope: role.scope || "global",
    threadId: role.threadId || null,
    assignedBy: role.assignedBy || event.actor_id,
    assignedAt: role.assignedAt || event.timestamp,
    sourceEventId: event.event_id,
    legacy: false
  });
}

function applyAuthorityGrant(state, authority, event) {
  if (!authority?.participantId || !authority.authority) {
    return;
  }
  const normalized = normalizeAuthorityRecord(authority, event);
  state.authorityHistory.push({
    ...normalized,
    action: "granted"
  });
  state.activeAuthorities.set(authorityKey(normalized), normalized);
}

function applyAuthorityRevocation(state, revocation, event) {
  if (!revocation?.participantId || !revocation.authority) {
    return;
  }
  const normalized = normalizeAuthorityRecord({
    ...revocation,
    id: revocation.authorityId || revocation.id
  }, event);
  const key = authorityKey(normalized);
  const active = state.activeAuthorities.get(key) || null;
  const revoked = {
    ...(active || normalized),
    revocationId: revocation.id || `rev_${event.event_id}`,
    revokedBy: revocation.revokedBy || event.actor_id,
    revokedAt: revocation.revokedAt || event.timestamp,
    revocationReason: revocation.reason || revocation.revocationReason,
    sourceEventId: event.event_id,
    active: false
  };
  state.activeAuthorities.delete(key);
  state.revokedAuthorities.push(revoked);
  state.authorityHistory.push({
    ...revoked,
    action: "revoked"
  });
}

function normalizeAuthorityRecord(authority, event) {
  return {
    id: authority.id || authority.authorityId || `auth_${event.event_id}`,
    object: "participantAuthority",
    participantId: authority.participantId,
    authority: normalizeAuthority(authority.authority),
    scope: authority.scope || "global",
    threadId: authority.threadId || null,
    grantedBy: authority.grantedBy || event.actor_id,
    grantedAt: authority.grantedAt || event.timestamp,
    source: authority.source || event.event_type,
    sourceEventId: event.event_id,
    legacy: Boolean(authority.legacy),
    active: true
  };
}

function participantHasAuthority(state, participantId, authority, threadId) {
  return activeAuthoritiesFor(state, authority, threadId)
    .some((record) => record.participantId === participantId);
}

function activeAuthoritiesFor(state, authority, threadId) {
  const normalizedAuthority = normalizeAuthority(authority);
  return Array.from(state.activeAuthorities.values())
    .filter((record) => record.authority === normalizedAuthority)
    .filter((record) => authorityAppliesToThread(record, threadId));
}

function authorizedParticipantIds(state, authority, threadId) {
  return activeAuthoritiesFor(state, authority, threadId)
    .map((record) => record.participantId)
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

function authorityAppliesToThread(record, threadId) {
  return record.scope === "global" || record.threadId === threadId;
}

function authorityKey(record) {
  return [
    record.participantId,
    normalizeAuthority(record.authority),
    record.scope || "global",
    record.threadId || "*"
  ].join(":");
}

function addParticipantThread(state, participantId, threadId) {
  if (!participantId || !threadId) {
    return;
  }
  if (!state.participantThreadIds.has(participantId)) {
    state.participantThreadIds.set(participantId, new Set());
  }
  state.participantThreadIds.get(participantId).add(threadId);
}

function projectIdentity(state) {
  return {
    schema: "clista.identity.v0",
    participants: Array.from(state.participants.values()),
    roles: state.roles,
    activeAuthorities: Array.from(state.activeAuthorities.values()),
    revokedAuthorities: state.revokedAuthorities,
    authorityHistory: state.authorityHistory,
    identityValidationStatus: {
      valid: true,
      participantCount: state.participants.size,
      activeAuthorityCount: state.activeAuthorities.size,
      revokedAuthorityCount: state.revokedAuthorities.length
    }
  };
}

function identityForParticipant(state, participantId) {
  const projection = projectIdentity(state);
  return {
    schema: "clista.identity.participant.v0",
    participantId,
    participant: state.participants.get(participantId) || null,
    roles: projection.roles.filter((role) => role.participantId === participantId),
    activeAuthorities: projection.activeAuthorities.filter((authority) => authority.participantId === participantId),
    revokedAuthorities: projection.revokedAuthorities.filter((authority) => authority.participantId === participantId),
    authorityHistory: projection.authorityHistory.filter((authority) => authority.participantId === participantId),
    identityValidationStatus: {
      valid: state.participants.has(participantId),
      reason: state.participants.has(participantId) ? null : `participant not found: ${participantId}`
    }
  };
}

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function normalizeAuthority(authority) {
  return String(authority || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isDecisionOwnerRole(role) {
  return normalizeRole(role) === "decision_owner";
}

module.exports = {
  VALID_AUTHORITIES,
  VALID_AUTHORITY_SCOPES,
  activeAuthoritiesFor,
  applyIdentityEvent,
  authorizedParticipantIds,
  buildIdentityState,
  emptyIdentityState,
  identityForParticipant,
  isDecisionOwnerRole,
  normalizeAuthority,
  normalizeRole,
  participantHasAuthority,
  projectIdentity
};

# Milestone 8: Protocol Identity

## Acceptance Criteria

ClisTa must define protocol-level participant identity so portable reasoning remains accountable after export and import.

The theorem is:

```text
verified_participant = verify(identity + role + authority)
```

## Era 2 Boundary

Era 1 proved:

```text
portable_reasoning_state =
transfer(verify(project(append_only_event_log)))
```

Era 2 begins with:

```text
trustworthy_portable_reasoning =
verify(identity + attribution + authority + provenance)
```

## Required Commands

```text
clista participant declare --name <name> [--id <participantId>] [--thread <threadId>]
clista participant role assign --participant <name|id> --role <role> [--scope global|thread] [--thread <threadId>]
clista participant authority grant --participant <name|id> --authority decision_owner [--scope global|thread] [--thread <threadId>]
clista participant authority revoke --participant <name|id> --authority decision_owner [--scope global|thread] [--thread <threadId>]
clista identity show --participant <name|id>
```

## Required Events

- `ParticipantDeclared`
- `ParticipantRoleAssigned`
- `ParticipantAuthorityGranted`
- `ParticipantAuthorityRevoked`

## Required Projection

Projection must expose:

- participants
- roles
- active authorities
- revoked authorities
- authority history
- identity validation status

## Required Validation

ClisTa rejects identity and authority logs when:

- authority-bearing event actors are not declared participants
- duplicate participant IDs are declared
- role assignments reference unknown participants
- authority grants reference unknown participants
- authority grants use unsupported scopes
- authority revocations reference inactive authorities
- a `decision_owner` action occurs without active authority at that event time
- revoked authority is used after revocation

## Legacy Compatibility

`ParticipantAdded` remains a legacy declaration source for existing protocol logs.

A legacy participant with role `decision_owner` is projected as legacy `decision_owner` authority for that thread.

New protocol identity should use explicit declarations, role assignments, grants, and revocations.

## Anti-Pattern

```text
vibes with hashes
```

Definition:

A system that cryptographically preserves artifacts without proving who authored them, what authority they carried, or why their contributions should be trusted.

## Boundary

This milestone does not add:

- login
- OAuth
- accounts
- signatures
- network identity
- permissions UI
- external identity providers
- reputation

## Theorem

Continuity makes reasoning portable.

Identity makes portable reasoning accountable.

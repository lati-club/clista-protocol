# Milestone 1: Protocol Validity

## Acceptance Criteria

Invalid reasoning must fail loudly.

Given an append-only event log, ClisTa validates:

- event envelope fields
- object references
- state transitions
- decision requirements
- objection resolution authority
- audit integrity

The validator must return human-readable errors with:

```text
event_id
reason
```

## Required Command

```text
clista validate
```

`clista validate` must exit nonzero for invalid logs.

## Theorem

Projection proves memory.

Validation proves protocol.

If ClisTa can reject invalid reasoning state before projection, it has moved from remembering reasoning to governing reasoning.

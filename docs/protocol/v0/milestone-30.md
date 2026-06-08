# Milestone 30: Agent Ingestion Adapter

## Theorem

```text
agent_ingestion = emit(session_transcript) -> canonical_protocol_events
```

## Hard Law

```text
adapter_emits_protocol != adapter_owns_protocol
```

## Capability

M30 adds the first agent adapter (Phase 3): a Hermes session adapter
(`src/ingest_hermes.py`) that parses a raw session transcript (`.json` or
`.ndjson`) and emits the canonical append-only event log the engine consumes.
The adapter is input to the protocol; it does not become the protocol.

The session maps to existing protocol objects:

- human and agent identities -> `ParticipantAdded`
- the session -> `ThreadCreated`
- each substantive user message -> `ClaimCreated`
- each tool output linked to its call -> `EvidenceCommitted`

`src/clista_events.py` reproduces the canonical event hashing in
`src/integrity.js` byte-for-byte, so the generated log is accepted by the
reference engine and projects like any hand-authored log.

M30 was selected from observed friction: the Level 1 Python MVP had drifted into
a second, weaker representation (a flat `clista.protocol.v0` export read only by
a parallel Python engine). M30 consolidated the tooling onto one representation,
the event log, and one engine, retiring the parallel Python engine and flat
export.

## Proof Case

`examples/hermes-ingest/` ingests a four-message session and projects a full
accountable thread from the public files alone:

```text
node src/cli.js validate   --events examples/hermes-ingest/events.ndjson
node src/cli.js state show  --events examples/hermes-ingest/events.ndjson
node src/cli.js audit show  --events examples/hermes-ingest/events.ndjson
```

The mapping and extraction rules are documented in
`docs/hermes-thread-emission.md`.

## Boundary

M30 may:

- add the Hermes ingestion adapter and its event-log primitives
- add an example and adapter documentation
- retire the parallel Python engine and the flat export it read

M30 must not:

- add or change protocol event types
- change validator, projection, or export behavior
- change schema behavior
- make the adapter authoritative over protocol state
- create trust, governance approval, or amendment approval

The adapter emits protocol objects; it does not own or mutate protocol state.

## Relation To Protocol State

M30 emits only existing event types. It adds no new event types, changes no
validation rules, and changes no projection or export behavior. The engine
remains the single source of truth; the adapter is one input path into it.

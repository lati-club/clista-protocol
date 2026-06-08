# Milestone 32: Reproducible Adapter Replay

## Theorem

```text
reproducible_ingestion = derive(ids, timestamps) from session_content
```

## Hard Law

```text
replay_verification != eyeball_comparison
```

## Capability

M32 makes the Hermes ingestion adapter reproducible. Ingestion previously minted
random ids and stamped wall-clock times, so re-ingesting the same session
produced an equivalent-but-different log. M32 derives every id from the session
content (stable and unique) and every timestamp from the session's own messages
(with a fixed epoch fallback), so the same session always emits the same log,
byte for byte.

Determinism unlocks diffable verification:

- `examples/hermes-ingest/` ships a committed `expected-summary.json`
- re-ingesting the session reproduces the committed `events.ndjson` exactly
- `npm run replay` is a one-command clean-room replay: it copies only the public
  artifact into a fresh directory, re-ingests, checks the log is byte-identical
  to the committed one, validates it, and confirms the answer view matches the
  committed expected output

M32 was selected from observed friction: random ids and wall-clock timestamps
meant the adapter example could not commit an expected state, forced a
`grep`-the-id workaround in its docs, and left replay verified by eye.

## Proof Case

The reproducibility is covered by tests (re-ingest equals the committed log
byte-for-byte; the example log validates and its `decision summary` equals
`expected-summary.json`) and by a dedicated clean-room CI job:

```text
npm run replay
```

The flow has been reproduced once from a fresh `git clone` of `main` with no
local state (builder-run). The roadmap's Next Replay Observation candidate — an
independent non-builder reproducing it — remains open by definition.

## Boundary

M32 may:

- make ingestion id and timestamp derivation deterministic
- add the committed expected answer view, the clean-room replay script, and its
  CI job
- update the example and its documentation

M32 must not:

- add or change protocol event types
- change validator, projection, or export behavior
- change the content shape of emitted objects beyond their ids and timestamps
- create trust, governance approval, or amendment approval

## Relation To Protocol State

M32 changes only how the adapter generates ids and timestamps. It emits the same
event types with the same content shape; it adds no event types and changes no
validation, projection, or export behavior. The same session now produces an
identical, diffable event log.

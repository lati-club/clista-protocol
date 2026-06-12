# Milestone 0: Protocol Spine Proven

## Acceptance Criteria

Given only:

```text
.clista/events.ndjson
```

The system can produce:

```text
question:
decision:
rationale:
assumptions:
evidence:
claims:
positions:
objections:
minority_reports:
next_action:
audit_summary:
```

without consulting:

```text
chat history
prompts
memory
LLMs
external state
```

If this succeeds, ClisTa has proven that reasoning can be stored as protocol state rather than conversation history.

## Current Proof Target

The first proof target is thread 0001:

```text
.clista/events.ndjson
```

`clista state show --thread thd_thread_0001` must reconstruct the origin reasoning for "Build ClisTa Protocol" without reading `docs/origins/thread-0001-build-clista.md` or `threads/thread-0001.yaml`.

## First Thread

The first thread in the system is itself:

```yaml
thread:
  Build ClisTa Protocol
```

The protocol's first successful act is explaining why the protocol should exist.

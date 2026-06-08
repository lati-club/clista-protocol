# Milestone 31: Decision Legibility

## Theorem

```text
decision_legibility = selectDecisionSummary(projected_state) answers(what, why, who_dissented, what_next)
```

## Hard Law

```text
concise_answer_view != full_state_dump
```

## Capability

M31 makes the Phase 0 acceptance test executable. The original criterion was:

```text
Given only the exported ClisTa JSON, another agent can answer:
What was decided? Why? Who dissented? What should happen next?
```

After projection existed this was still a manual dig through a large `state
show` or `export`. M31 adds the `decision summary` command (backed by
`selectDecisionSummary` in the projector) that surfaces exactly those four
answers from projected state alone:

- `whatWasDecided` — status, summary, decided by
- `why` — rationale plus resolved supporting evidence, claims, and assumptions
- `whoDissented` — open or preserved objections plus minority reports
- `whatNext` — the next action

The view reuses the existing thread-state projection, so it never diverges from
`state show`. It prints JSON by default; `--format text` (or `md`) renders the
same four answers as human-readable markdown.

M31 was selected from observed friction: the answer view was the product value,
but it was buried in a roughly thirty-key state projection.

## Proof Case

The scenario-demo decision projects a complete answer view, including the
preserved privacy objection and its minority report:

```text
node src/cli.js decision summary --thread thd_scenario_demo --events examples/scenario-demo/events.ndjson
```

The command is wired into the external replay path
(`examples/scenario-demo/README.md`, `commands.md`, and the replay audit test).

## Boundary

M31 may:

- add the read-only `decision summary` command and its projector function
- add a text/markdown rendering of that view
- wire the command into the scenario replay docs and tests

M31 must not:

- add or change protocol event types
- change validator, projection, or export behavior
- add an expected-state comparator
- append events or mutate projected reasoning state
- create trust, governance approval, or amendment approval

## Relation To Protocol State

M31 is a derived, read-only view over the existing projection. It adds no event
types, changes no validation rules, and appends or mutates nothing. It only
re-presents already-projected state as a concise answer to the four questions.

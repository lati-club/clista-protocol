# Milestone 27: Protocol Scenario / Demo Workflow

## Theorem

```text
scenario_usability = reproduce(realistic_reasoning_lifecycle, from_documented_commands_and_projected_state)
```

## Hard Law

```text
demo_workflow != product
```

## Capability

M27 proves that a fresh user can run one realistic ClisTa reasoning lifecycle and understand the durable state produced by validation, projection, and export.

The scenario is not a new protocol primitive. It is a documented fixture replaying the existing protocol spine:

```text
Commit Evidence -> Pull Decision -> Track Audit
```

## Scenario

The scenario lives at:

```text
examples/scenario-demo/
```

It models a team deciding whether to run a limited support assistant beta before broader rollout.

The fixture includes:

- participants
- evidence
- assumptions
- claims
- positions
- a preserved objection
- reviews
- a decision record
- a minority report
- derived attribution
- derived provenance

## Replay

Run from the repository root:

```sh
node src/cli.js validate --events examples/scenario-demo/events.ndjson
node src/cli.js state show --thread thd_scenario_demo --events examples/scenario-demo/events.ndjson
node src/cli.js export --events examples/scenario-demo/events.ndjson
```

Optional inspection:

```sh
node src/cli.js attribution list --thread thd_scenario_demo --events examples/scenario-demo/events.ndjson
node src/cli.js provenance trace dcr_limited_beta --events examples/scenario-demo/events.ndjson
```

No new scenario command is required. The documented path intentionally uses existing protocol commands.

## Durable State

Expected state summary:

```text
examples/scenario-demo/expected-state.json
```

The important projected decision is:

```text
Run a bounded support assistant beta using redacted sample tickets only.
```

The state should preserve the supporting evidence, assumptions, claims, positions, conditional reviews, privacy objection, minority report, attribution, provenance, and audit trail.

## Boundary

M27 may:

- add a realistic example event log
- add expected scenario state
- document replay commands
- test validation, projection, export, attribution, provenance, and read-only replay

M27 must not:

- implement protocol distribution
- implement artifact installation
- implement network behavior
- build UI
- add agents
- do pitch cleanup
- start external user testing
- create protocol authority
- create trust
- create governance approval
- create amendment approval
- create compatibility proof
- create distribution proof
- claim product readiness
- mutate unrelated project state during replay

## Relation To Protocol State

M27 does not add event types.

M27 does not change validation rules.

M27 does not change projection behavior.

M27 does not change export behavior.

The demo workflow makes existing protocol state understandable. It does not make ClisTa a product platform.

# Scenario Demo Commands

Run from the repository root.

```sh
node src/cli.js validate --events examples/scenario-demo/events.ndjson
node src/cli.js state show --thread thd_scenario_demo --events examples/scenario-demo/events.ndjson
node src/cli.js export --events examples/scenario-demo/events.ndjson
node src/cli.js attribution list --thread thd_scenario_demo --events examples/scenario-demo/events.ndjson
node src/cli.js provenance trace dcr_limited_beta --events examples/scenario-demo/events.ndjson
```

Inspect the result:

- `validate` proves the scenario event log is accepted protocol truth.
- `state show` shows the durable reasoning state for the demo thread.
- `export` serializes the projected state for reload or inspection.
- `attribution list` shows who contributed each durable object.
- `provenance trace dcr_limited_beta` shows the source trail behind the decision.

This demo workflow makes protocol state understandable. It does not create trust, protocol authority, governance approval, amendment approval, compatibility proof, distribution proof, installation proof, product readiness, UI, agents, or external user testing.

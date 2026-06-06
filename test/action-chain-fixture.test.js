const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const cliPath = path.join(root, "src", "cli.js");
const fixtureLog = path.join(root, "examples", "action-chain", "events.ndjson");

test("action-chain fixture proves delegation, execution, outcome, and outcome learning", () => {
  assert.equal(runCli(["validate", "--events", fixtureLog]).valid, true);
  assert.equal(runCli(["delegation", "verify", "--events", fixtureLog]).valid, true);
  assert.equal(runCli(["execution", "verify", "--events", fixtureLog]).valid, true);
  assert.equal(runCli(["outcome", "verify", "--events", fixtureLog]).valid, true);
  assert.equal(runCli(["outcome-learning", "verify", "--events", fixtureLog]).valid, true);

  const state = runCli(["state", "show", "--thread", "thd_action_chain", "--events", fixtureLog]);
  assert.equal(state.reasoningState.delegation.grants[0].id, "dlg_action_chain");
  assert.equal(state.reasoningState.execution.records[0].id, "exe_action_chain");
  assert.equal(state.reasoningState.execution.records[0].status, "completed");
  assert.equal(state.protocolOutcomeState.records[0].id, "oco_action_chain");
  assert.equal(state.protocolOutcomeState.records[0].evaluationResult, "success");
  assert.equal(state.outcomeLearningState.signals[0].id, "ols_action_chain");
  assert.equal(
    state.outcomeLearningState.signals[0].evidence[0].value,
    "Outcome evaluation compared observed evidence to intended effect"
  );

  const exported = runCli(["export", "--events", fixtureLog]);
  assert.equal(exported.delegation.grants[0].id, "dlg_action_chain");
  assert.equal(exported.execution.records[0].status, "completed");
  assert.equal(exported.outcome.records[0].evaluationResult, "success");
  assert.equal(exported.outcomeLearning.lessons[0].id, "les_action_chain");
});

function runCli(args) {
  const result = spawnSync("node", [cliPath, ...args], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

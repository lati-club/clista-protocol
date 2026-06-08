const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const events = "examples/hermes-ingest/events.ndjson";

function cli(...args) {
  const result = spawnSync("node", ["src/cli.js", ...args], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test("hermes-ingest example log is accepted by the engine", () => {
  const validation = cli("validate", "--events", events);
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);
});

test("hermes-ingest decision summary matches the committed expected answer view", () => {
  const summary = cli("decision", "summary", "--events", events);
  const expected = JSON.parse(
    readFileSync(path.join(root, "examples/hermes-ingest/expected-summary.json"), "utf8")
  );
  assert.deepEqual(summary, expected);
});

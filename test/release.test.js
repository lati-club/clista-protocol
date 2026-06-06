const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync
} = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  REQUIRED_VERIFIERS,
  buildReleaseManifest,
  releaseManifestHash,
  verifyReleaseManifest,
  writeReleaseManifest
} = require("../src/release");
const { contentHash } = require("../src/integrity");

const root = path.resolve(__dirname, "..");
const cliPath = path.join(root, "src", "cli.js");
const releaseTag = "v0.25.0-protocol-release";

test("valid release manifest generation binds version, tag, CLI, schema, hashes, and verifier results", () => {
  const cwd = createReleaseRepo();
  const manifest = validManifest(cwd);
  const verification = verifyReleaseManifest(manifest, { cwd });

  assert.equal(manifest.schema, "clista.release.manifest.v0");
  assert.equal(manifest.theorem, "protocol_release = package(verified_runtime, with_reproducible_manifest)");
  assert.equal(manifest.hard_law, "release != trust");
  assert.equal(manifest.package_version, "0.25.0");
  assert.equal(manifest.git_tag, releaseTag);
  assert.equal(manifest.cli_entrypoint, "src/cli.js");
  assert.equal(manifest.release_exists, true);
  assert.equal(manifest.release_verified, false);
  assert.equal(manifest.trusted, false);
  assert.ok(manifest.capability_set.includes("release"));
  assert.ok(manifest.required_verification_layers.includes("recovery"));
  assert.ok(manifest.schema_files.some((file) => file.path === "schemas/clista-release-manifest.schema.json"));
  assert.ok(manifest.source_files.some((file) => file.path === "src/release.js"));
  assert.equal(manifest.verifier_results.length, REQUIRED_VERIFIERS.length);
  assert.equal(verification.valid, true, verification.reasons.join("\n"));
  assert.equal(verification.releaseVerified, true);
  assert.equal(verification.trusted, false);
});

test("release CLI verifies and shows a supplied manifest without turning release into trust", () => {
  const cwd = createReleaseRepo();
  const manifest = validManifest(cwd);
  const manifestPath = writeReleaseManifest(manifest, "release-manifest.json", cwd);
  const verified = runCli(cwd, ["release", "verify", "--manifest", manifestPath]);
  const shown = runCli(cwd, ["release", "show", "--manifest", manifestPath]);

  assert.equal(verified.valid, true, verified.reasons.join("\n"));
  assert.equal(verified.hardLaw, "release != trust");
  assert.equal(verified.releaseVerified, true);
  assert.equal(verified.trusted, false);
  assert.equal(shown.releaseExists, true);
  assert.equal(shown.releaseVerified, false);
  assert.equal(shown.trusted, false);
});

test("package version and release tag mismatch is rejected", () => {
  const cwd = createReleaseRepo();
  const manifest = withManifestHash({
    ...validManifest(cwd),
    git_tag: "v0.24.0-protocol-release"
  });
  const result = verifyReleaseManifest(manifest, { cwd });

  assert.equal(result.valid, false);
  assert.match(result.reasons.join("\n"), /package version 0\.25\.0 does not match release tag version 0\.24\.0/);
});

test("missing CLI entrypoint is rejected", () => {
  const cwd = createReleaseRepo();
  const manifest = withManifestHash({
    ...validManifest(cwd),
    cli_entrypoint: "src/missing.js"
  });
  const result = verifyReleaseManifest(manifest, { cwd });

  assert.equal(result.valid, false);
  assert.match(result.reasons.join("\n"), /CLI entrypoint missing/);
});

test("invalid schema JSON is rejected", () => {
  const cwd = createReleaseRepo();
  const manifest = validManifest(cwd);
  writeFileSync(path.join(cwd, "schemas", "clista-release-manifest.schema.json"), "{ invalid json", "utf8");
  const result = verifyReleaseManifest(manifest, { cwd });

  assert.equal(result.valid, false);
  assert.match(result.reasons.join("\n"), /schema JSON parse failed/);
  assert.match(result.reasons.join("\n"), /schema file hash mismatch/);
});

test("missing and failed verifier results are rejected", () => {
  const cwd = createReleaseRepo();
  const missing = withManifestHash({
    ...validManifest(cwd),
    verifier_results: passingVerifierResults().slice(1)
  });
  const failedResults = passingVerifierResults();
  failedResults[0] = { ...failedResults[0], passed: false, exit_code: 1 };
  const failed = withManifestHash({
    ...validManifest(cwd),
    verifier_results: failedResults
  });
  const missingResult = verifyReleaseManifest(missing, { cwd });
  const failedResult = verifyReleaseManifest(failed, { cwd });

  assert.equal(missingResult.valid, false);
  assert.match(missingResult.reasons.join("\n"), /missing verifier result validate/);
  assert.equal(failedResult.valid, false);
  assert.match(failedResult.reasons.join("\n"), /verifier validate did not pass/);
});

test("manifest hash mismatch and source hash mismatch are rejected", () => {
  const cwd = createReleaseRepo();
  const manifestHashMismatch = {
    ...validManifest(cwd),
    package_version: "0.25.1"
  };
  const sourceHashMismatch = validManifest(cwd);
  writeFileSync(path.join(cwd, "src", "release.js"), "module.exports = { changed: true };\n", "utf8");
  const manifestResult = verifyReleaseManifest(manifestHashMismatch, { cwd });
  const sourceResult = verifyReleaseManifest(sourceHashMismatch, { cwd });

  assert.equal(manifestResult.valid, false);
  assert.match(manifestResult.reasons.join("\n"), /manifest_hash mismatch/);
  assert.equal(sourceResult.valid, false);
  assert.match(sourceResult.reasons.join("\n"), /source file hash mismatch: src\/release.js/);
});

test("source commit and tag binding mismatch is rejected", () => {
  const cwd = createReleaseRepo();
  const manifest = withManifestHash({
    ...validManifest(cwd),
    git_commit: "0000000000000000000000000000000000000000"
  });
  const result = verifyReleaseManifest(manifest, { cwd });

  assert.equal(result.valid, false);
  assert.match(result.reasons.join("\n"), /git_commit mismatch/);
  assert.match(result.reasons.join("\n"), /points to .* not 0000000000000000000000000000000000000000/);
});

test("release cannot claim trust, authority, governance approval, amendment approval, or compatibility proof", () => {
  const cwd = createReleaseRepo();
  const manifest = withManifestHash({
    ...validManifest(cwd),
    trusted: true,
    protocolAuthority: true,
    governanceApproval: true,
    amendmentApproval: true,
    compatibilityProof: true
  });
  const result = verifyReleaseManifest(manifest, { cwd });

  assert.equal(result.valid, false);
  assert.match(result.reasons.join("\n"), /release manifest must not claim trust/);
  assert.match(result.reasons.join("\n"), /protocolAuthority must be false or absent/);
  assert.match(result.reasons.join("\n"), /governanceApproval must be false or absent/);
  assert.match(result.reasons.join("\n"), /amendmentApproval must be false or absent/);
  assert.match(result.reasons.join("\n"), /compatibilityProof must be false or absent/);
  assert.equal(result.violations[0].violationType, "release_verification_failure");
});

test("release manifest schema parses", () => {
  const schema = JSON.parse(readFileSync(path.join(root, "schemas", "clista-release-manifest.schema.json"), "utf8"));

  assert.equal(schema.properties.hard_law.const, "release != trust");
  assert.equal(schema.properties.release_verified.const, false);
  assert.equal(schema.properties.trusted.const, false);
});

function validManifest(cwd) {
  return buildReleaseManifest(cwd, {
    tag: releaseTag,
    createdAt: "2026-06-06T00:25:00.000Z",
    verifierResults: passingVerifierResults(),
    runVerifiers: false
  });
}

function passingVerifierResults() {
  return REQUIRED_VERIFIERS.map((item) => ({
    id: item.id,
    command: item.command,
    passed: true,
    exit_code: 0,
    stdout_hash: contentHash(`${item.id}:ok`),
    stderr_hash: contentHash(""),
    output_schema: null,
    error: null
  }));
}

function withManifestHash(manifest) {
  return {
    ...manifest,
    manifest_hash: releaseManifestHash(manifest)
  };
}

function createReleaseRepo() {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "clista-release-"));
  mkdirSync(path.join(cwd, "src"), { recursive: true });
  mkdirSync(path.join(cwd, "schemas"), { recursive: true });
  mkdirSync(path.join(cwd, "docs"), { recursive: true });
  writeFileSync(path.join(cwd, "package.json"), JSON.stringify({
    name: "clista-protocol",
    version: "0.25.0",
    private: true,
    bin: {
      clista: "src/cli.js"
    }
  }, null, 2) + "\n", "utf8");
  writeFileSync(path.join(cwd, "src", "cli.js"), "#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({ schema: 'fixture.cli' }) + '\\n');\n", "utf8");
  writeFileSync(path.join(cwd, "src", "release.js"), "module.exports = { fixture: true };\n", "utf8");
  writeFileSync(path.join(cwd, "schemas", "clista-release-manifest.schema.json"), JSON.stringify({
    schema: "fixture.schema",
    title: "Fixture Release Manifest Schema"
  }, null, 2) + "\n", "utf8");
  writeFileSync(path.join(cwd, "docs", "milestone-25.md"), "release != trust\n", "utf8");
  git(cwd, ["init"]);
  git(cwd, ["config", "user.email", "test@example.com"]);
  git(cwd, ["config", "user.name", "Release Test"]);
  git(cwd, ["add", "."]);
  git(cwd, ["commit", "-m", "fixture release"]);
  git(cwd, ["tag", releaseTag]);
  return cwd;
}

function git(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function runCli(cwd, args) {
  const result = spawnSync("node", [cliPath, ...args], {
    cwd,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

# Milestone 25: Protocol Release

## Theorem

```text
protocol_release = package(verified_runtime, with_reproducible_manifest)
```

## Hard Law

```text
release != trust
```

## Capability

Protocol release produces and verifies a reproducible release manifest for the ClisTa runtime artifact.

The manifest binds package version, Git commit, Git tag, CLI entrypoint, schema files, source file hashes, protocol capability declarations, verifier results, and export-state expectations.

Release verification proves that a specific repository artifact matches its manifest. It does not prove that the release should be trusted.

## Boundary

Release may:

- create a release manifest
- inspect a release manifest
- verify package version and release tag agreement
- verify the Git commit and tag binding
- verify the CLI entrypoint exists and matches `package.json`
- verify schema JSON parses and schema hashes match
- verify source file hashes and release file set
- verify required protocol verifier results are present and passed
- verify capability and verification-layer declarations
- report release boundary violations

Release must not:

- claim trust because a release exists
- create protocol authority
- approve governance
- approve amendments
- prove compatibility by itself
- publish as verification
- omit hashes
- omit verifier results
- silently mutate a release manifest

## Manifest Fields

The release manifest uses `schema: clista.release.manifest.v0`.

Required fields include:

- `release_id`
- `release_protocol_version`
- `protocol_version`
- `package_name`
- `package_version`
- `git_commit`
- `git_tag`
- `created_at`
- `cli_entrypoint`
- `package_manifest`
- `schema_files`
- `schema_set_hash`
- `source_files`
- `file_set_hash`
- `required_verifiers`
- `verifier_results`
- `capability_set`
- `required_verification_layers`
- `export_shape_version`
- `package_artifact_hash`
- `manifest_hash`
- boundary flags set to false: `trusted`, `protocolAuthority`, `governanceApproval`, `amendmentApproval`, `compatibilityProof`, `publishingVerified`, `silentReleaseMutation`

`release_exists` is true in a manifest. `release_verified` is false in a manifest because verification is produced by `clista release verify`.

## Verification Model

`clista release verify` recomputes the manifest hash, package hash, schema hashes, source file hashes, schema JSON parse results, Git commit binding, tag binding, CLI entrypoint binding, capability set, and required verifier status.

It fails when:

- `package.json` version does not match the version encoded by the release tag
- the release tag does not point at the manifest commit
- the manifest commit does not match the local Git HEAD
- the CLI entrypoint is missing or disagrees with `package.json`
- schema JSON does not parse
- schema, source, package, file-set, or manifest hashes mismatch
- any required verifier result is missing or failed
- the manifest claims trust, authority, governance approval, amendment approval, compatibility proof, publishing verification, or silent release mutation

## Relation To Reasoning State

M25 does not add a new reasoning event family.

Release manifests are repository artifacts, not append-only reasoning events. The event log remains the source of truth for reasoning state; release verification binds the runtime that projects and validates that state.

Because release is external to projected reasoning state, `schemas/clista-protocol.schema.json` does not add release records to protocol export. The release manifest has its own schema at:

```text
schemas/clista-release-manifest.schema.json
```

## CLI

```text
clista release manifest [--tag <tag>] [--out <path>]
clista release verify [--manifest <path>] [--tag <tag>]
clista release show [--manifest <path>]
```

`clista release manifest` produces a manifest and can write it with `--out`.

`clista release verify` verifies a supplied manifest or generates and verifies a manifest for the current repository state.

`clista release show` inspects the manifest without turning existence into trust.

## Non-Goals

M25 does not publish packages, add a runtime platform, create governance approval, create protocol authority, prove compatibility by itself, or mutate reasoning state.

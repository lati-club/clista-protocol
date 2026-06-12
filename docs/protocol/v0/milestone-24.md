# Milestone 24: Protocol Recovery

## Theorem

```text
protocol_recovery = restore(valid_state, from_verified_checkpoint_and_repair_log)
```

## Hard Law

```text
recovery != history rewrite
```

## Capability

Protocol recovery records a controlled repair path for trusted projected state after an invalid event, bad packet, failed validation layer, tamper signal, rollback problem, or broken outcome chain.

Recovery repairs trusted projection membership. It does not repair the canonical event log. The original events remain visible in raw event history, exports, validation reporting, and recovery projection.

## Boundary

Recovery may:

- request recovery for a subject
- reference a verified checkpoint
- create a reviewed repair plan
- quarantine unsafe subjects from trusted projection
- apply an append-only repair record
- verify restored recovery-aware state hashes
- record recovery boundary violations

Recovery must not:

- delete events
- replace events
- rewrite event history
- hide invalid history
- perform silent repair
- approve state changes
- approve amendments
- create consensus
- create authority
- mutate governance
- assign accountability scores or blame

## Checkpoints

A recovery checkpoint is a verified state boundary with enough evidence to resume from known-good state.

Supported checkpoint sources:

- verified continuity packet
- verified protocol export with integrity metadata
- accepted federated state reference
- explicit pre-recovery projection boundary

A checkpoint records checkpoint id, checkpoint type, source thread id, protocol version, boundary event id or export time, event log or head hash, projection hash, state hash, verification layer results, evidence, and artifact reference when applicable.

A release or tag name alone is not a checkpoint. It must be paired with hashes and verification state.

## Recovery Subjects

Recovery can reference:

- invalid event
- event hash mismatch
- invalid import or export
- invalid or degraded continuity packet
- failed projection
- failed validation layer
- bad compatibility, interoperability, federation, or negotiation packet
- bad execution rollback
- bad outcome or outcome-learning chain
- tamper evidence
- hash-chain mismatch
- external artifact

Local subjects must exist in prior protocol state. External subjects must include artifact hashes and evidence.

## Review Dependency

`RecoveryRequested` does not require completed M23 review.

`RecoveryPlanCreated` must reference a recovery request and a required or open M23 review for that recovery request.

`RecoveryQuarantined` requires completed M23 review unless `emergency: true`. Emergency quarantine may temporarily exclude a subject from trusted projection, but it must reference a pending M23 review.

`RecoveryApplied` and `RecoveryVerified` require completed M23 review.

Review is still not approval. Completing review records examination; it does not perform recovery.

## Quarantine Semantics

Quarantine means visible but not trusted.

Quarantined subjects:

- remain in raw events
- remain in exports
- remain in recovery projection
- remain visible to validation and integrity reporting
- are excluded only from recovery-aware trusted projected state
- can be superseded by later reviewed recovery records
- are never erased

## Repair and Verification

Recovery replay works as:

1. Read original event log.
2. Verify hash chain and record original validation/integrity status.
3. Project recovery records.
4. Apply quarantine markers to trusted projection material only.
5. Apply reviewed repair records as append-only recovery evidence.
6. Recompute restored projection and state hashes.
7. Verify checkpoint hash, recovery log hash, restored state hash, and review dependency.

The verification record preserves original head hash, recovery log hash, checkpoint hash, restored projection hash, restored state hash, and an explicit `historyRewritten: false` boundary.

## Events

- `RecoveryRequested`
- `RecoveryPlanCreated`
- `RecoveryQuarantined`
- `RecoveryApplied`
- `RecoveryVerified`
- `RecoveryViolationRecorded`

## Projection

Protocol recovery projects to `recovery` state:

- `records`
- `requested`
- `planned`
- `quarantined`
- `applied`
- `verified`
- `violated`
- `pendingReview`
- `emergencyQuarantined`
- `trusted_state_refs`
- `quarantined_subjects`
- `byRecovery`
- `bySubject`
- `plansByRecovery`
- `quarantinesByRecovery`
- `applicationsByRecovery`
- `verificationsByRecovery`
- `violationsByRecovery`
- `recoveryValidationStatus`

`clista validate` does not pretend quarantined history is valid. Recovery-aware trusted state belongs to recovery projection and `clista recovery verify`.

## CLI

```text
clista recovery request --thread <threadId> --subject <subjectId> --reason <reason>
clista recovery plan --recovery <recoveryId> --plan <plan>
clista recovery quarantine --recovery <recoveryId> --reason <reason> [--emergency true]
clista recovery apply --recovery <recoveryId> --summary <summary>
clista recovery verify [--recovery <recoveryId>]
clista recovery list
clista recovery show <recoveryId>
```

Read-only recovery commands accept `--events <path>`.

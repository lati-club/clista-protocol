# Milestone 20: Protocol Execution

## Theorem

```text
protocol_execution = perform(authorized_action, under_verified_constraints)
```

## Hard Law

```text
execution != intent
```

An action is not complete because an actor intended it, claimed it, or was authorized to do it.

An action is complete only when execution evidence satisfies the authorized scope and protocol constraints.

## Boundary

Execution records performed action. It does not create authorization, consensus, governance approval, amendment approval, or governance merger.

Allowed:

- record execution start
- record execution completion
- record execution failure
- record execution rollback
- record execution violation
- bind execution to a decision or delegation
- verify actor accountability
- verify scope and constraints
- require completion evidence
- project execution status

Forbidden:

- execution as authorization
- execution as consensus
- execution as governance approval
- execution without evidence
- execution outside authority
- silent completion
- silent failure
- silent rollback
- completion by assertion only

## Event Types

```text
ExecutionStarted
ExecutionCompleted
ExecutionFailed
ExecutionRolledBack
ExecutionViolationRecorded
```

Completion evidence is required on `ExecutionCompleted`. Evidence is stored on the execution record instead of a separate evidence event in M20.

## State

Execution projection includes:

```text
execution:
  records
  active
  completed
  failed
  rolled_back
  violated
```

Each execution record includes:

- `id`
- `threadId`
- `actorId`
- `authorizationRef`
- `delegationId` when delegated
- `decisionId` when decision-authorized
- `actionType`
- `scope`
- `constraints`
- `status`
- lifecycle timestamps
- `evidence`
- `violations`
- attribution back to actor and authorization

## Validation

ClisTa rejects execution when:

- execution actor is not a known participant
- execution actor does not match the event actor
- execution references an unknown decision or delegation
- decision execution references a non-approved decision
- decision execution is outside decision scope
- delegated execution actor does not match the accountable delegate
- delegated execution is outside granted action or scope
- delegated execution omits delegation limits from constraints
- execution starts or completes after delegation revocation or expiration
- completion lacks evidence
- failure lacks an explicit reason
- rollback lacks a prior completed or failed execution
- rollback lacks evidence
- execution creates authority, consensus, governance approval, amendment approval, or governance merger

## CLI

```text
clista execution start
clista execution complete
clista execution fail
clista execution rollback
clista execution list
clista execution show <executionId>
clista execution verify
```

## Continuity

M20 adds execution to the continuity capability set and required verification layers.

Continuity packets carry `execution_state` and `executionValidationStatus`.

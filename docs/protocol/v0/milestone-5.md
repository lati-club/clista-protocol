# Milestone 5: Protocol Merges

## Acceptance Criteria

ClisTa must reconcile divergent reasoning without erasing dissent.

The theorem is:

```text
consensus_candidate = merge(parent_state, fork_state)
```

Given only:

```text
.clista/events.ndjson
```

ClisTa can reconstruct:

```text
parent reasoning state -> fork reasoning state -> merge request -> reviewed merge -> completed integration
```

## Required Commands

```text
clista merge open --source <forkThreadId> --target <threadId> --summary <summary>
clista merge review --request <mergeRequestId> --status approve|request_changes|reject --summary <summary>
clista merge conflict declare --request <mergeRequestId> --type assumption|claim|evidence|objection|decision|outcome --parent <objectId> --fork <objectId> --summary <summary>
clista merge conflict resolve --request <mergeRequestId> --conflict <conflictId> --resolution accept_parent|accept_fork|preserve_both|supersede|reject_fork --rationale <rationale>
clista merge eligibility --request <mergeRequestId>
clista merge complete --request <mergeRequestId>
```

## Required Events

- `MergeRequestOpened`
- `MergeReviewSubmitted`
- `MergeConflictDeclared`
- `MergeConflictResolved`
- `MergeCompleted`

## Required Projection

`clista state show --thread <threadId>` must expose:

- merge requests targeting the thread
- merge requests sourced from the thread
- proposed fork objects
- merge reviews
- conflicts
- conflict resolutions
- merge eligibility
- completed merge records
- accepted fork objects in target state after completion
- preserved dissent
- rejected fork objects in merge audit only

## Required Validation

ClisTa rejects merge logs when:

- the source fork is unknown
- the target thread is unknown
- the source fork is not descended from the target thread
- merge completion occurs before a merge request exists
- merge completion has unresolved conflicts
- merge completion has unresolved `request_changes` review
- merge completion actor lacks `decision_owner` authority on the target thread
- merge completion drops blocking objections without preservation or explicit rejection rationale
- a merge request is completed more than once
- accepted or rejected object IDs do not exist in source fork state
- a conflict resolution references an unknown conflict

## Boundary

This is governed integration only.

It does not add:

- automatic conflict resolution
- UI
- agents
- network behavior
- reputation
- graph database
- search
- analytics

## Theorem

Forks prove divergent reasoning without parent mutation.

Merges prove governed integration without dissent erasure.

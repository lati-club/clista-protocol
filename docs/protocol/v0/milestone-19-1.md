# Milestone 19.1: Delegation Actor Boundary Clarification

## Theorem

```text
delegated_actor_identity = bind(delegate_reference, accountable_protocol_actor)
```

## Hard Law

```text
non_participant_delegate != unattributed_actor
```

M19.1 clarifies who counts as the actor behind delegated action.

Delegation may name a delegate type of `participant`, `agent`, `tool`, or `context`.

Delegate type is not an actor exemption. A delegate that can record delegated action must resolve to an accountable protocol actor.

For this milestone, accountable protocol actor means a known participant record.

## Required Boundary

Participant delegates must reference known participants.

Agent delegates must reference known participants with `kind: agent`.

Tool delegates must reference known participants with `kind: tool` or `kind: system`.

Context delegates must reference known participants with `kind: system`.

Context delegation does not make a context itself an actor. A context delegate is represented by an accountable system participant until a separate actor registry exists.

## Required Action Attribution

A delegated action must be recorded by the accountable delegate.

`DelegatedActionRecorded.actor_id` must match `delegatedAction.delegateId`.

The delegated action must preserve attribution back to:

- the delegate participant
- the delegation grant
- the delegated action

## CLI Rule

`clista delegation grant` declares the delegate as a participant for every delegate type.

Default delegate participant kinds are:

- `participant` -> `human`
- `agent` -> `agent`
- `tool` -> `tool`
- `context` -> `system`

`--delegate-kind` may override the default, but validation rejects incompatible type/kind combinations.

## Rejected States

ClisTa rejects delegation when:

- a grant references an unknown delegate participant
- an agent delegate is not a participant with `kind: agent`
- a tool delegate is not a participant with `kind: tool` or `kind: system`
- a context delegate is not a participant with `kind: system`
- a delegated action is recorded by an actor other than the accountable delegate
- a delegated action lacks attribution to the delegate and delegation

## Non-Goals

M19.1 does not create a second actor registry.

M19.1 does not add tool execution.

M19.1 does not authorize context mutation.

M19.1 does not create agent autonomy.

M19.1 preserves:

- the M19 theorem
- `delegation != authority surrender`
- the 0.19.0 continuity and exchange boundary
- compatibility with 0.18.0 continuity packets


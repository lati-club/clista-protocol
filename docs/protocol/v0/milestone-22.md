# Milestone 22 - Protocol Learning from Outcomes

## Theorem

```text
protocol_outcome_learning = derive(adaptation_signal, from_evaluated_outcome)
```

## Hard Law

```text
learning != retroactive justification
```

## Core Rule

The protocol may learn from evaluated outcomes, but it may not rewrite the reasoning that produced them.

M22 learning is distinct from M12 pattern learning. M12 derives pattern-level signals from decision outcome audits. M22 records explicit learning signals from M21 protocol outcomes after those outcomes have been evaluated with evidence.

## Boundary

Allowed:

- derive learning signal from evaluated outcome
- record lesson learned
- identify confirmed or failed assumptions
- recommend future constraints
- recommend future amendments
- link learning to outcome evidence
- preserve original reasoning state
- project learning state

Forbidden:

- retroactive justification
- rewriting prior rationale
- rewriting intended effect
- silently changing governance
- silently changing authority
- learning from unevaluated outcome
- treating one outcome as universal truth
- turning failure into success after the fact

## Events

- `LearningSignalDerived`
- `LessonRecorded`
- `LearningDisputed`
- `LearningViolationRecorded`

## CLI

```text
clista outcome-learning derive --outcome <outcomeId> --lesson <lesson>
clista outcome-learning lesson --signal <learningSignalId> --lesson <lesson>
clista outcome-learning dispute --learning <learningId> --reason <reason>
clista outcome-learning violation --learning <learningId> --type <violationType> --reason <reason>
clista outcome-learning list
clista outcome-learning show <learningId>
clista outcome-learning verify
```

## Validation

ClisTa rejects outcome learning when:

- the referenced outcome has not been evaluated
- the learning record references an unknown outcome or execution
- the learning actor is not an accountable participant
- the recorded evaluation result differs from the evaluated outcome
- the learning record rewrites intended effect
- the learning record mutates authority or governance
- the learning record treats one outcome as universal truth
- the learning record recasts a failed outcome as success

## Projection

Projected outcome learning state includes:

- `signals`
- `lessons`
- `disputes`
- `violations`
- `bySignal`
- `byLesson`
- `lessonsBySignal`
- `disputesByLearning`
- `violationsByLearning`
- `signalsByOutcome`
- `lessonsByOutcome`

Outcome learning is exported in protocol state and continuity packets as `outcomeLearning` / `outcome_learning_state`.

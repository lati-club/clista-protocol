# Milestone 11: Protocol Learning

## Acceptance Criteria

ClisTa must learn from outcomes by deriving pattern-level signals from reasoning state.

The theorem is:

```text
protocol_learning = update(reasoning_patterns, outcome_evidence)
```

The hard law is:

```text
learning != reputation
```

## Boundary

Provenance answers:

```text
Where did this contribution come from, and how did it enter state?
```

Learning answers:

```text
Which reasoning patterns produced which outcome evidence under which conditions?
```

Learning does not answer:

```text
Who should be trusted more?
```

This milestone is improvement, not reputation.

## Required Projection

Projection must expose:

- learning patterns
- learning signals
- outcome correlations
- assumption reviews
- objection reviews
- evidence reviews
- governance reviews
- revisit recommendations
- learning validation status

Learning signals must include:

- pattern
- related contributions
- outcome references
- finding
- confidence
- generated source events where available
- `actorScoring: false`
- `sourceScoring: false`
- `modelRanking: false`
- `authorityMutation: false`

## Required Events

Milestone 11 supports explicit learning events:

- `LearningSignalRecorded`
- `PatternObservationRecorded`
- `OutcomeReviewRecorded`
- `LearningRecommendationRecorded`

The first proof does not require a separate command to append these events. Derived learning remains deterministic from the append-only log.

## Required Commands

```text
clista learning review
clista learning list
clista learning show <learningId>
clista learning verify
```

## Required Validation

ClisTa rejects learning logs when:

- learning signals reference unknown or future contributions
- learning signals reference unknown or future outcomes
- learning signals reference unknown or future provenance
- learning signals omit uncertainty
- learning signals include participant scores
- learning signals include source scores
- learning signals include model rankings
- learning signals include agent rankings
- learning signals include reputation fields
- learning recommendations mutate governance authority automatically

## Examples

Valid learning:

```text
pattern: assumption_with_evidence_provenance_failed
finding: Assumption asm_capacity was marked failed by outcome out_growth.
confidence: medium
actorScoring: false
sourceScoring: false
modelRanking: false
authorityMutation: false
```

Invalid learning:

```text
participantScore: 0.42
sourceScores: {"Launch plan": 0.2}
modelRanking: true
authorityMutation: true
```

## Anti-Goal

Learning is not reputation.

Learning says:

```text
This reasoning pattern correlated with this outcome evidence.
```

It does not say:

```text
This participant, source, model, or agent deserves a trust score.
```

Milestone 11 does not add reputation, trust scores, participant scoring, source scoring, model ranking, agent ranking, automatic authority changes, automatic governance mutation, semantic search, network learning, distributed consensus, graph databases, UI, or agents.

## Audit Rationale

Integrity makes history trustworthy.

Identity makes actors accountable.

Attribution makes contributions accountable.

Provenance makes lineage auditable.

Learning makes reasoning improvable.

The guardrail:

```text
ClisTa learns from reasoning patterns, not from ranking people.
```

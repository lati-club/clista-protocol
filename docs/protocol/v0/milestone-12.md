# Milestone 12: Protocol Adaptation

## Acceptance Criteria

ClisTa must recommend governance review from learning signals without mutating governance automatically.

The theorem is:

```text
governance_adaptation = recommend(governance_review, learning_signals)
```

The hard law is:

```text
adaptation != governance mutation
```

## Boundary

Learning answers:

```text
Which reasoning patterns produced reliable or unreliable outcomes?
```

Adaptation answers:

```text
Which governance rules should be reviewed because of what learning revealed?
```

Adaptation does not answer:

```text
What governance rules are now changed?
```

Actual governance changes still belong to explicit authorized governance events.

## Required Projection

Projection must expose:

- adaptation recommendations
- adaptation reviews
- governance review recommendations
- evidence requirement review recommendations
- revisit trigger review recommendations
- decision gate review recommendations
- provenance requirement review recommendations
- objection-resolution review recommendations
- outcome window review recommendations
- adaptation validation status

Adaptation recommendations must include:

- recommendation type
- pattern
- related learning signals
- related learning patterns
- related contributions
- finding
- recommendation
- confidence
- generated source events where available
- `authorityMutation: false`
- `governanceMutation: false`
- `ruleMutation: false`
- `thresholdMutation: false`
- `participantScoring: false`
- `sourceScoring: false`
- `modelRanking: false`

## Required Events

Milestone 12 supports explicit adaptation events:

- `AdaptationReviewRecorded`
- `GovernanceReviewRecommended`
- `EvidenceRequirementReviewRecommended`
- `RevisitTriggerReviewRecommended`
- `DecisionGateReviewRecommended`

Derived adaptation remains deterministic from projected learning state.

## Required Commands

```text
clista adaptation review
clista adaptation list
clista adaptation show <adaptationId>
clista adaptation verify
```

## Required Validation

ClisTa rejects adaptation logs when:

- recommendations reference unknown or future learning signals
- recommendations reference unknown or future contributions
- recommendations reference unknown or future outcomes
- recommendations omit uncertainty
- recommendations include participant scores
- recommendations include source scores
- recommendations include model rankings
- recommendations include agent rankings
- recommendations automatically change authority
- recommendations automatically change governance rules
- recommendations automatically modify thresholds

## Examples

Valid adaptation:

```text
recommendationType: evidence_requirement_review
pattern: review_evidence_requirements_for_failed_assumptions
finding: Learning signal lrn_capacity indicates an assumption failed under outcome evidence.
recommendation: Review evidence requirements for assumptions used in this decision gate.
confidence: medium
governanceMutation: false
authorityMutation: false
ruleMutation: false
thresholdMutation: false
```

Invalid adaptation:

```text
authorityMutation: true
governanceMutation: true
ruleMutation: true
thresholdMutation: true
participantScore: 0.42
sourceScores: {"Launch plan": 0.2}
modelRanking: true
```

## Anti-Goal

Adaptation is not governance mutation.

Adaptation says:

```text
This learning signal recommends governance review.
```

It does not say:

```text
This governance rule is now changed.
```

Milestone 12 does not add automatic authority changes, automatic decision-rule changes, automatic threshold updates, participant promotion or demotion, source trust scoring, model ranking, agent ranking, semantic search, network learning, distributed consensus, graph databases, UI, or agents.

## Audit Rationale

Integrity makes history trustworthy.

Identity makes actors accountable.

Attribution makes contributions accountable.

Provenance makes lineage auditable.

Learning makes reasoning improvable.

Adaptation makes governance review recommendable without making governance mutable by inference.

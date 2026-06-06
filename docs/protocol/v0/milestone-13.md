# Milestone 13: Protocol Amendments

## Acceptance Criteria

ClisTa must support explicit, auditable protocol amendments authorized by governance authority.

The theorem is:

```text
authorized_protocol_change = approve(amendment, governance_authority)
```

The hard law is:

```text
recommendation != amendment
```

## Boundary

Learning produces signals.

Adaptation recommends review.

Amendments authorize change.

Governance validates authority.

Integrity preserves the record.

M12 answers:

```text
This should be reviewed.
```

M13 answers:

```text
This was reviewed, authorized, and amended.
```

M13 does not answer:

```text
This recommendation changed governance by itself.
```

## Required Projection

Projection must expose:

- proposed amendments
- pending amendments
- active amendments
- rejected amendments
- superseded amendments
- amendment reviews
- amendment approvals
- amendment rejections
- amendment supersessions
- amendment history by amendment
- amendment validation status

Approved amendments become active only after an explicit approval event by active governance authority.

Rejected amendments and superseded amendments remain auditable but do not alter active protocol state.

## Required Events

Milestone 13 supports:

- `ProtocolAmendmentProposed`
- `ProtocolAmendmentReviewed`
- `ProtocolAmendmentApproved`
- `ProtocolAmendmentRejected`
- `ProtocolAmendmentSuperseded`

## Required Commands

```text
clista amendment propose
clista amendment list
clista amendment show <amendmentId>
clista amendment verify
```

## Required Validation

ClisTa rejects amendment logs when:

- an amendment references unknown or future source events
- an amendment references unknown or future explicit learning signals
- an amendment references unknown or future explicit adaptation recommendations
- approval references an unknown, rejected, approved, or superseded amendment
- rejection references an unknown, approved, rejected, or superseded amendment
- supersession references an unknown replacement amendment
- supersession targets an amendment that is not approved
- approval lacks active governance authority
- rejection lacks active governance authority
- supersession lacks active governance authority
- an amendment attempts implicit mutation
- an amendment attempts automatic activation
- an amendment attempts hidden policy mutation
- an amendment rewrites past event validity

## Examples

Valid amendment:

```text
amendmentType: evidence_threshold
target: docs/protocol/v0/governance.md#evidence
rationale: Adaptation recommended reviewing evidence requirements after failed outcomes.
proposedChange: Future decision gates require two independent evidence references for capacity claims.
effectScope: future_only
automaticAmendment: false
implicitMutation: false
retroactiveMutation: false
recommendationBecomesAmendment: false
```

Invalid amendment:

```text
automaticAmendment: true
implicitMutation: true
retroactiveMutation: true
rewritesPastEvents: true
recommendationBecomesAmendment: true
```

## Anti-Goal

Amendments are not implicit mutation.

Recommendations do not become amendments automatically.

Approved amendments do not rewrite old events. They affect future validation or governance behavior unless explicitly marked as interpretive guidance.

Milestone 13 does not add automatic amendment application, hidden policy mutation, authority changes without governance validation, retroactive event rewriting, UI, agents, network learning, graph databases, semantic search, distributed consensus, signatures, OAuth/login, reputation, participant scoring, source scoring, or model ranking.

## Audit Rationale

Integrity makes history trustworthy.

Identity makes actors accountable.

Attribution makes contributions accountable.

Provenance makes lineage auditable.

Learning makes reasoning improvable.

Adaptation makes improvement governable.

Amendments make governance change explicit.

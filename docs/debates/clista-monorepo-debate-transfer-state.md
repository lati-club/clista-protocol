# ClisTa Transfer State — Monorepo/Trunk vs Polyrepo Debate

**Date closed:** 2026-06-06
**Team:** clista-monorepo-debate (PROPOSER vs SKEPTIC, LEAD as referee) — terminated and cleaned up
**Topic:** Should a 12-person startup with one product run a single trunk-based monorepo, or split into per-service polyrepos?
**Core law:** Conversation is input. Reasoning state is output.

---

## DECISION

**MONOREPO/TRUNK** — as amended (Round 0 design + AMENDMENTS 1–16, +11b/12b). Both parties on record: amendments are load-bearing, not cosmetic. SKEPTIC would still vote against the un-amended Round 0 design.

**Decision state:** PROCEED, gated on Wk4 go/no-go checkpoint.

## FINAL LEDGER

S1–S16 → **12 RESOLVED** (S1, S4, S5, S7, S8, S9b, S10, S11, S13, S14, S15, S16), **4 CONVERTED_TO_RESIDUAL_RISK** (S2, S3, S6, S9a), **0 STILL_OPEN, 0 BLOCKING**. Early-stop fired at Round 4.

## VERIFIED REASONING (survived adversarial review)

- Source-level atomicity (one PR/review/revert) is a recurring weekly win; *production* atomicity was killed — skew handled by mechanism instead (see below)
- Single dependency graph + all-consumer validation at PR time
- CI cost scales with diff: pruned per-package lockfile hashing verified (SKEPTIC conceded its counter-premise); 15% world-rebuild tripwire armed
- Senior review-minutes ≤ polyrepo SDK-versioning cost (SKEPTIC conceded)
- Safety lives in mechanisms, not discipline:
  - N±1 contract compatibility gate (buf/oasdiff) checked against compat-baseline SET = {current prod sha, previous prod sha, in-flight staging sha} — oldest member
  - All queue payloads proto-typed; raw publish/consume APIs lint-banned outside packages/sdk
  - DB: squawk expand/contract linter + /contracts/db-ownership.yaml compiled to per-service Postgres roles (default-deny, regen==committed in Tier 0) + nightly pg_stat_statements diff in staging
  - Flags: flags.yaml baked at deploy; ACTIVATION flips ride full pipeline; KILL flips via runtime-override ConfigMap + kubectl break-glass (~2 min, CI-independent); flag_override_active gauge (1h WARN / 24h PAGE); promotion refused on active override without incident-exception annotation; CI BLOCK on expired flags
  - Tier 2 freezes scoped by static journey→service map, verified by nightly HAR-capture diff (24h staleness bound)
  - Flake quarantine: CODEOWNER triage, 48h SLA, FLAKY_PRODUCT→P2; auto-delete withdrawn; inflow/outflow tracked
  - Go CI: full go.work build+test every PR (paths-filter withdrawn); >4 min p50 trailing-week → DRI'd affected-detection work
  - Remote cache CI-write-only via OIDC; laptops read-only (supply-chain hole closed)
  - Budgets report-only Wks 1–4 → enforcing at Wk4 checkpoint
- Migration: 6 weeks, named infra-pair DRI at 50%; merge queue + branch protection day one; Wk4 OPERATE checkpoint (end-state trial) precedes Wk5 irreversible dedup; pre-written subtree-split rollback

## KEY TRADEOFFS (accepted costs, not solved problems)

1. Chose source-atomicity over production-atomicity because deploy skew exists in every topology; N±1 gate handles it mechanically.
2. Chose one shared repo over least-privilege source access because per-repo scoping at 12 people is mostly notional — accepting R5.
3. Chose brute-force full Go builds over affected-detection elegance — accepting wall-time growth until the 4-min tripwire.
4. Chose a scoped shared Tier 2 e2e gate over fully independent pipelines — accepting R4 (web+api coupling).
5. Chose baked-config flags + break-glass over a runtime flag service — accepting a Stage-2 managed-provider migration when percentage rollouts arrive (triggers: first % rollout need; >2 break-glass/30d; >25 standing flags).

## UNRESOLVED RISKS (residual register — priced, none blocking)

| ID | Risk | Bound/Status |
|----|------|--------------|
| R1 | Turborepo cache-invalidation sharp edges | 15% world-rebuild tripwire |
| R2 | Repo-level outage correlation | unmitigated, accepted |
| R4 | web+api effective shared Tier 2 gate | 24h HAR staleness loop |
| R5 | Correlated credential blast radius | conceded to SKEPTIC; narrowed by per-service DB creds; SKEPTIC judges it overpriced at this team size |
| R6 | Semantic breaks beyond typed+shape surface | shared by both topologies; polyrepo handles worse |

## BLOCKED ITEMS

- Final adoption: blocked on Wk4 go/no-go (inputs: org migration track record, world-rebuild baseline metric)
- Destructive DB migration phases: blocked on zero-codebase-reference check + all-readers-past-baseline deploy check
- Hybrid carve-out (R3): triggered only if A4 (no compliance boundary) proves false

## REQUIRED ARTIFACT CHECKS (DRI-owned, dated)

1. Coupling-channel inventory — Wk2 deliverable (fraction of cross-service coupling through /contracts)
2. Org migration track record — Wk4 go/no-go input
3. World-rebuild PR fraction + merge-queue p95 — report-only baseline Wks 1–4
4. SEV1 tabletop on a 3-service change — Wk6 exit criterion (record minutes-to-mitigation per rollback path)
5. Historical cross-service order-independence audit (S2)
6. E1: actual CI times / repo LOC vs ≤500k assumption
7. A4 check: confirm no compliance isolation boundary exists

## AUTHORITY BOUNDARY

Authorized: repo topology + development/release process design for the stated context (12 eng, one product, ~4–8 services, TS+Go, single cloud).
NOT authorized: actual adoption (Wk4 gate), headcount/DRI allocation, vendor procurement, compliance posture if A4 false, anything contingent on a second product line (K1 re-opens the question).

## DEBATE INTEGRITY

Real. SKEPTIC killed or weakened 9+ PROPOSER claims (prod-atomicity, flake auto-delete, laptop-writable cache supply-chain hole, in-house flag SDK, migration sequencing, global freeze, flag fast-path, self-reported DB map, "rare" world-rebuilds). PROPOSER won back 3 (world-rebuild lockfile premise, ownership-bottleneck senior-minutes, "polyrepo seams enforce awareness" — all formally conceded by SKEPTIC). Adversary's closing verdict endorsed the amended design while opposing Round 0.

## ADVERSARY'S CAVEAT (condition on the verdict)

> "The design's safety now lives in the artifact queue (Wk2 coupling inventory, Wk4 go/no-go, Wk6 SEV1 tabletop) — if those slip, the residual register is understated and this endorsement should be revisited."

## NEXT RECOMMENDED ACTION

Name the infra-pair DRI at 50%, calendar the Wk4 go/no-go at kickoff, begin Wk1: repo skeleton + largest-repo import (git subtree w/ history) + merge queue and branch protection enforcing on day one, budgets report-only.

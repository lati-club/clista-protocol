# ClisTa Transfer State — AI Support Assistant Launch Debate

**Date closed:** 2026-06-07
**Team:** clista-launch-debate (LAUNCH_ADVOCATE vs SECURITY_SKEPTIC vs PRODUCT_OPERATOR, LEAD as referee) — terminated and cleaned up
**Topic:** 15-person startup, AI customer-support assistant (reads help docs, summarizes tickets, drafts replies, escalates high-risk). Launch a 30-day limited external beta, delay, or internal-only first?
**Core law:** Conversation is input. Reasoning state is output.

---

## DECISION

**HYBRID — shadow-first external beta** (opening proposal + AMENDMENTS AM1–AM22 + Pin 1 + Note 2 + AM21(b) condition; amendments are load-bearing — both critics on record against the un-amended Round 0 plan).

Timeline: Days 1–14 build + gates (counsel sub-gate Day 2, volume pull Day 3, cohort frozen Day 12, go/no-go Days 13–14) → Days 15–19 SHADOW (full pipeline on live wave-1 traffic, outputs visible to no one) → Day 20 human-assisted external traffic → Day 30 operational review → **Day 45 exit adjudication**. Valid at n=4 tenants (10 stretch). **Gates bind at SHADOW start** (shadow sends real PII to the vendor): gates slip ⇒ shadow slips.

**Decision state:** PROCEED — conditional on the ten-artifact go/no-go packet. Internal-only and 90-day delay rejected by all three parties.

## FINAL LEDGER

SS1–SS12 + PO1–PO17 → **all closed; zero STILL_OPEN, zero contested.**
- 6 blockers → agreed artifact gates: SS2 (subprocessor/DPA chain), SS3 (vendor DPA), SS4⋈PO3 (canaries + auto-kill drill — one artifact, two separately-logged assertions), SS7 (IR runbook), PO2 (staffing ledger), + Day-2 counsel sub-gate
- Conditionals under pre-agreed auto-rules (no renegotiation): SS8 (log-ACL check Days 1–3, auto-escalates to BLOCKING if failed), AM12 (scorer-slip regime: 40% sampling, caps halved 200→100/40→20, wave freeze)
- Early-stop fired with both critics at zero

## VERIFIED REASONING (survived adversarial review)

- **Internal-only at 15 people is a simulation of a beta** — one tenant, no isolation pressure, statistically empty metrics. Three-party consensus; the operator entered prepared to argue internal-only and reversed on the merits.
- **C2: human-gated, generate-only** (no auto-send, no tools, no write access) converts catastrophic failures into caught-in-queue incidents — survived intact, anchored everything.
- Safety lives in mechanisms, not discipline:
  - K1 canary egress → **automatic feature kill, no human in loop** (at 15 people there is no 2am on-call; "page on-call" was fiction); drill must prove detection-fired AND auto-disable-executed separately
  - Per-tenant honeytoken TICKETS + 2 synthetic dark tenants + egress scanning (original canaries watched the wrong surface — public docs, not the ticket-fetch path)
  - Escalation rules ingest RAW ticket text only; classifier may only ADD; tier routing deterministic rule-class-based; recall = floor, precision tuned by routing only; shadow-calibrated escalation budget + fatigue tripwire
  - ALL internal notes excluded from model context (allowlist, not flag-denylist); deterministic PII redaction
  - Anti-rubber-stamp: citation-open-or-edit + ≥15s dwell + complexity-conditioned tripwire; auto-expiries logged, ≥2 unreviewed in a wave window = staffing-failure signal invoking "scope, not heroics" (AM21(b))
  - Metrics: only the randomized-holdout delta CITABLE for GA; absolute M1 directional w/ 10–15-pt friendly-bias discount; sample floor ≥300 drafts/≥3 agents/≥4 tenants; thresholds pre-registered before numbers exist; M3 clock starts only when groundedness scorer live
  - Log store: ACL ≤6 named people, read-logged, legal-hold; exit report snapshots exemplar triples before 30-day purge (Note 2)
  - Reversibility: feature fully additive; kill = pre-beta UI; banner teardown on same flag; tenant lifecycle doc (enter/pause/kill/exit/no-GA wind-down)

## AMENDMENTS (AM1–AM22, load-bearing)

AM1 dwell+tripwire · AM2 Day-21 rubric · AM3 DPA cure plan + Day-2 counsel sub-gate · AM4 per-tenant honeytoken tickets + dark tenants · AM5 independent red-team · AM6 allowlist context · AM7 groundedness scorer gates M3 · AM8 IR runbook/IC/tabletop · AM9 log-store controls · AM10 raw-text escalation floor (or S4 doesn't ship) · AM11 authenticated-users-only + legal-before-signing · AM12 scorer-slip compensating regime · AM13 named-person staffing ledger (carries QA load, honeytoken owner, coaching owner, shadow-analysis owner) · AM14 K1 auto-kill · AM15 holdout + Day-8 windows + sample floor · AM16 n=4 validity + written intent ≥6 by Day 7 · AM17 escalation budget + tiered interruption · AM18 shadow phase · AM19 Day-45 adjudication ("lengthened measurement, not slippage") · AM20 tenant lifecycle + banner-on-kill-flag · AM21 tripwire refinements + cosmetic-edit detection (arms race, under R2) · AM22 "missing internal context" rejection taxonomy

## ACCEPTED TRADEOFFS

1. Chose shadow-first over immediate assisted traffic — first contact with adversarial input is a logged event, not customer-facing; cost: 5 days of assist-mode data.
2. Chose Day-45 adjudication over the Day-30 headline — 9 days of wave-3 data is synthetic confidence (advocate's own concession); cost: slower GA decision.
3. Chose allowlist context over draft quality — flag-denylists rot silently; cost: measurably worse drafts (instrumented via AM22).
4. Chose automatic kill over human judgment in the loop — no 2am human exists; cost: false-positive kills (only drafts lost — feature is additive).
5. Chose n=4 validity over 10-tenant ambition — counterparty DPA review takes 2–6 weeks; cost: weaker statistical power, priced into exit criteria.

## RESIDUAL RISKS (priced, carried in all exit reporting as open)

| ID | Risk | Pricing |
|----|------|---------|
| R1 | Prompt injection — mitigated (no tools/auto-send, canaries), not eliminated | standing |
| R2 | Rubber-stamping + ungated summary/escalation asymmetry + cosmetic-edit arms race | instrumented, monitored-not-solved |
| R3 | Outside-counsel bandwidth = critical path | Day-2 sub-gate as slip signal |
| R4 | Design-partner friendly bias | 10–15-pt M1 discount at GA; symmetric caution on understated injection pressure |

## BLOCKED ITEMS

- ALL external traffic (shadow included) until the six gates lift on artifacts at Day 13–14
- M3 citation until scorer live full-window; M1/M2 citation until holdout + sample floor
- Wave expansion during scorer-slip (AM12 freeze) or escalation-budget breach
- GA decision until Day-45 adjudication on citable instruments

## ARTIFACT VERIFICATION REQUIRED (go/no-go packet)

1. Executed vendor DPA w/ true retention window (SS3)
2. Signed beta addenda naming vendor as subprocessor + frozen cured-DPA tenant list; counsel engaged by Day 2 (SS2)
3. Independent tenant-scoping red-team report w/ negative tests — forged tenant ID, IDOR (SS4)
4. Live per-tenant honeytoken tickets + drill proving detection→AUTO-KILL end-to-end, two separately-logged assertions (SS4⋈PO3)
5. IR runbook: named IC, breach decision tree, notification clocks per strictest tenant DPA, logged tabletop (SS7)
6. Named-person staffing ledger: hours, double-bookings explicit, shadow-analysis owner, honeytoken owner, coaching owner, unchanged non-beta SLA coverage (PO2)
7. Alert→action map (auto-act vs page vs ticket) + drill logs (PO3)
8. Holdout + sample-floor design doc; pre-registered thresholds (PO4)
9. Trailing-90-day volume pull, total AND authenticated-only — DECIDES THE CALENDAR (PO5)
10. Tenant lifecycle doc incl. no-GA wind-down; banner wired to kill flag (PO10)
Plus: log-ACL check Days 1–3 (SS8) · groundedness scorer eval (SS6) · exit-report template w/ Note 2 snapshot line + R4 discount

## AUTHORITY BOUNDARY

Decided here: launch shape, gating structure, measurement design. NOT decided here: actual go/no-go (belongs to the Day 13–14 checklist read against real artifacts), vendor selection/contract terms, headcount allocation, GA (Day-45 adjudication), pricing/packaging, regulated-industry tenants (excluded from beta entirely).

## ADVERSARY CAVEAT (SECURITY_SKEPTIC)

"I endorse this decision only if external traffic — shadow included — starts strictly after the Day 13–14 go/no-go verifies, as existing artifacts and not promises: the executed vendor DPA; signed addenda + frozen cured-DPA list with counsel confirmed by Day 2; the independent tenant-scoping report with live honeytokens and one drill proving detection→AUTOMATIC kill with no human in the loop; the IR runbook with clocks and a logged tabletop — and only if the pre-agreed conditional rules execute without renegotiation, the four residuals are carried in all exit reporting as open and priced, and any gate artifact missing on Day 14 moves the date, not the bar."

## OPERATOR CAVEAT (PRODUCT_OPERATOR)

"This is operationally safe only if the controls exist as staffed realities rather than documents — the staffing ledger closes with named humans and real hours; K1 containment is machine-speed because at 15 people there is no 2am human; all gates bind at shadow start since shadow sends real PII to the vendor; the Day-2 and Day-3 signals are allowed to move the date — the calendar obeys the artifacts, never the reverse; metrics are cited only with holdout live and floor met; and Day 45 is defended internally as lengthened measurement, not slippage — by everyone, including the people who wanted Day 30."

## DEBATE INTEGRITY

Real. Skeptic killed four launch claims (canary placement, DPA timeline, breach process, retention language); operator killed two more that survived the security pass (dead-pager kill latency, unstaffed controls). Advocate won back its central thesis (external > internal-only) from both critics — one of whom entered intending to argue the opposite — and conceded six blockers + its own Day-30 adjudication as "synthetic confidence by my own definition."

## NEXT RECOMMENDED ACTION

Name the gate owners and start the two clocks that tell the truth earliest: counsel engagement (Day 2) and the trailing-90-day volume pull (Day 3). If either signal says the date moves, the date moves — the bar does not.

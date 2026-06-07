# ClisTa Debate Prompt Pack v0.1 (Stage 0)

A distributable pattern for running a structured, adversarial decision debate with AI agents —
any vendor, any harness, or humans. Output: a decision you can defend, in a ledger you can hand
to a successor. No tooling required; one markdown file is the whole artifact (see
`LEDGER_TEMPLATE.md`).

**Core law:** Conversation is input. Reasoning state is output.
**Operating model:** Explore in threads. Project into state. Verify against artifacts. Act only
after alignment.

## Before you start — applicability check (skip ClisTa if any answer is "no")

- Is the decision hard to reverse?
- Does it span multiple people/agents or sessions?
- Can its key claims be checked against real artifacts?

Do NOT use this for: reversible calls (just decide and revert), brainstorming/ideation,
single-agent single-session tasks, pure value disputes, or live incident response (ledger the
retro instead).

## Roles (one agent or person each; 2–4 sides + one referee)

- **PROPOSER / ADVOCATE** — opens with a CONCRETE proposal (mechanisms, numbers, named tools,
  timelines — no vibes). Owns dispositioning every numbered objection.
- **CRITICS (1–3 lanes, non-overlapping)** — e.g., necessity/cost, security/compliance,
  operations, product. Each files numbered objections in its own ID namespace (A1.., B1..).
- **REFEREE (lead)** — carries no messages, argues no side. Enforces the rules below, keeps a
  visible state table per round, synthesizes the final report. The referee's job is protocol
  integrity, not opinion.

## State vocabulary (label every substantive point)

CLAIM · ASSUMPTION · EVIDENCE_NEEDED · OBJECTION · CONCESSION · AMENDMENT · RESIDUAL_RISK ·
BLOCKER · DECISION_IMPACT

## Rules of engagement

1. Proposer opens with the concrete proposal, claims numbered (C1, C2, …) for attack-by-ID.
2. Each critic replies with numbered objections. Every objection must carry: TARGETS (claim ID),
   FAILURE MODE, CONSEQUENCE, SEVERITY (BLOCKING / NON-BLOCKING — blocking only if it should
   genuinely stop the decision), VERIFICATION (what artifact would prove or refute it).
3. Each round the proposer must mark EVERY numbered point: CONCEDED / DEFENDED /
   PARTIALLY_CONCEDED / ACCEPTED_AS_AMENDMENT / NEEDS_ARTIFACT_VERIFICATION.
   **No silent drops.** Defenses must be mechanisms or evidence, never reassurance.
4. After each proposer response, every critic re-marks every prior point: RESOLVED / STILL_OPEN /
   CONVERTED_TO_RESIDUAL_RISK / BLOCKING. New objections only against NEW surface (amendments).
   IDs are stable forever — never renumber, never reuse.
5. Up to 4 rounds. Stop early ONLY when every critic is at zero STILL_OPEN and zero BLOCKING.
   Agreement without resolved objections is not alignment.
6. The strongest convergence shape: blockers become **agreed gates** that lift mechanically when
   a named artifact exists — disagreement becomes empirical, not rhetorical.
7. Honesty norms (read these to every participant): concede real losses; mark genuine unknowns
   NEEDS_ARTIFACT_VERIFICATION instead of bluffing; a debate where the proposer concedes nothing
   is a failed debate; a critic who never resolves anything is a failed critic; do not inflate
   non-blockers.

## Close protocol

1. Referee confirms every critic's final ledger (zero open / zero blocking, or round 4 reached).
2. Each critic supplies a final caveat: "I endorse this decision only if …".
3. Referee writes the final report: decision; why it advanced; key tradeoffs as "Chose X over Y
   because Z" (accepted costs, not fake solved problems); concessions; won-back claims; residual
   risks with owners and triggers; blocked items; artifact checks required; authority boundary
   (what this debate was and was not allowed to decide); one-line integrity verdict ("Was the
   debate real?").
4. Fill `LEDGER_TEMPLATE.md` — the ledger table plus a Transfer State section a fresh thread can
   resume from without replaying the debate.

## Honest labeling (do not skip)

The ledger header carries `epistemic_state: unaudited` until a NON-participant audits it.
A clean, closed ledger means the decision is **well-shaped — not right**. Closure is this
format's own success metric; never cite a clean closure as evidence the format works.

---

License: CC BY 4.0 (see `LICENSE.md`) — adapt freely with attribution. If you adapt the pack,
please keep the honest-labeling section above; it is load-bearing, not boilerplate.

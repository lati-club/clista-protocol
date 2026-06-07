# Blind-judging rubric & procedure — EXTERNAL-RUNS gate (pre-registered)

The EXTERNAL-RUNS gate requires that external runs of the ClisTa debate pack be
**blind-judged on decision quality** (gate: ≥5 external-culture runs, not prompted/hosted/
graded by the project, judging pipeline complete by 2026-09-07), and judgment is external
by the project's own standing ruling. This document must be committed **before the first external run reports** — it is
the pre-registration of how judging works, so we are not grading our own gate. Once the first
run report arrives, the rubric is FROZEN for the quarter; amendments after that point require a
logged rationale and apply only to later-reported runs (no re-scoring under a changed rubric).

epistemic_state of this document: asserted (designed by the project; the non-confirmation
clause applies to the design itself — external judges, not this text, produce the scores).

## What is judged

The unit of judging is one reported run: ledger + `failures.md` + `cost.md` (and `outcome.md`
if it exists). Judges score **decision quality as evidenced by the artifact** — not protocol
compliance, not formatting, not whether they like the decision. Six dimensions, each scored
1–5 against the written anchors, no half points:

| # | Dimension | 1 (anchor) | 5 (anchor) |
|---|-----------|------------|------------|
| D1 | Evidence–decision linkage | decision unsupported by, or contradicting, the evidence in the artifact | every load-bearing element of the decision traces to specific cited evidence |
| D2 | Option coverage | single option; alternatives absent or strawmanned | ≥2 genuine alternatives engaged on their strongest form, rejection reasons recorded |
| D3 | Dissent handling | objections absent, dropped, or retired without engagement | every objection engaged on merits; retirements carry recoverable mechanisms; surviving dissent preserved |
| D4 | Risk & residual handling | residual risks absent or vague; no owners | residuals specific, owned by named parties, with detection/trigger conditions |
| D5 | Proportionality | action scope exceeds the understanding supporting it (or timidity unexplained) | scope of the decision visibly matched to the quality of understanding; irreversibility acknowledged and priced |
| D6 | Successor resumability | a successor would have to re-litigate from scratch | a successor could resume from the Transfer State alone without consulting participants |

Per dimension, the judge must quote or cite the artifact line(s) that justify the score.
Unsupported scores are returned for completion. "Not assessable from this artifact" is a valid
entry (recorded as N/A, not as a low score) and is itself a finding about the format.

## Judge pool

- **External**: no project affiliation, no authorship of any artifact under judgment, no
  participation in the run being judged, not recruited from the run's own team.
- **Competent**: has owned or formally reviewed hard-to-reverse technical/organizational
  decisions (staff-eng level, ADR/RFC culture, or equivalent decision-discipline practice).
- **n per run**: 2 independent judges; a 3rd is added when any dimension differs by ≥2 points
  or the act-on-it verdicts (below) disagree. Median of 3 stands.
- Judges may serve across multiple runs but a judge who has seen N runs is no longer naive to
  the format — record per-judge exposure count alongside their scores.
- Compensation (if any) is flat per artifact, never contingent on scores.

## Blinding procedure

What judges must NOT know, and how that is enforced:

1. **Origin identity** — team names, individual names, employer/product names, repo URLs, and
   model/vendor identifiers are redacted to stable placeholders (`TEAM-A`, `participant-1`,
   `vendor-X`) by a scripted pass over the artifact before it reaches judges. The redaction
   map is kept sealed by the maintainer and published only after gate evaluation.
2. **The hypothesis** — judges are not told what the protocol claims, what the gate is, what
   lift/falsification thresholds exist, or that the project's productization depends on the
   scores. Judge instructions contain the rubric and nothing about stakes.
3. **Our preferred outcome** — judging instructions are this section verbatim, fixed at
   freeze; no per-run cover letters, no contact between maintainer and judge about a specific
   run beyond delivering the redacted artifact.
4. **Each other** — judges score independently; no deliberation before both score sheets are
   submitted. Tie-break judges see the artifact, not the prior score sheets.

**What cannot be blinded, recorded honestly:** the ledger format itself is recognizable. A
judge who knows of ClisTa may infer the format's identity from structure alone. Mitigations:
ask judges to disclose prior exposure to the protocol (recorded with their scores; exposure
does not disqualify but is reported alongside gate evaluation); where the falsification frame
requires comparison against strong-prompt + freeform-notes artifacts, deliver both arms through
the same redaction pipeline in randomized order so format identity is at least not confounded
with presentation order.

## Procedure per reported run

1. Run report arrives (GitHub issue titled `External run report: <decision title>`, or email fallback). Maintainer logs receipt in
   the distribution tracking table — date-stamped before judging begins.
2. Scripted redaction pass; sealed map stored; redacted artifact hash recorded.
3. Two judges assigned (lowest exposure counts first); artifact delivered with frozen
   instructions; 14-day return window.
4. Score sheets returned: 6 dimensions × cited justification + one overall verdict —
   **"Would you act on this artifact's transfer state for a decision of this consequence:
   yes / with-reservations / no"** — plus free-text on anything the rubric missed.
5. Disagreement rule (≥2-point gap on any dimension, or verdict mismatch) → third judge →
   median stands.
6. Everything is recorded in `judging/<run-id>/`: redacted artifact, hashes, score sheets,
   exposure counts, dates. Published at gate evaluation alongside the unsealed redaction maps.

A run **counts toward the gate** when it has completed this pipeline — the gate requires runs
be blind-judged, not that they score well. Scores feed the standing falsification frame
(standing falsification frame: no advantage on decision quality, relitigation rate, dropped residuals, or gate
verification ⇒ thesis dies); a set of five externally-run but low-scoring ledgers is a
countable gate AND bad news, and both facts get recorded.

## Integrity rules

- The maintainer never scores, never adjusts scores, never selects which completed judgments
  to report. All completed judgments are reported.
- Self-grading prohibition extends to agents: no judge may be an AI agent operated by the
  project, in the project's harness, or prompted by the maintainer (Ruling 2(c); same-family
  internal scoring is what made the project's own pilot experiments non-adjudicating).
- Rubric changes after freeze: logged amendment with rationale, applies to later-reported runs
  only, both rubric versions published at gate evaluation.
- A-2 ORPHAN DIFF analogue: at gate evaluation, every score in the record must trace to a
  signed score sheet from an identified (post-unsealing) external judge. Scores without
  provenance are discarded — in the direction of NOT counting the run.

## Open items (tracked, not blocking commit)

- Judge recruitment: candidate pools are decision-discipline communities (ADR community,
  staff-eng circles) — recruit judges from channels DIFFERENT from the one a run arrived
  through, to avoid social adjacency between runner and judge.
- Redaction script: does not exist yet; manual redaction with a checklist is acceptable for
  run #1 if the checklist is committed first; script before run #2.
- Comparison-arm artifacts (strong prompt + freeform notes) for the falsification frame: design
  owed before any comparative claim is made; not required for the gate count itself.

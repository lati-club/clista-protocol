# Stage 0 Runbook — running an instrumented external debate

For teams trying the ClisTa pattern on a real decision. "External run" = a team we did not
prompt, host, or grade, running the pack on their own decision in their own harness.

## How to run one

1. Pick a real decision that passes the applicability check in `PROMPT_PACK.md`.
2. Spawn/assign the roles (any agent vendor, or humans). Give every participant the pack.
3. Run the rounds. The referee keeps the ledger in `LEDGER_TEMPLATE.md` format as you go —
   the ledger is the artifact of record, not the chat.
4. Close per the close protocol; fill the Transfer State; set `closure_state: closed`.

## Instrumentation to capture (this is what makes the run count)

Per run, record alongside the ledger:

- **failures.md** — every discipline failure observed: silently dropped objections, renumbered
  IDs, closure declared with open points, residuals missing from Transfer State, hollow
  dispositions noticed later. These feed the failure log that gates all future tooling.
- **cost.md** — wall-clock duration; number of rounds/messages; approximate agent tokens;
  **human-minutes of overhead attributable to the format itself** (the headline claim under
  test is that agents bear the ceremony cost — help us check it).
- **outcome.md** (later) — if the decision gets executed: did reality match the ledger? Which
  residual risks fired? This is the only ground truth that exists.

## What an external run must NOT involve (or it doesn't count toward the gate)

- Us writing or editing your prompts beyond this pack
- Us refereeing, scoring, or "helping" mid-run
- Cherry-picking: report failed/abandoned runs too — a run that exposes the format is worth
  more than one that flatters it

## Where to send it

A run counts toward the gate only if it reaches us. Send the ledger plus `failures.md` and
`cost.md` (and `outcome.md` later, if the decision gets executed):

- **Preferred:** open an issue titled `External run report: <decision title>` at
  https://github.com/lati-club/clista-protocol with the artifacts attached or linked.
  Public by default — which is the point; see the cherry-picking rule above.
- **Fallback (or if you need confidentiality):** email the artifacts to lati@clista.ai.
  Redact rather than withhold — privately reported runs still have to be judgeable by blind
  external judges to count.

Optional but valuable: tell us *before* you run ("we're going to try this on <decision>").
Pre-registered runs that get abandoned are evidence too; unregistered ones vanish silently.

"We"/"us" throughout this pack = the ClisTa protocol project (maintainer contact above). The
gate your run feeds is public and bidirectional — if five external runs don't materialize, or
runs show no advantage, the productization claim dies on the record (`GATES.md`).

## Why your run matters (honest framing)

All evidence so far (N=3 debates + 2 pilot experiments) comes from one authoring culture inside
one model ecosystem, refereed by the format's authors — formally `asserted`, not verified. The
format's own debate ruled that further clean closures by us confirm nothing. External runs are
the only way the central claims get tested. There is also a standing falsification frame: if
ledgered runs show no advantage over a strong prompt + freeform notes on decision quality,
relitigation rate, dropped residuals, or gate verification, the protocol thesis dies and we have
pre-committed to recording that.

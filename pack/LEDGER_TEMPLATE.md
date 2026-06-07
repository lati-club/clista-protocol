# ClisTa Ledger — <decision title>

clista_convention: v0.1
title: <one-line decision question>
closure_state: open
epistemic_state: unaudited
applicability: irreversible=<yes|no>; multi_party_or_multi_session=<yes|no>; artifact_verifiable=<yes|no>

<One short paragraph: the decision context and the options on the table.>

| ID  | TARGET | SEVERITY     | DISPOSITION | RATIONALE-REF |
|-----|--------|--------------|-------------|---------------|
| A1  | C1     | BLOCKING     |             |               |
| A2  | C3,C4  | NON-BLOCKING |             |               |
| B1  | C2     | NON-BLOCKING |             |               |

<Row rules: ID = critic-namespace prefix + number, stable forever. DISPOSITION (terminal only):
CONCEDED · DEFENDED · PARTIALLY_CONCEDED · ACCEPTED_AS_AMENDMENT · NEEDS_ARTIFACT_VERIFICATION ·
RESOLVED · CONVERTED_TO_RESIDUAL_RISK. Every BLOCKING row needs a non-empty RATIONALE-REF.
closure_state may be set to `closed` only when every row is terminal.>

## Transfer State

- DECISION: <the option chosen, stated plainly, with its load-bearing amendments>
- SETTLED (do not relitigate without a context change): <bullet list>
- RESIDUAL RISKS: <Rn (from <row-ID>): description; owner: <who watches>; trigger: <review condition>>
- OPEN GATES: <gate, lift condition (a named artifact), deadline if any>
- AUTHORITY BOUNDARY: <what this debate decided / what it was not authorized to decide>
- CAVEATS: <each critic's "only if …" verbatim>
- NEXT ACTION: <the first concrete move, with its earliest honest slip signal>

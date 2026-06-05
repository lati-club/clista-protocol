# First Real Thread

## Candidate Thread

Use this as the first live Clista thread:

**Decision:** Should Clista MVP start as a local-first JSON protocol with six core objects before building UI?

This is intentionally small. It tests whether a real conversation can become durable, reloadable, and useful to another agent without inventing a whole platform first.

## Minimal Participants

- **Human owner:** Troy, final decision authority.
- **Primary collaborator:** Codex, keeps the thread coherent and emits structured state.
- **Research agent:** gathers prior art, examples, and constraints.
- **Dissent agent:** challenges assumptions, failure modes, and premature abstraction.

The dissent agent can be simulated by Codex at first. It only needs a named participant identity and explicit claim objects so later readers can separate "agreement" from "unresolved objection."

## Worth-It Criteria

This first thread is worth it if, after the conversation ends, Clista can:

- Reload the thread with enough context to continue without re-explaining the decision.
- Show the decision, the options considered, and the rationale.
- Preserve dissent as first-class material rather than burying it in prose.
- Give another agent a compact export it can consume without reading the full transcript.
- Point to artifacts produced during the thread, including schemas, notes, sketches, or code.

## Thread Template

```yaml
thread:
  id: thd_clista_mvp_protocol
  title: "Clista MVP protocol shape"
  purpose: "Decide whether MVP begins with six local JSON objects."
  status: active
  participants:
    - par_troy
    - par_codex
    - par_research
    - par_dissent

opening_question: >
  Should Clista's first implementation be a local-first JSON protocol with
  six core objects, or should it begin with UI/workflow surfaces first?

candidate_options:
  - id: opt_protocol_first
    label: "Protocol first"
    summary: "Define six durable objects and export/import before building UI."
  - id: opt_ui_first
    label: "UI first"
    summary: "Build a narrow workflow and let the protocol emerge from usage."
  - id: opt_hybrid_spike
    label: "Hybrid spike"
    summary: "Define only enough protocol to power one real thread."

expected_outputs:
  - "MVP object schema"
  - "One populated example thread"
  - "Hermes session emission sketch"
  - "Decision record with dissent"
```

## First Run Script

1. Create the thread and participant records.
2. Run the opening question through the participants.
3. Capture every important assertion as a claim.
4. Convert the final choice into one decision object.
5. Link the decision to supporting and dissenting claims.
6. Export the complete package as JSON.
7. Reload the JSON into a fresh agent context and ask it to summarize the decision, unresolved dissent, and next action.

## Example Outcome

```yaml
decision:
  id: dec_protocol_first_mvp
  status: proposed
  selected_option: opt_hybrid_spike
  summary: >
    Build a six-object protocol spike, but validate it only against one real
    thread before treating it as architecture.
  rationale:
    - "A protocol-first pass gives agents a stable target."
    - "A single real thread prevents schema design from drifting into abstraction."
  dissent:
    - "The six objects may still be too many if the first thread only needs transcript plus decision."
    - "The model should prove it can reload and act before more objects are added."
```

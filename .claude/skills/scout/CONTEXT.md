# Scout — canonical vocabulary

The shared language for the Scout skill. `SKILL.md` and `sources.md` use these
terms precisely; stay in this language in chat with Duncan too. This file is the
glossary — the workflow itself lives in `SKILL.md`.

## Core terms

- **Scout** — the skill that produces deeply-researched candidate options and
  queues them for triage. It does not *add* options; it *proposes* them.

- **Mode** — how a Scout run is kicked off. Two of them, same output (a candidate
  in the Review queue):
  - **Discovery mode** — input is **criteria** (a location plus preferences).
    Scout casts a wide net, then narrows to the **3–5 strongest** and researches
    each. The funnel (cast wide → rank cheap → cut to 3–5) is what defines this
    mode.
  - **Direct URL mode** — input is **one specific link** Duncan pastes. There's
    nothing to *find*, only to *research*: Scout skips the funnel and researches
    that single page, then queues it.

- **Candidate** — a single researched option Scout has proposed but Duncan has
  **not yet decided on**. It lives in the Review queue with the scout-only fields
  `scoutNote` (the one-line "why it fits / what's unknown / what was verified")
  and `scoutedAt` (the date researched). A candidate is *not* a tracked option —
  it's a proposal awaiting a yes/no.

- **Option** — a **tracked** option: something Duncan has accepted into the
  planner (the dashboard's real subject). A candidate becomes an Option only on
  **Add** (which drops the scout-only fields and stamps `status`/`addedAt`).
  Until then it is a Candidate, never an Option.

- **Review queue** — where Candidates wait for triage, surfaced under the
  dashboard's **Review** tab. Concretely: rows in the `items` table with
  `collection = 'review'`. Tracked Options are the same table with
  `collection = 'option'`. The two never mix; `collection` is the divider.

- **Triage** — Duncan's decision on a Candidate in the Review tab. Two outcomes:
  - **Add** — promote the Candidate into the tracked Options (it becomes an
    Option).
  - **Dismiss** — reject it; it goes to the Dismissed ledger and never resurfaces.

- **Dismissed ledger** — the record of Candidates Duncan has already rejected:
  rows in the `dismissed_candidates` table. **Every Scout run must skip these**
  during de-dup — a dismissed Candidate is never resurfaced.

- **Anchor venue** — for a non-venue Scout (photographer / catering / decor), the
  existing venue the run is tied to via `--venue <id>`. The Candidate inherits
  the anchor's location as the search area and carries `venueId: <id>` so it
  pairs with that venue. Without an anchor, a non-venue Candidate is unassigned
  (`venueId: null`, the "Not yet paired" bucket). Venue Scouts have no anchor —
  their location comes from the criteria.

## The shape of a run

Both modes converge on the same thing: **a Candidate in the Review queue, ready
to triage.** Discovery mode produces 3–5 of them from criteria; Direct URL mode
produces one from a pasted link. Either way Duncan only ever sees Candidates in
the Review tab and decides Add or Dismiss — he never transcribes the research
Scout already did.

---
name: scout
description: Scout the web for candidate wedding options (venues, photographers, catering, decor) that fit the planner's settings and a location/preferences, deeply research a tight shortlist (real pricing, date availability, photos) and write them into the Review queue for Duncan to add or dismiss. Use when Duncan wants to FIND new options he doesn't have links for yet — "find venues in X", "scout photographers near the Oak Barn", "/scout venue Cornwall". NOT for ingesting a link he already has (that's the paste-a-link loop in CLAUDE.md).
---

# Scout

Scout turns **criteria** (a location plus preferences) into a **tightly
researched shortlist of candidate options** the planner doesn't already track.
It is the inverse of the ingestion loop: ingestion goes link → file, Scout goes
criteria → researched candidates.

Scout casts a wide net, then **narrows to the 3–5 strongest candidates and
researches each one properly** — driving the same data-retrieval methods the
ingestion loop uses (the browser helper in `scripts/browse.mjs`) to pull **real
pricing** (quote widgets), **real date availability** (operating the calendar
against `TARGET_DATES`), and a **spread of photo URLs**. Each researched
candidate is written as a file to the Review queue (`data/review/<slug>.json`)
for Duncan to triage under the dashboard's **Review** tab.

Depth over breadth: a few candidates Duncan can actually decide on beat a long
list of unknowns. The only thing deferred to **Add** is the local photo
download — see step 6.

Read `CONTEXT.md` for the canonical vocabulary (Scout, Candidate, Review queue,
Dismissed ledger, Anchor venue) and `CLAUDE.md` for the ingestion loop, the
**Browser helper** section (the exact calendar/quote technique), and the `Item`
schema. The curated source domains live in [sources.md](./sources.md).

## Invocation

```
/scout <category> [criteria] [--venue <id>] [--type family_stay|day_of]
```

- `<category>` — `venue` | `photographer` | `catering` | `decor`. Required.
- `[criteria]` — free text: a location and/or preferences ("Cornwall coast,
  coastal, relaxed"). Required for `venue`. For non-venue categories it's
  optional when `--venue` is given (location comes from the anchor).
- `--venue <id>` — anchor a non-venue scout to an existing venue (see step 1).
- `--type` — narrow a venue scout to one event type. Omit to search both.

If category or criteria are missing and can't be inferred, ask once, then run.

## Workflow

### 1. Load planner context (no typing for Duncan)

Pull the constraints from the repo so Duncan never re-states them:

- `src/config.ts` → `BUDGET`, `CURRENCY`, `GUEST_ESTIMATE`, `TARGET_DATES`,
  `TARGET_DATE_LABEL`, `ASSUMED_STAY_NIGHTS`.
- `data/preferences.json` → **per-category preferences** Duncan hand-set in the
  Preferences tab. For the category you're scouting, read its entry:
  - `priceLimit` — a spend ceiling for *this area* (in `CURRENCY`), separate
    from the overall `BUDGET`. Rank/flag candidates against it the same way you
    do `BUDGET` (step 3) — it's the tighter, category-specific constraint when
    set. Normalise units the usual way before comparing.
  - `context` — free text describing the **vibe / style / must-haves** Duncan
    wants here. Treat it as first-class search criteria: fold it into both your
    seeded and open queries (step 2) and your preference scoring (step 3),
    alongside any `[criteria]` typed at invocation. If the typed criteria and
    the stored context conflict, the typed criteria win (it's the more specific,
    in-the-moment ask); otherwise combine them.

  The file may be missing or have empty entries — that just means no extra steer
  for that category; fall back to `BUDGET` and the typed `[criteria]`.
- Existing options in `data/<category>/*.json` and pending candidates in
  `data/review/*.json` — for **de-dup** (step 4) and, if `--venue` is given, to
  resolve the **anchor venue**.
- `data/dismissed.json` — the **dismissed ledger**. Candidates Duncan has
  already rejected; Scout must skip these (step 4).

**Anchoring (non-venue categories):**
- With `--venue <id>`: read `data/venues/<id>.json`. Inherit its `location`
  (region/city) as the search area and its `availability.openDates` /
  `TARGET_DATES` as the date context. Every resulting candidate carries
  `venueId: <id>`.
- Without `--venue`: search by the typed criteria (or `config` location).
  Candidates are unassigned — `venueId: null`, the "Not yet paired" bucket.

Venue scouts have no anchor; the location comes from `[criteria]`.

### 2. Build the search plan

Look up the category (and, for venues, the event type) in
[sources.md](./sources.md) to get the **seed domains**. Then form a **hybrid**
search:

- **Seeded:** targeted queries scoped to each seed domain
  (e.g. `site:vrbo.com large house <area> sleeps <guests>`).
- **Open:** broad `WebSearch` queries for anything the seed list misses
  (e.g. `"<area>" wedding venue <guests> guests`).

**Venues — search BOTH event types unless `--type` is set.** `family_stay`
draws from rental-home sources; `day_of` from wedding-venue directories. Tag
each candidate with the type it came from, and for `family_stay` set a
`stayNights` (default `ASSUMED_STAY_NIGHTS`).

### 3. Rank cheaply, then narrow to 3–5

A funnel — cast wide, score cheap, cut hard:

1. **Snippet pass.** Collect ~20–30 hits from search results. Rank cheaply from
   snippets/metadata against the soft signals (below). Drop obvious junk
   (listicles, aggregator spam, wrong region, closed/defunct).
2. **De-dup** (step 4) so you never spend research budget on something already
   tracked, queued, or dismissed.
3. **Cut to the 3–5 strongest** survivors. These — and only these — get the deep
   research in step 5. This narrow cut is deliberate: it's what makes the
   per-candidate browser-helper research affordable.

**Soft signals — rank, never silently exclude:**

- **Budget** — compare against the category's `priceLimit` from
  `data/preferences.json` if set, otherwise `BUDGET` (normalise per the
  price-unit rules in CLAUDE.md: `per_person` × guests, `per_night`/`per_week` ×
  stay). Flag over-limit; don't drop.
- **Capacity** — compare against `GUEST_ESTIMATE`. Flag too-small/unknown.
- **Preferences** — match the free-text criteria *and* the category's stored
  `context` from `data/preferences.json` (style, setting, vibe, must-haves).
- **Quality** — ratings/reviews/awards where available.

Missing data at the snippet stage ranks **lower**, not **out** — step 5 fills
the gaps for the survivors.

### 4. De-dup (before spending research budget)

Drop any candidate that is:

- already a tracked option in `data/<category>/` (match on URL, else name),
- already pending in `data/review/` (don't double-queue a re-run), or
- in `data/dismissed.json` — Duncan already rejected it (match on `url`, else
  `name` + `category`). **Never resurface a dismissed candidate.**

Keep a note of what you dropped so you can mention it (step 7).

### 5. Deeply research the 3–5 survivors (browser helper)

This is the heart of the skill. For each survivor, pull the same things the
ingestion loop pulls — using the **same methods**. Start the browser helper
**once** (`node scripts/browse.mjs serve` with `run_in_background: true`),
research all candidates in turn, then `stop` it. For static, non-interactive
detail prefer the `defuddle` skill; reach for the browser helper whenever data
hides behind interaction.

Per candidate:

- **Pricing — get a real figure, including quote-driven prices.** Follow
  **CLAUDE.md step 8**: use a published rate if one exists, otherwise drive the
  booking/quote widget (set dates, call the quote control or its JS function via
  `eval`, read the quote container). For seasonal rental homes, quote a target
  week. Record `price.amount` with the right `unit` (`per_week` for whole-home
  rentals, `per_person` for caterers, etc.) and put the breakdown / seasonal
  range / which dates were quoted in `price.note`.
- **Date availability (venues) — operate the calendar.** Follow **CLAUDE.md
  step 7**: find the availability page, operate the date selector, page to the
  `TARGET_DATES` window, and read which target Saturdays are bookable vs booked
  (screenshot + `eval`/`html` on day cells). Record genuinely-open dates in
  `availability.openDates`; if the target Saturdays are taken, record what *is*
  open and add an `availability.notes` line.
- **Photos — collect a spread of URLs.** Pull a hero plus ~8–12 image URLs from
  the listing/gallery (`eval` for `<img>` srcs / gallery data when the gallery
  is JS-driven). Store **remote URLs** in `photos` (hero first). **Do not
  download them locally** — that stays on Add (step 6), so dismissed candidates
  leave no orphan files.
- **The rest:** firm up `capacity`, `description`, `location`, `rating`,
  `contact`, and any category-specific `attributes`.

Non-venue categories (photographer / catering / decor) rarely have a calendar or
quote widget — for them "deep research" means pulling real package/per-head
pricing, a photo/portfolio spread, and contact details from their own site;
skip the calendar step.

**Never invent data.** If a quote needs login or a calendar can't be operated,
leave the field unset and say so in `scoutNote` / `availability.notes` — an
honest gap renders as a neutral "unknown" flag in the Review tab.

**Capture caveats as structured `flags`.** Beyond the budget/capacity/date fit
flags the UI computes from settings, record any *other* caveat as an `ItemFlag`
in the `flags` array (`src/types.ts`) so it renders as a warning pill in the
Review tab and a notices block on the detail page. Two levels:

- `"unknown"` — a genuine gap you couldn't verify (amber pill). Use for things
  the computed checks can't see, e.g. **catering policy not published**, an
  unstated corkage rule, an unconfirmed wet/dry venue. (Don't duplicate the
  computed ones — price, capacity and target-date gaps already flag themselves.)
- `"warn"` — a fact that **conflicts with a stated preference** (red pill), e.g.
  a venue that **requires an approved-caterer list** (against a "no required
  vendors" steer), a price **over the category `priceLimit`** (the computed
  budget flag only sees the overall `BUDGET`), or a capacity that scrapes the
  guest count. Give each a short `label` and a one-line `detail`.

This is exactly where the "what's unknown" half of your research lands as
something Duncan can *see and act on* — not buried in prose. Mirror anything
material here in the `scoutNote` too.

### 6. Write the researched candidates into the Review queue

Write each of the 3–5 as one file to `data/review/<slug>.json`, where `<slug>`
is the kebab-case name (also the `id`). Conform to the `Item` type:

- **Include** everything step 5 surfaced: `id`, `type`, `name`, `url`,
  `eventType` (+ `stayNights` for `family_stay`), real `price`, `capacity`,
  `location`, `availability.openDates`, `photos` (remote URLs), `rating`,
  `description`, `contact`, `attributes`. For non-venue scouts set `venueId`
  from the anchor (else `null`).
- **Add** `flags` (see step 5) — any unknown/conflict caveat the computed fit
  flags can't see (catering policy, required-vendor list, over the category
  limit). They persist when the candidate is promoted on Add.
- **Add** `scoutNote` — the one-line "why it fits / what's unknown / what was
  verified" — and `scoutedAt` = today (ISO).
- **Omit** `status` and `addedAt` (set on Add).

The dashboard hot-reloads; the candidates appear under the **Review** tab with
their photos, prices, date flags and caveat pills already populated.

### 7. Hand off to the Review tab

Tell Duncan, in chat, that the 3–5 candidates are queued — a one-line summary of
each (best first, noting what you verified), plus anything de-duped ("Already
tracked / previously dismissed: …"). Then point him to the **Review** tab:

- **Add** → promotes the candidate into the tracked options (`considering`).
  Because Scout already pulled pricing, availability and photo URLs, the only
  ingestion work left is to **download the photos locally** to
  `public/photos/<id>/` (CLAUDE.md step 5) and rewrite `photos` to
  `/photos/<id>/NN.jpg` — plus re-confirm anything that was still unknown.
- **Dismiss** → logs it to `data/dismissed.json` so future scouts skip it.

## Guardrails

- **Depth, not breadth: 3–5 candidates.** Cast wide, then cut hard before
  researching. A long list of unknowns is the failure mode this skill exists to
  avoid.
- **Use the real retrieval methods.** Pricing and availability come from
  operating quote widgets and calendars via `scripts/browse.mjs` (CLAUDE.md
  steps 7–8 + Browser helper section) — not from guessing off a snippet.
- **Photo URLs at scout time, local download on Add.** Scout stores remote
  `photos` URLs; it never downloads to `public/photos/` (that's Add's job).
- **Never resurface a dismissed candidate.** Always check `data/dismissed.json`
  in step 4.
- **Never invent data.** No fabricated prices, capacities, or dates — only what
  a quote/calendar/page actually returns. "Unknown" is an honest answer.
- **Always `stop` the browser helper** when research is done, so the headless
  browser doesn't linger.
- **Stay in the planner's language** (`CONTEXT.md`): Candidate, Review queue,
  Dismissed ledger, Anchor venue. A candidate becomes an "Option" only on Add.
- **Editable sources.** When a seed domain dies or a better one appears, edit
  [sources.md](./sources.md) — no change to this workflow needed.

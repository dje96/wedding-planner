# Wedding Planner — working notes for Claude

This is a local wedding-planning dashboard. It tracks and compares **venues,
photographers, catering and decor**, organised around the **venue** as the key:
every non-venue option links to the venue it's being considered for.

The defining principle: **the user never transcribes data by hand.** Duncan
pastes a link; Claude fetches it, extracts the details, and writes a data file.
The dashboard reads those files. That ingestion loop is the whole point — keep
it frictionless. (The user still exercises judgement over *which* options are
worth tracking — e.g. picking from a `/scout` shortlist — but never retypes
details that already exist on a page.)

## How to add an option from a link

When Duncan pastes a URL (optionally saying which category, or which venue to
link it to):

1. **Fetch the page.** Prefer the `defuddle` skill (clean markdown, token-light)
   or `WebFetch`. Pull: name, price (and how it's charged), description, photo
   URLs, capacity, location, availability/dates, ratings/reviews, contact
   details, and anything category-specific. Note that a static fetch rarely
   exposes real date availability or real pricing — those usually live behind an
   interactive calendar / quote widget; see steps 7 and 8.
2. **Pick the category** — `venue`, `photographer`, `catering`, or `decor`.
   Infer it if not stated.
3. **For non-venue items, set `venueId`.** Use the `id` of the venue it pairs
   with. If unclear, set `venueId: null` (it shows under "Not yet paired") and
   ask which venue, or link it once decided.
4. **Write one JSON file** to `data/<category>/<slug>.json` where `<slug>` is a
   kebab-case version of the name (this is also the `id`). Conform to the `Item`
   type in `src/types.ts`. Only `id`, `type`, `name`, `url` are required —
   include every other field the page actually provides, omit what it doesn't.
   The UI degrades gracefully on missing fields, so never invent data.
5. **Photos**: download a good spread (aim for ~10–15) into
   `public/photos/<id>/01.jpg`, `02.jpg`, … and reference them as
   `/photos/<id>/NN.jpg`. Downloading (rather than hot-linking) keeps the app
   self-contained and survives source sites that block hotlinking. For sample/
   placeholder data, remote URLs are fine. The first photo is the hero; the
   detail page shows the rest in a browsable lightbox gallery.
6. **For venues, set `eventType`** — `family_stay` (multi-day rental, wedding
   doubles as a holiday; also set `stayNights`) or `day_of` (single-day
   celebration). For beachfront / large rental homes, default to `family_stay`
   with `stayNights: 7` (a week) unless told otherwise.
7. **For venues, check real date availability with the browser helper**
   (`scripts/browse.mjs` — see "Browser helper" below). Don't trust a static
   fetch for this; actually operate the site's date selector:
   1. Find the page that exposes availability — look for "Availability", "Check
      dates", "Book", "Enquire" in the nav. It's often a separate URL from the
      main listing (and for rental homes, a calendar widget on the listing).
   2. `serve` the helper (in the background), `goto` that page, `shot`, and Read
      the screenshot so you can *see* the calendar.
   3. Operate the selector: open the calendar, page months toward the target
      window (the Saturdays in `TARGET_DATES`, currently late Aug / early Oct
      2026), `shot` each relevant month, and read which target dates are
      **bookable vs booked** — combine the screenshot with `eval`/`html` on the
      day cells (aria-labels, disabled/booked classes, data attributes).
   4. Record genuinely-open dates in `availability.openDates` (ISO
      `yyyy-mm-dd`). If you checked but the target Saturdays are taken, still
      record what *is* open and add an `availability.notes` line, e.g.
      "Checked 2026-06-06 via site calendar; target Saturdays booked." **Never
      invent dates** — only record what the calendar actually shows.
   5. If the calendar can't be operated (login wall, enquiry-only, JS blocked),
      fall back: tell Duncan what's missing, ask him to confirm, and note it.
   6. `stop` the helper when done.
8. **Get real pricing — including quote-driven prices.** A headline rate in the
   static HTML is fine to use, but many venues (especially rental homes) show
   **no price until you pick dates** — the quote is computed by a booking widget.
   While you have the browser helper open from step 7:
   1. Look for a price on the page first (`eval` for `$`/`£` text, a rates table,
      a "from £X" banner). If a clear figure is published, record it.
   2. If pricing is date-driven, drive the quote: select an **available** target
      week in the booking widget (reuse the dates from step 7), respecting any
      rules the widget enforces (min-stay, and turn-day / check-in-day
      restrictions — e.g. many beach rentals are Sunday-to-Sunday, so a Saturday
      wedding means quoting the Sun–Sun week around it). Submit, then read the
      quote area (`text`/`eval`) for rent, fees, taxes and total. The quote
      handler is often a JS function (e.g. `submitQuote()`) you can call directly
      via `eval` once dates are set.
   3. Prices are usually **seasonal** — quote at least one week per target window
      (e.g. late-Aug peak *and* early-Oct) so the range is honest. Record the
      most representative figure in `price.amount` with the right `unit`
      (`per_week` for whole-home rentals — the budget rollup multiplies by weeks)
      and put the full breakdown + seasonal range + which dates were quoted in
      `price.note`. **Never invent a price** — only record what a quote returns.
   4. If a price genuinely can't be obtained (quote needs login, or it's
      enquiry-only), leave `price.amount` unset and note "request a quote" with
      what you tried.
9. **Set `addedAt`** to today's date (ISO `yyyy-mm-dd`).
10. The dashboard hot-reloads — the new option appears with no code change.

If a page can't be fetched at all (login wall, JS-only), tell Duncan what's
missing and ask him to paste the key details, then still write the file. For a
page that *renders* but hides data behind interaction (calendars, "show more",
tabs), reach for the browser helper rather than giving up.

### Browser helper (`scripts/browse.mjs`)

A stateful headless-Chromium session you drive one command at a time — the only
way to operate JS date selectors (static fetches can't click a calendar). It runs
as a background **daemon** holding one page, plus a thin client per command.

Start it once in the background, then issue commands, then stop it:

- `node scripts/browse.mjs serve` — start the daemon. **Run this with
  `run_in_background: true`**; it holds the browser open between commands.
- `node scripts/browse.mjs goto <url>` — navigate; prints final URL + title.
- `node scripts/browse.mjs shot [name] [full]` — screenshot to
  `.cache/browse/<name>.png`; prints the path so you can **Read the image**.
  Add `full` for a full-page (not just viewport) capture.
- `node scripts/browse.mjs click "<text|selector>"` — clicks by CSS, else by
  visible text, else aria-label/title. (Native `<select>` dropdowns aren't
  clickable this way — use `eval` with `selectedIndex`/`dispatchEvent` instead.)
- `node scripts/browse.mjs fill "<selector>" "<value>"` — type into an input.
- `node scripts/browse.mjs text [selector]` — visible text (whole page or node).
- `node scripts/browse.mjs html [selector]` — outerHTML (inspect calendar markup).
- `node scripts/browse.mjs eval "<js-expression>"` — run JS in the page, get JSON
  back. The workhorse for reading calendars, e.g. extract day cells with
  `Array.from(document.querySelectorAll('.day:not(.disabled)')).map(d=>d.getAttribute('aria-label'))`.
- `node scripts/browse.mjs status` / `stop` — check the daemon / shut it down.

For **quote-driven pricing**, the same `eval` is the workhorse: set the booking
widget's dates, then either click the quote/"Book"/"Get rate" control or call the
site's quote function directly (inspect with `eval "typeof submitQuote"`, read its
source with `eval "submitQuote.toString()"`, then `eval "submitQuote()"`), wait,
and read the quote container's text. After heavy interaction some sites blank the
viewport screenshot — trust `eval`/`text` for the data and reload if you need a
clean `shot`.

Notes: `BROWSE_HEADFUL=1` runs the browser visibly for debugging. Screenshots and
the daemon's port file live in `.cache/browse/` (gitignored). Always `stop` when
finished so the browser process doesn't linger.

### Schema quick reference

See `src/types.ts` for the authoritative shape. Key points:

- `price`: `{ amount, currency (default USD), unit, note }`. `unit` is one of
  `total | per_person | per_hour | per_day | per_night | per_week | from`. The
  budget rollup normalises these: `per_person` × guests, `per_night`/`per_day` ×
  `stayNights`, `per_week` × weeks. Use `per_week`/`per_night` for rental homes.
- `eventType` / `stayNights` (venues): see step 6 above. `stayNights` drives the
  rental cost for `family_stay` venues with a weekly/per-night rate.
- `status`: `considering | shortlisted | contacted | quoted | booked | passed`.
  Default new items to `considering` unless Duncan says otherwise.
- `attributes`: a free `{ key: value }` map for category-specific extras
  (photographer hours, corkage, accommodation, etc.). camelCase keys render
  nicely (e.g. `secondShooter` → "Second Shooter").
- `availability.openDates` (ISO `yyyy-mm-dd`): if any match a target date in
  `src/config.ts`, the venue is flagged as available for Duncan's dates.
- `notes`: Duncan's own commentary — the one field meant to be hand-edited.

### Settings — `src/config.ts`

Hand-set planner values (not from links): `BUDGET` (currently $30,000 USD),
`CURRENCY`, `GUEST_ESTIMATE`, `ASSUMED_STAY_NIGHTS` (7), and `TARGET_DATES`
(Duncan's target: a Saturday in late Aug or early Oct 2026). Editing these
re-renders the budget bar and date highlighting; they never touch option data.

## Scouting & the Review queue

The `/scout` skill (`.claude/skills/scout/`) finds candidate options Duncan
doesn't have links for yet. It casts a wide net, narrows to the **3–5 strongest**
candidates, and **researches each one properly** — using the same browser helper
the ingestion loop uses to pull real pricing (quote widgets), real date
availability (operating the calendar against `TARGET_DATES`), and a spread of
photo *URLs*. It writes one researched file per candidate to
`data/review/<slug>.json` (an `Item` with `scoutNote`/`scoutedAt`). They appear
under the dashboard's **Review** tab for Duncan to triage:

- **Add** — promotes the candidate into the tracked options: the dev server
  moves the file into `data/<category>/` as `status: considering` with today's
  `addedAt`, dropping the scout-only fields. Because Scout already did the
  pricing + availability research, the only ingestion work left is to **download
  the photos locally** to `public/photos/<id>/` (step 5) and rewrite `photos` to
  `/photos/<id>/NN.jpg` — plus re-confirm anything Scout left as unknown.
- **Dismiss** — appends the candidate to `data/dismissed.json` and deletes the
  review file. **Every future `/scout` run must skip dismissed candidates** —
  the skill checks this ledger during de-dup.

These two buttons hit a **dev-only endpoint** (`/__review/add`,
`/__review/dismiss`) wired up in `vite.config.ts`; they only work while
`npm run dev` is running (the dashboard is otherwise a pure static read of
`data/`). The same file (`vite.config.ts`) also serves `/__option/delete`,
which backs the **Delete** button on every item's detail page — see "Editing /
removing options" below. You can perform the same moves directly on the files
if needed.

## Architecture

- **Vite + React + TypeScript**, hash-routed SPA, run locally.
- `data/<category>/*.json` is the database. `src/data.ts` globs it at build time
  (`import.meta.glob`), so adding/removing files is all it takes. The same glob
  also loads two other kinds of file, told apart by path: `data/review/*.json`
  (Scout candidates awaiting triage → `REVIEW_ITEMS`, kept out of the tracked
  options) and `data/dismissed.json` (the dismissed ledger → `DISMISSED`).
- `src/types.ts` — the data model. `src/config.ts` — hand-set settings.
  `src/lib/` — formatting, budget/stay rollups (`budget.ts`), date matching
  (`dates.ts`), Scout fit flags (`scout.ts`).
- Pages: `Overview` (venue dossiers, stat band, budget bar + target dates),
  `CategoryPage` (card grid), `ComparePage` (spec-sheet table with "best"
  flags), `ReviewPage` (Scout candidate triage — see below), `ItemDetail`
  (with `PhotoGallery` + `Lightbox` for browsing photos).
- Design language: clean & minimal (Airbnb-inspired) — pure white surfaces,
  near-black ink (#222), neutral grays, a single coral accent (#FF385C), soft
  shadows, 8/12px radii, all-sans Inter typography. Defined in `src/styles.css`.

## Commands

- `npm run dev` — local dev server (hot reload).
- `npm run build` — type-check + production build to `dist/`.
- `npm run preview` — serve the production build.

## Editing / removing options

- Change status, notes, or a venue link: edit the JSON file directly.
- Remove an option: click **Delete** on its detail page (any category), or
  delete its JSON file by hand. The button hits the dev-only `/__option/delete`
  endpoint in `vite.config.ts` (works only under `npm run dev`), which removes
  the JSON file **and** the option's `public/photos/<id>/` folder. Deleting a
  **venue** also unlinks its paired suppliers (sets their `venueId` to `null`,
  moving them to "Not yet paired") rather than deleting them — so removing a
  venue never leaves a supplier pointing at one that's gone.
- Re-link a supplier to a different venue: change its `venueId`.

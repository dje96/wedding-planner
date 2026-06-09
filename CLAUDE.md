# Wedding Planner — working notes for Claude

This is a local wedding-planning dashboard. It tracks and compares **venues,
photographers, catering and decor**, organised around the **venue** as the key:
every non-venue option links to the venue it's being considered for.

The defining principle: **the user never transcribes data by hand.** Duncan
pastes a link; Claude fetches it, extracts the details, and saves a row. The
dashboard reads those rows. That ingestion loop is the whole point — keep it
frictionless. (The user still exercises judgement over *which* options are worth
tracking — e.g. picking from a `/scout` shortlist — but never retypes details
that already exist on a page.)

**The database is Supabase** (a Postgres project). The app reads and writes it
directly through the browser (`src/lib/supabase.ts`, `src/data.ts`). The
`data/<category>/*.json` files are the original seed snapshot, kept for history;
they are **no longer read by the app** and will drift from the live database as
soon as anything is edited in-app, so don't treat them as the source of truth.
New options are written as rows. See "Architecture" and the schema reference
below.

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
4. **Author the option as an `Item` and write it as a row.** Compose a JSON file
   conforming to the `Item` type in `src/types.ts` (a kebab-case `<slug>` of the
   name is the `id`), then upsert it to Supabase:
   `node scripts/db.mjs upsert <path-to.json>`. Authoring the file first keeps
   the data reviewable; the script writes the `items` row (storing the full Item
   in the `data` jsonb column and mirroring `type`/`venue_id`). Only `id`,
   `type`, `name`, `url` are required — include every other field the page
   actually provides, omit what it doesn't. The UI degrades gracefully on missing
   fields, so never invent data. (You can also insert directly with the Supabase
   MCP if you prefer; the script is just the convenient path.)
5. **Photos**: download a good spread (aim for ~10–15) into
   `public/photos/<id>/01.jpg`, `02.jpg`, …, then upload them to Supabase
   Storage and rewrite the item's `photos` to the public Storage URLs with
   `node scripts/db.mjs photos` (it uploads every `public/photos/<id>/` folder
   to the `photos` bucket and updates the matching item). Downloading first
   (rather than hot-linking) survives source sites that block hotlinking; hosting
   in Storage means a venue's photos show up in the **published** app with no
   redeploy. `photos` ends up an array of full `https://…/storage/v1/object/
   public/photos/<id>/NN.jpg` URLs; the app renders any http(s) URL directly, so
   remote URLs are still fine for placeholders / un-uploaded Scout candidates.
   The first photo is the hero; the detail page shows the rest in a lightbox.
6. **For venues, set `eventType`** — `family_stay` (multi-day rental, wedding
   doubles as a holiday; also set `stayNights`), `weekend_rental` (an Airbnb-type
   home used as the venue for the wedding weekend only, not a full holiday —
   defaults to 2 nights, Fri–Sun), or `day_of` (single-day celebration). For
   beachfront / large rental homes, default to `family_stay` with `stayNights: 7`
   (a week) unless told otherwise.
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
10. Reload the dashboard — it fetches from Supabase on load, so the new row
    appears with no code change.

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
  rental cost for `family_stay` (default 7) and `weekend_rental` (default 2)
  venues with a weekly/per-night rate.
- `status`: `considering | shortlisted | contacted | quoted | booked | passed`.
  Default new items to `considering` unless Duncan says otherwise.
- **Category-specific detail** lives in three explicit lists (replacing the old
  `attributes` map), each answering one question the detail page always asks —
  every section renders (the inclusions checklist always shows the full standard
  set; add-ons/restrictions show "None recorded yet" when empty), so a gap stays
  visible rather than hidden:
  - `inclusions`: what the price covers, as a **standardized three-state
    checklist** — `{ key, state, note?, label? }`. `state` is `"yes"` (✓ covered),
    `"unknown"` (? not confirmed) or `"no"` (✗ explicitly excluded, e.g. catering
    you must arrange). The detail page renders the **full per-category checklist**
    (`INCLUSION_DEFS` in `src/lib/core.tsx` — e.g. for venues: tables & chairs,
    linens, catering, bar, coordinator, lighting, sound, restrooms, parking,
    dressing suite, tent, setup) for **every** item; an item that doesn't record a
    standard `key` shows it as `?`, so a gap is always visible. Use a standard
    `key` (label comes from the registry — keeps wording identical across venues);
    put the venue-specific qualifier in `note` ("basic", "seats 200", "white
    resin"). A highlight that isn't in the standard set (e.g. a private island,
    beach access) is an **extra**: a custom `key` plus its own `label`, rendered
    after the standard rows. e.g. `{ "key": "tables_chairs", "state": "yes",
    "note": "seats 200" }`, `{ "key": "catering", "state": "no", "note":
    "approved-list, billed separately" }`, `{ "key": "beach_access", "state":
    "yes", "label": "Private boardwalk beach access" }`.
  - `addOns`: optional paid extras — `{ label, price?, note? }`. `price` reuses
    the `Price` shape (`unit` lets you say per_hour / per_person / total). Add-on
    prices are **not** rolled into the budget (they're conditional). e.g.
    `{ "label": "Off-list caterer", "price": { "amount": 1000, "unit": "total" } }`.
  - `restrictions`: rules & limits — `{ label, note? }`. e.g.
    `{ "label": "Amplified music", "note": "Must end by 11pm" }`.
- `flags`: an array of `{ level, label, detail? }` caveats — `level` is
  `"unknown"` (an amber gap to confirm, e.g. catering policy not published) or
  `"warn"` (a red notice that conflicts with a preference, e.g. an
  approved-caterer-list requirement, or a price over the category limit). They
  render as warning pills in the Review tab and a notices block on the detail
  page, and survive the move into tracked options. Use them for caveats the
  computed budget/capacity/date fit flags can't see; don't duplicate those.
- `availability.openDates` (ISO `yyyy-mm-dd`): if any match a target date in
  `src/config.ts`, the venue is flagged as available for Duncan's dates.
- `notes`: Duncan's own commentary — the one field meant to be hand-edited.

### Settings — `src/config.ts`

Hand-set planner values (not from links): `BUDGET` (currently $30,000 USD),
`CURRENCY`, `GUEST_ESTIMATE`, `ASSUMED_STAY_NIGHTS` (7), and `TARGET_DATES`
(Duncan's target: a Saturday in late Aug or early Oct 2026). Editing these
re-renders the budget bar and date highlighting; they never touch option data.

### Preferences — the `preferences` table

Per-category planning steer Duncan sets in the **Preferences** tab: for each
category (`venue`, `photographer`, `catering`, `decor`) an optional `priceLimit`
(a spend ceiling for *that area*, in `CURRENCY` — tighter and more local than the
overall `BUDGET`) and a free-text `context` describing the vibe / style /
must-haves he wants. The shape is `Record<Category, { priceLimit?, context? }>`
(`Preferences` in `src/types.ts`); `src/data.ts` loads it into `PREFERENCES`
from the `preferences` table (one row per category).

Two consumers: the Preferences tab renders/edits it (saving via
`savePreferences` in `src/data.ts`, which upserts the rows), and **`/scout`
reads it** (SKILL.md step 1) — the `context` becomes search criteria and the
`priceLimit` becomes the category's budget flag. You can also edit the rows
directly in Supabase (or via the MCP).

## Scouting & the Review queue

The `/scout` skill (`.claude/skills/scout/`) finds candidate options Duncan
doesn't have links for yet. It casts a wide net, narrows to the **3–5 strongest**
candidates, and **researches each one properly** — using the same browser helper
the ingestion loop uses to pull real pricing (quote widgets), real date
availability (operating the calendar against `TARGET_DATES`), and a spread of
photo *URLs*. It writes one researched candidate per row into the `items` table
with `collection = 'review'` (an `Item` with `scoutNote`/`scoutedAt`) — use
`node scripts/db.mjs upsert <file.json> --review`. They appear under the
dashboard's **Review** tab for Duncan to triage:

- **Add** — promotes the candidate into the tracked options: `promoteCandidate`
  (`src/data.ts`) flips its `collection` to `'option'`, sets `status:
  considering` with today's `addedAt`, and drops the scout-only fields. Because
  Scout already did the pricing + availability research, the only ingestion work
  left is to **download the photos locally** to `public/photos/<id>/` (step 5)
  and rewrite `photos` to `/photos/<id>/NN.jpg` — plus re-confirm anything Scout
  left as unknown.
- **Dismiss** — inserts the candidate into the `dismissed_candidates` table and
  deletes the review row. **Every future `/scout` run must skip dismissed
  candidates** — the skill checks this ledger during de-dup.

These buttons (and the **Delete** button on every detail page) write straight to
Supabase through the browser via `src/data.ts` (`promoteCandidate`,
`dismissCandidate`, `deleteOption`) — no dev server needed, so they work in the
static build too. You can perform the same moves directly in Supabase if needed.

## Architecture

- **Vite + React + TypeScript**, hash-routed SPA, run locally.
- **Supabase (Postgres) is the database.** `src/lib/supabase.ts` holds the
  client (configured from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in
  `.env.local` — see `.env.example`). `src/data.ts` fetches everything once at
  bootstrap (`loadData()`, awaited in `main.tsx` before the app renders) into the
  same live exports the app has always used (`ALL_ITEMS`, `VENUES`,
  `REVIEW_ITEMS`, `DISMISSED`, `PREFERENCES`), and provides the mutation helpers
  (`promoteCandidate`, `dismissCandidate`, `deleteOption`, `savePreferences`)
  that write to Supabase and update those live stores in place.
- **Schema** (three tables, created by migrations on the Supabase project):
  - `items` — every option. The full `Item` lives in a `data` jsonb column;
    `id`, `type`, `name`, `venue_id` (supplier→venue FK, `on delete set null`)
    and `collection` (`'option'` tracked vs `'review'` Scout candidate) are
    promoted to columns for indexing. One table holds both tracked options and
    the Review queue, told apart by `collection`.
  - `preferences` — one row per category (`price_limit`, `context`).
  - `dismissed_candidates` — the dismissed ledger Scout de-dups against.
  - A public Storage bucket **`photos`** holds option images; `data.photos` are
    full public URLs into it (`node scripts/db.mjs photos` uploads + rewrites).
  - **Auth & RLS**: the app is gated behind Supabase Auth (email/password). RLS
    grants the `authenticated` role full CRUD and the `anon` role nothing, so the
    publishable key in the browser bundle is useless without a login — safe to
    publish. Photo *objects* stay publicly readable (so `<img>` works), but
    listing/writing the bucket needs auth. Schema lives in the Supabase project's
    migrations; `scripts/db.mjs` seeds/ingests; `src/database.types.ts` holds the
    generated row types. See "Auth & publishing" below.
- The legacy `data/<category>/*.json`, `data/review/*.json`,
  `data/dismissed.json` and `data/preferences.json` files remain as the original
  seed snapshot only — the app no longer reads them.
- `src/types.ts` — the data model. `src/config.ts` — hand-set settings.
  `src/lib/` — formatting, budget/stay rollups (`budget.ts`), date matching
  (`dates.ts`), Scout fit flags (`scout.ts`), and the per-category core registry
  (`core.tsx`). `core.tsx` owns `CORE_KEYS` (the ordered set of always-shown core
  facts per category) and resolves each core key from a typed struct (price,
  capacity, rating…); the `ItemDetail` core table and the `ComparePage` rows are
  both driven by it, so the core stays consistent across the factsheet and the
  comparison. The category-specific `inclusions` / `addOns` / `restrictions` lists
  render as the three always-shown detail sections on the detail page.
- Pages: `Overview` (venue dossiers, stat band, budget bar + target dates),
  `CategoryPage` (card grid), `ComparePage` (spec-sheet table with "best"
  flags), `ReviewPage` (Scout candidate triage — see below), `PreferencesPage`
  (per-category price limits & vibe context, fed to `/scout`), `ItemDetail`
  (with `PhotoGallery` + `Lightbox` for browsing photos).
- Design language: clean & minimal (Airbnb-inspired) — pure white surfaces,
  near-black ink (#222), neutral grays, a single coral accent (#FF385C), soft
  shadows, 8/12px radii, all-sans Inter typography. Defined in `src/styles.css`.

## Commands

- `npm run dev` — local dev server (hot reload). Needs `.env.local` (Supabase).
- `npm run build` — type-check + production build to `dist/`.
- `npm run preview` — serve the production build.
- `node scripts/db.mjs seed` — (re)load every `data/*.json` file into Supabase.
- `node scripts/db.mjs photos` — upload every `public/photos/<id>/` folder to the
  `photos` Storage bucket and rewrite the matching item's `photos` to public URLs.
- `node scripts/db.mjs upsert <file.json> [--review]` — upsert one option (or one
  Scout candidate with `--review`); the ingestion-loop path.

## Editing / removing options

- Change status, notes, or a venue link: edit the option's `items` row in
  Supabase — the simplest is to update the `data` jsonb (and the mirrored
  `venue_id` column if you change the pairing). Or re-author the `Item` JSON and
  `node scripts/db.mjs upsert <file.json>`.
- Remove an option: click **Delete** on its detail page (any category), which
  calls `deleteOption` (`src/data.ts`) to delete the row from Supabase **and**
  clear its `photos/<id>/` folder from Storage. Deleting a **venue** first
  unlinks its paired suppliers (sets their `venue_id` to `null`, moving them to
  "Not yet paired") rather than deleting them — so removing a venue never leaves
  a supplier pointing at one that's gone. (The local `public/photos/<id>/` seed
  copy, if any, stays on disk — harmless.)
- Re-link a supplier to a different venue: change its `venue_id` (and `venueId`
  inside `data`).

## Auth & publishing

The app is gated behind **Supabase Auth** (email/password) so it can be hosted
publicly: only the couple's accounts can read or write; RLS denies everyone else.

- **Login flow**: `src/auth.tsx` (the `Login` form, `AuthContext`, `signOut`) and
  the `Root` gate in `src/main.tsx`. The gate checks for a session, shows the
  login screen if there's none, and only then loads data and renders the app.
  Sessions persist in the browser, so a return visit skips the login. The
  signed-in email + a **Sign out** link live in the sidebar (`src/App.tsx`).
- **Accounts** are created with the admin-only SQL helper
  `select public.create_app_user('email@example.com', 'password');` (run via the
  Supabase MCP / SQL editor — `execute` is revoked from anon/authenticated). It
  sets the GoTrue token fields and the `auth.identities` row correctly. To add
  the fiancé (or anyone), call it with their email + a password. Change a
  password with `update auth.users set encrypted_password =
  extensions.crypt('new', extensions.gen_salt('bf')) where email = '…';`.
- **Scripts** (`scripts/db.mjs`) write as an authenticated user — they sign in
  with `SUPABASE_EMAIL` / `SUPABASE_PASSWORD` from `.env.local` (your own login)
  before any write.
- **Optional hardening** (Supabase dashboard → Authentication): enable *Leaked
  password protection*; disable public sign-ups if you ever turn them on (we
  create accounts by hand, so no open sign-up exists).

### Deploying (Vercel)

It's a static Vite SPA, so any static host works; Vercel is the smooth default:

1. Push the repo to GitHub and "Import Project" in Vercel (framework auto-detects
   as Vite; build `npm run build`, output `dist`).
2. In the Vercel project's **Environment Variables**, set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (same publishable values as `.env.local`; do **not**
   add the `SUPABASE_EMAIL`/`SUPABASE_PASSWORD` script vars — they aren't used by
   the app). Redeploy.
3. Add the deployed origin to Supabase → Authentication → URL Configuration
   (Site URL / redirect allow-list) so auth works from the hosted domain.

Because data + photos live in Supabase, adding venues later needs **no redeploy**
— only code changes do. The `data/*.json` and `public/photos/` files are the
original seed snapshot; they're not required by the deployed app.

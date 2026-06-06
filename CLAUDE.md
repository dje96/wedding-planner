# Wedding Planner — working notes for Claude

This is a local wedding-planning dashboard. It tracks and compares **venues,
photographers, catering and decor**, organised around the **venue** as the key:
every non-venue option links to the venue it's being considered for.

The defining principle: **no manual data entry by the user.** Duncan pastes a
link; Claude fetches it, extracts the details, and writes a data file. The
dashboard reads those files. That ingestion loop is the whole point — keep it
frictionless.

## How to add an option from a link

When Duncan pastes a URL (optionally saying which category, or which venue to
link it to):

1. **Fetch the page.** Prefer the `defuddle` skill (clean markdown, token-light)
   or `WebFetch`. Pull: name, price (and how it's charged), description, photo
   URLs, capacity, location, availability/dates, ratings/reviews, contact
   details, and anything category-specific.
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
5. **Photos**: store the remote image URLs directly (the dashboard hot-links
   them). Grab 2–3 good ones; the first is the hero image.
6. **Set `addedAt`** to today's date (ISO `yyyy-mm-dd`).
7. The dashboard hot-reloads — the new option appears with no code change.

If a page can't be fetched (login wall, JS-only), tell Duncan what's missing and
ask him to paste the key details, then still write the file.

### Schema quick reference

See `src/types.ts` for the authoritative shape. Key points:

- `price`: `{ amount, currency (default GBP), unit, note }`. `unit` is one of
  `total | per_person | per_hour | per_day | from`. Use `per_person` for
  catering — the dashboard multiplies it by the guest estimate for rollups.
- `status`: `considering | shortlisted | contacted | quoted | booked | passed`.
  Default new items to `considering` unless Duncan says otherwise.
- `attributes`: a free `{ key: value }` map for category-specific extras
  (photographer hours, corkage, accommodation, etc.). camelCase keys render
  nicely (e.g. `secondShooter` → "Second Shooter").
- `notes`: Duncan's own commentary — the one field meant to be hand-edited.

## Architecture

- **Vite + React + TypeScript**, hash-routed SPA, run locally.
- `data/<category>/*.json` is the database. `src/data.ts` globs it at build time
  (`import.meta.glob`), so adding/removing files is all it takes.
- `src/types.ts` — the data model. `src/lib/` — formatting and budget rollups.
- Pages: `Overview` (venue dossiers + stat band), `CategoryPage` (card grid),
  `ComparePage` (spec-sheet table with "best" flags), `ItemDetail`.
- Design language: editorial luxury — ivory paper, espresso ink, claret accent,
  Fraunces + Hanken Grotesk. Defined in `src/styles.css`.

## Commands

- `npm run dev` — local dev server (hot reload).
- `npm run build` — type-check + production build to `dist/`.
- `npm run preview` — serve the production build.

## Editing / removing options

- Change status, notes, or a venue link: edit the JSON file directly.
- Remove an option: delete its JSON file.
- Re-link a supplier to a different venue: change its `venueId`.

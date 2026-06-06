# The Wedding Edit

A local dashboard for tracking and comparing wedding options — **venues,
photographers, catering and decor** — organised around the venue. Each venue
anchors a "scenario": the suppliers you'd pair with it, and what the whole thing
would cost.

There's almost no manual data entry. You paste a link in chat, Claude pulls the
details (price, photos, description, capacity, ratings, contact…) and writes a
data file. The dashboard picks it up automatically.

## Getting started

```bash
npm install
npm run dev
```

Then open the URL it prints (default http://localhost:5173).

## Adding options

Paste a link to Claude, e.g.:

> add this venue: https://…
>
> here's a photographer for The Oak Barn: https://…

Claude fetches the page and writes a JSON file under `data/<category>/`. The
dashboard hot-reloads. See [`CLAUDE.md`](./CLAUDE.md) for the full ingestion
workflow and data schema.

## How it's organised

- **Overview** — every venue as a dossier, with its paired suppliers and an
  estimated scenario total. Unassigned suppliers sit in their own section.
- **Compare** — a spec-sheet table for any category, with the best price /
  rating / capacity flagged.
- **Category pages** — a card grid per category.
- **Item detail** — full breakdown, photo gallery, contact info, source link.

## The data

`data/<category>/*.json` is the database — one file per option. Edit a file to
change a status or note; delete a file to remove an option. The shipped files
(The Oak Barn, Riverside Mill, etc.) are **sample data** — delete them once you
start adding your own.

## Stack

Vite · React · TypeScript. No backend, no accounts, no API keys. Just files.

# Scout — curated seed sources

The per-category domains Scout queries **first** (the "seeded" half of the
hybrid search). After these, Scout runs open `WebSearch` to catch anything the
seed list misses, then merges and de-dupes.

**This file is meant to be edited.** When a domain dies, blocks fetching, or a
better one turns up for a region, change it here — the `SKILL.md` workflow
doesn't need touching. Seeds are international/UK/US-leaning; add regional sites
for the area being scouted.

## venue — `family_stay` (rental homes; wedding doubles as a holiday)

Large self-catering / whole-home rentals that sleep a wedding party. Prefer
sites that expose capacity and a nightly/weekly rate.

- `airbnb.com` — filter for whole homes, large group sizes
- `vrbo.com` — large group / event-friendly rentals
- `plumguide.com` — vetted high-end homes
- `oliverstravels.com` — large villas, explicitly party/wedding-friendly
- `boutique-retreats.co.uk` — large UK holiday homes
- `kateandtoms.com` — big houses marketed for groups/celebrations
- `holidaycottages.co.uk` / `sykescottages.co.uk` — large-group filters

Search shape: `site:<domain> large house <area> sleeps <guests>` ·
`"<area>" large holiday home wedding-friendly sleeps <guests>`

## venue — `day_of` (single-day celebration venues)

Dedicated wedding venues and event spaces.

- `hitched.co.uk` — UK wedding venue directory
- `weddingwire.com` / `theknot.com` — US wedding venue directories
- `bridebook.com` — UK venue directory with capacities/prices
- `guidesforbrides.co.uk` — UK venue directory
- `venuereport.com` — editorial venue discovery
- `coolstays.com` — characterful venues, some wedding-licensed
- Local/National Trust, estate, barn, and vineyard venue sites for the region

Search shape: `"<area>" wedding venue <guests> guests` ·
`site:hitched.co.uk <area> wedding venue` ·
`<area> barn|estate|vineyard wedding venue capacity <guests>`

## photographer

Portfolio sites + directories. Anchor to the venue's region.

- `hitched.co.uk` / `weddingwire.com` / `theknot.com` — supplier directories
- `bridebook.com` — photographer listings
- `instagram.com` — search `<area> wedding photographer` (then find their site)
- Individual portfolio domains surfaced via open search

Search shape: `"<area>" wedding photographer` ·
`<area> documentary|fine-art wedding photographer portfolio`

## catering

Event/wedding caterers serving the venue's region; note per-head pricing and
corkage where stated.

- `hitched.co.uk` / `weddingwire.com` — catering supplier directories
- `bridebook.com` — caterer listings
- Local wedding/event caterer sites for the region (open search)

Search shape: `"<area>" wedding caterer per head` ·
`<area> event catering wedding <guests> guests`

## decor

Florists, stylists, prop/hire, lighting. Anchor to the venue's region.

- `hitched.co.uk` / `weddingwire.com` — decor & florist directories
- `bridebook.com` — florist/stylist listings
- `instagram.com` — `<area> wedding florist|stylist`
- Local florist / event-hire / styling sites (open search)

Search shape: `"<area>" wedding florist|stylist` ·
`<area> wedding decor hire prop styling`

## Notes

- Honour the price-unit conventions in `CLAUDE.md` when reading rates:
  rental homes → `per_night` / `per_week`; caterers → `per_person`;
  photographers → package `total` or `per_hour`.
- Some sites block automated fetching (login walls, heavy JS). If a candidate's
  page can't be fetched during light-enrich, keep it on the shortlist with
  "details unverified" rather than dropping it — the gaps get filled at
  ingestion, where Duncan can paste details if needed.

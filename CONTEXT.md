# Wedding Planner

A local dashboard for tracking and comparing wedding options (venues,
photographers, catering, decor), organised around the venue as the key.

## Language

**Option**:
Any tracked candidate — a venue, photographer, caterer or decor supplier —
stored as one JSON file under `data/`. The unit the dashboard compares.
_Avoid_: Item (that's the code type name), entry, listing.

**Venue**:
The organising option. Every non-venue option references the venue it is being
considered for via `venueId`. Splits into `family_stay` and `day_of`.

**Ingestion**:
Turning one *known* link into one stored option — fetch the page, extract
details, download photos, write the JSON file. The existing loop in CLAUDE.md.
_Avoid_: Import, scrape, adding.

**Scout** (verb / the act):
Starting from *criteria* (location plus preferences), searching the web to
surface candidate options you did not already have links for, then deeply
researching the 3–5 strongest — real pricing (quote widgets), date availability
(operating the calendar), and photo URLs — and writing them into the Review
queue. Only the local photo download and final promotion are deferred to
Ingestion, which fires on Add. Invoked as `/scout`.
_Avoid_: Discovery, search, sourcing, research (too vague).

**Candidate**:
An option surfaced by a Scout run but not yet a tracked Option. It lives as a
file in the Review queue (`data/review/<slug>.json`) — researched at scout time
with real price, capacity, availability and photo URLs, plus a `scoutNote`
reason it fits. Becomes an Option when you **Add** it; Ingestion then downloads
its photos locally and files it.
_Avoid_: Result, hit, match, lead.

**Review queue**:
The set of Candidates awaiting triage, stored as files under `data/review/` and
shown in the dashboard's **Review** tab. Per candidate you **Add** (promote to a
tracked Option; Ingestion then downloads its photos locally) or **Dismiss**.
Replaces the old ephemeral chat-only shortlist.
_Avoid_: Inbox, queue (unqualified), backlog.

**Dismiss / Dismissed ledger**:
To **Dismiss** a Candidate is to reject it from the Review queue. Dismissed
candidates are recorded in the **dismissed ledger** (`data/dismissed.json`) so
every future Scout run skips them — they are never resurfaced.
_Avoid_: Reject, archive, trash, pass (Pass is an Option status, not this).

**Anchor venue**:
The existing venue a non-venue Scout run is anchored to. The run inherits its
location and dates, and stamps every resulting Candidate with its `venueId`.
When no anchor is given, non-venue Candidates are unassigned (`venueId: null`).
Venue scouting has no anchor — it works from raw criteria.

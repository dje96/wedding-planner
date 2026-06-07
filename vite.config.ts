import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// The `data/` directory at the project root is the "database": one JSON file
// per option, grouped by category. It lives outside `src/` on purpose so it
// reads like data, not code. The glob import in `src/data.ts` loads every file
// and picks up new ones on hot reload.
const DATA_DIR = resolve(__dirname, "data");
const REVIEW_DIR = join(DATA_DIR, "review");
const DISMISSED_FILE = join(DATA_DIR, "dismissed.json");
const PREFERENCES_FILE = join(DATA_DIR, "preferences.json");

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const today = () => new Date().toISOString().slice(0, 10);

// The `type` field is singular ("venue"), but options are filed under plural,
// human-friendly directories ("data/venues/"). Reuse whichever directory that
// category already lives in, else fall back to the conventional plural name.
const CATEGORY_DIR: Record<string, string> = {
  venue: "venues",
  photographer: "photographers",
  catering: "catering",
  decor: "decor",
};
function optionDir(type: string): string {
  for (const name of [type, `${type}s`, CATEGORY_DIR[type]]) {
    if (name && existsSync(join(DATA_DIR, name))) return join(DATA_DIR, name);
  }
  return join(DATA_DIR, CATEGORY_DIR[type] ?? `${type}s`);
}

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

/**
 * Dev-only triage endpoint for the Review tab. The dashboard is otherwise a
 * pure static read of `data/`, so these two routes are the one place the
 * browser is allowed to mutate files — and only while `npm run dev` runs.
 *
 *   POST /__review/add      { id } → promote a candidate to a tracked option
 *   POST /__review/dismiss  { id } → drop it and log it to dismissed.json
 *
 * `add` deliberately does NOT fetch photos or check the live calendar (only
 * Claude's ingestion loop can); it just moves the file in as `considering`, to
 * be enriched on a follow-up pass.
 */
function reviewApi(): Plugin {
  return {
    name: "wedding-review-api",
    apply: "serve",
    configureServer(server) {
      const handle = (action: "add" | "dismiss") => async (req: any, res: any) => {
        const json = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        try {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const { id } = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");

          if (typeof id !== "string" || !SLUG.test(id)) {
            return json(400, { error: "bad or missing id" });
          }
          const reviewFile = join(REVIEW_DIR, `${id}.json`);
          if (!existsSync(reviewFile)) {
            return json(404, { error: `no candidate ${id} in review` });
          }
          const item = readJson<Record<string, any>>(reviewFile, {});

          if (action === "dismiss") {
            const ledger = readJson<{ dismissed: any[] }>(DISMISSED_FILE, { dismissed: [] });
            if (!Array.isArray(ledger.dismissed)) ledger.dismissed = [];
            if (!ledger.dismissed.some((d) => d.id === id || (d.url && d.url === item.url))) {
              ledger.dismissed.push({
                id,
                name: item.name ?? id,
                url: item.url ?? "",
                category: item.type ?? "venue",
                dismissedAt: today(),
              });
            }
            writeFileSync(DISMISSED_FILE, JSON.stringify(ledger, null, 2) + "\n");
            rmSync(reviewFile);
            return json(200, { ok: true, action });
          }

          // add → promote to a tracked option, drop the scout-only fields.
          const { scoutNote, scoutedAt, ...rest } = item;
          const promoted = { ...rest, status: rest.status ?? "considering", addedAt: today() };
          const dest = join(optionDir(String(item.type ?? "venue")), `${id}.json`);
          mkdirSync(dirname(dest), { recursive: true });
          writeFileSync(dest, JSON.stringify(promoted, null, 2) + "\n");
          rmSync(reviewFile);
          return json(200, { ok: true, action, enrich: true });
        } catch (err) {
          return json(500, { error: err instanceof Error ? err.message : String(err) });
        }
      };

      server.middlewares.use("/__review/add", handle("add"));
      server.middlewares.use("/__review/dismiss", handle("dismiss"));
    },
  };
}

/**
 * Dev-only endpoint backing the Preferences tab. Like the review routes, this is
 * the one place the browser may write to `data/`, and only while `npm run dev`
 * runs.
 *
 *   POST /__preferences/save  { preferences } → overwrite data/preferences.json
 *
 * The body is sanitised to the known shape (one entry per category, each with an
 * optional numeric `priceLimit` and string `context`) so a malformed POST can't
 * write junk into the file the dashboard and `/scout` both read.
 */
const PREF_CATEGORIES = ["venue", "photographer", "catering", "decor"] as const;

function sanitisePreferences(input: any): Record<string, { priceLimit?: number; context?: string }> {
  const out: Record<string, { priceLimit?: number; context?: string }> = {};
  for (const cat of PREF_CATEGORIES) {
    const entry = input && typeof input === "object" ? input[cat] : undefined;
    const clean: { priceLimit?: number; context?: string } = {};
    if (entry && typeof entry === "object") {
      const limit = Number(entry.priceLimit);
      if (Number.isFinite(limit) && limit >= 0) clean.priceLimit = limit;
      if (typeof entry.context === "string" && entry.context.trim()) {
        clean.context = entry.context.trim();
      }
    }
    out[cat] = clean;
  }
  return out;
}

function preferencesApi(): Plugin {
  return {
    name: "wedding-preferences-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__preferences/save", async (req: any, res: any) => {
        const json = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        try {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
          const preferences = sanitisePreferences(body.preferences);
          writeFileSync(PREFERENCES_FILE, JSON.stringify(preferences, null, 2) + "\n");
          return json(200, { ok: true, action: "save", preferences });
        } catch (err) {
          return json(500, { error: err instanceof Error ? err.message : String(err) });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), reviewApi(), preferencesApi()],
});

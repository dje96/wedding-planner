#!/usr/bin/env node
// Supabase data CLI for the wedding planner.
//
//   node scripts/db.mjs seed                 — load every data/*.json into Supabase
//   node scripts/db.mjs upsert <file.json>   — upsert one tracked option
//   node scripts/db.mjs upsert <file.json> --review   — upsert one Scout candidate
//
// Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.local (or the
// environment). The `items` table stores the full Item in a `data` jsonb column,
// mirroring type / collection / venue_id into real columns. This is the bridge
// used by the ingestion loop (CLAUDE.md): compose an Item, then upsert it here.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data");

// -- env -------------------------------------------------------------------
function loadEnv() {
  const env = { ...process.env };
  const file = join(ROOT, ".env.local");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (.env.local).");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// Writes are gated behind Supabase Auth (RLS allows only authenticated users), so
// the script signs in with your account first. Put SUPABASE_EMAIL / SUPABASE_PASSWORD
// in .env.local (your own login).
async function authenticate() {
  const email = env.SUPABASE_EMAIL;
  const password = env.SUPABASE_PASSWORD;
  if (!email || !password) {
    console.error(
      "Missing SUPABASE_EMAIL / SUPABASE_PASSWORD in .env.local — needed to write " +
        "(the database only accepts authenticated writes).",
    );
    process.exit(1);
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("Sign-in failed:", error.message);
    process.exit(1);
  }
}

// -- mapping ---------------------------------------------------------------
function itemToRow(item, collection) {
  return {
    id: item.id,
    type: item.type,
    collection,
    venue_id: item.type !== "venue" ? (item.venueId ?? null) : null,
    name: item.name,
    data: item,
  };
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

// -- commands --------------------------------------------------------------
async function seed() {
  const itemRows = [];
  const names = readdirSync(DATA_DIR);

  // Tracked options live in per-category dirs; review candidates in data/review.
  for (const name of names) {
    const dir = join(DATA_DIR, name);
    if (!statSync(dir).isDirectory()) continue;
    const collection = name === "review" ? "review" : "option";
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      const item = readJson(join(dir, f));
      if (!item?.id || !item?.type) continue;
      itemRows.push(itemToRow(item, collection));
    }
  }

  // Order options before reviews and venues before suppliers so the self FK
  // (venue_id → items.id) always resolves.
  itemRows.sort((a, b) => {
    const rank = (r) => (r.type === "venue" ? 0 : 1) + (r.collection === "review" ? 2 : 0);
    return rank(a) - rank(b);
  });

  const { error: itemErr } = await supabase
    .from("items")
    .upsert(itemRows, { onConflict: "id" });
  if (itemErr) throw itemErr;
  console.log(`✓ upserted ${itemRows.length} items`);

  const prefsFile = join(DATA_DIR, "preferences.json");
  if (existsSync(prefsFile)) {
    const prefs = readJson(prefsFile);
    const rows = Object.entries(prefs).map(([category, v]) => ({
      category,
      price_limit: v?.priceLimit ?? null,
      context: v?.context?.trim() || null,
    }));
    const { error } = await supabase.from("preferences").upsert(rows, { onConflict: "category" });
    if (error) throw error;
    console.log(`✓ upserted ${rows.length} preference rows`);
  }

  const dismissedFile = join(DATA_DIR, "dismissed.json");
  if (existsSync(dismissedFile)) {
    const { dismissed = [] } = readJson(dismissedFile);
    const rows = dismissed.map((d) => ({
      id: d.id,
      name: d.name ?? d.id,
      url: d.url ?? "",
      category: d.category,
      reason: d.reason ?? null,
      dismissed_at: d.dismissedAt ?? undefined,
    }));
    if (rows.length) {
      const { error } = await supabase
        .from("dismissed_candidates")
        .upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }
    console.log(`✓ upserted ${rows.length} dismissed candidates`);
  }
}

// Natural sort so 01.jpg … 10.jpg keep order (hero photo first).
const natSort = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

async function uploadPhotos() {
  const photosDir = join(ROOT, "public", "photos");
  if (!existsSync(photosDir)) {
    console.log("no public/photos directory — nothing to upload");
    return;
  }
  const ids = readdirSync(photosDir).filter((n) => {
    try {
      return statSync(join(photosDir, n)).isDirectory();
    } catch {
      return false;
    }
  });

  const TYPE = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

  for (const id of ids) {
    const dir = join(photosDir, id);
    const files = readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f))
      .sort(natSort);
    if (!files.length) continue;

    const urls = [];
    for (const f of files) {
      const key = `${id}/${f}`;
      const body = readFileSync(join(dir, f));
      const ext = f.split(".").pop().toLowerCase();
      const { error } = await supabase.storage
        .from("photos")
        .upload(key, body, { contentType: TYPE[ext] ?? "application/octet-stream", upsert: true });
      if (error) throw error;
      urls.push(supabase.storage.from("photos").getPublicUrl(key).data.publicUrl);
    }

    // Rewrite this item's photos to the Storage public URLs (only if it exists
    // and currently points at local /photos paths or has none of these URLs).
    const { data: rows, error: selErr } = await supabase
      .from("items")
      .select("data")
      .eq("id", id)
      .limit(1);
    if (selErr) throw selErr;
    if (rows?.length) {
      const item = rows[0].data ?? {};
      item.photos = urls;
      const { error: updErr } = await supabase.from("items").update({ data: item }).eq("id", id);
      if (updErr) throw updErr;
    }
    console.log(`✓ ${id}: uploaded ${files.length} photo(s)` + (rows?.length ? " + rewrote item.photos" : " (no matching item)"));
  }
}

async function upsert(file, review) {
  const item = readJson(resolve(file));
  if (!item?.id || !item?.type) throw new Error("file is missing id/type");
  const { error } = await supabase
    .from("items")
    .upsert(itemToRow(item, review ? "review" : "option"), { onConflict: "id" });
  if (error) throw error;
  console.log(`✓ upserted ${item.id} (${review ? "review" : "option"})`);
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  await authenticate();
  if (cmd === "seed") await seed();
  else if (cmd === "photos") await uploadPhotos();
  else if (cmd === "upsert") {
    const file = rest.find((a) => !a.startsWith("--"));
    if (!file) throw new Error("usage: upsert <file.json> [--review]");
    await upsert(file, rest.includes("--review"));
  } else {
    console.error("usage: node scripts/db.mjs seed | photos | upsert <file.json> [--review]");
    process.exit(1);
  }
} catch (err) {
  console.error("✗", err.message ?? err);
  process.exit(1);
}

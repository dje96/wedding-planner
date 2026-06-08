// The Supabase client — the wedding planner's database connection.
//
// Connection details come from Vite env vars (see .env.local / .env.example).
// The publishable (anon) key is safe in the browser: row access is governed by
// RLS policies on the database, not by hiding the key.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase config. Copy .env.example to .env.local and fill in " +
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (find them in the Supabase " +
      "dashboard → Project Settings → API).",
  );
}

export const supabase = createClient<Database>(url, anonKey);

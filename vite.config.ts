import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The wedding planner reads and writes its data directly from Supabase (see
// src/lib/supabase.ts and src/data.ts), so the dev server is now a plain Vite +
// React setup — no file-mutating endpoints. The app behaves the same whether
// run via `npm run dev` or served as a static `npm run build`, because all
// mutations go to Supabase over the network rather than to local files.
export default defineConfig({
  plugins: [react()],
});

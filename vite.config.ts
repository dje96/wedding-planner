import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The `data/` directory at the project root is the "database": one JSON file
// per option, grouped by category. It lives outside `src/` on purpose so it
// reads like data, not code. The glob import in `src/data.ts` loads every file
// and picks up new ones on hot reload.
export default defineConfig({
  plugins: [react()],
});

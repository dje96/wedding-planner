// Thin client for the dev-only file-mutating endpoints defined in
// vite.config.ts (`/__review/*`, `/__option/*`). The dashboard is otherwise a
// pure static read of `data/`, so these only work while `npm run dev` runs; a
// static build has no such routes and the fetch 404s / fails to connect. Call
// sites use `isDevServerMissing` to turn that into a helpful hint.

/** POST a dev mutation and return the parsed JSON, throwing on a non-2xx. */
export async function devMutate(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json().catch(() => ({}));
}

/** True when an error looks like "there's no dev server answering" rather than
 *  a real server-side failure — i.e. the route doesn't exist (static build). */
export function isDevServerMissing(err: unknown): boolean {
  return err instanceof Error && /404|Failed to fetch|NetworkError/.test(err.message);
}

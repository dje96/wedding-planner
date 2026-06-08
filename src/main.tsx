import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import "./styles.css";
import { App } from "./App";
import { Overview } from "./pages/Overview";
import { CategoryPage } from "./pages/CategoryPage";
import { ComparePage } from "./pages/ComparePage";
import { ReviewPage } from "./pages/ReviewPage";
import { PreferencesPage } from "./pages/PreferencesPage";
import { ItemDetail } from "./pages/ItemDetail";
import { loadData } from "./data";
import { supabase } from "./lib/supabase";
import { AuthContext, Login, signOut } from "./auth";

// Hash routing keeps the app a pure static site — no server rewrites needed
// when opened from the built files or the dev server.
const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Overview /> },
      { path: "compare", element: <ComparePage /> },
      { path: "review", element: <ReviewPage /> },
      { path: "preferences", element: <PreferencesPage /> },
      { path: "category/:category", element: <CategoryPage /> },
      { path: "item/:id", element: <ItemDetail /> },
    ],
  },
]);

function Splash({ children }: { children: React.ReactNode }) {
  return <div className="boot-splash">{children}</div>;
}

// The gate: check for a Supabase session, show the login screen if there's none,
// and only load the data + render the app once signed in. Data is read
// synchronously across the app (see src/data.ts) after this single up-front load.
type DataPhase = "loading" | "ready" | "error";

function Root() {
  // `undefined` = still checking for a stored session; `null` = signed out.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [phase, setPhase] = useState<DataPhase>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return; // not signed in (or still checking) — nothing to load
    setPhase("loading");
    loadData()
      .then(() => setPhase("ready"))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      });
  }, [session]);

  if (session === undefined) return <Splash>Loading…</Splash>;
  if (!session) return <Login />;
  if (phase === "loading") return <Splash>Loading your planner…</Splash>;
  if (phase === "error") {
    return (
      <Splash>
        <div className="boot-error">
          <h1>Couldn't load your planner</h1>
          <p>You're signed in, but the dashboard couldn't reach Supabase.</p>
          <pre>{error}</pre>
          <button className="btn btn-ghost" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </Splash>
    );
  }

  return (
    <AuthContext.Provider value={{ email: session.user.email ?? null, signOut }}>
      <RouterProvider router={router} />
    </AuthContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

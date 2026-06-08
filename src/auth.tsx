import { createContext, useContext, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";

// Auth context: the logged-in user's email and a sign-out action, provided by the
// Root gate (main.tsx) and read by the sidebar (App.tsx).
export interface AuthState {
  email: string | null;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  email: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** The login screen shown when there's no session. On success, Supabase fires an
 *  auth-state change that the Root gate listens for, swapping in the app. */
export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
    // On success we leave `busy` true — the auth-state change unmounts this form.
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <span className="mark-the">The</span>
          <span className="mark-main">Wedding Edit</span>
          <div className="mark-rule" />
        </div>
        <p className="login-lede">Sign in to view and manage your wedding plans.</p>

        {error && <div className="review-banner">{error}</div>}

        <label className="login-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="login-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

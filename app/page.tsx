"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Flower2, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Feedback } from "@/components/feedback";
import { PasswordField } from "@/components/password-field";
import { ApiError, callApi, errorMessage } from "@/lib/client";

export default function LoginPage() {
  const { user, checked, notice, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invalidCredentials, setInvalidCredentials] = useState(false);
  const [connection, setConnection] = useState<"connecting" | "ready" | "unavailable">("connecting");

  useEffect(() => { if (checked && user) router.replace("/dashboard"); }, [checked, user, router]);

  useEffect(() => {
    const controller = new AbortController();
    // One public GET / on the live backend starts waking Render while you type.
    callApi("health", { signal: controller.signal })
      .then(() => setConnection("ready"))
      .catch(() => { if (!controller.signal.aborted) setConnection("unavailable"); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (invalidCredentials && !busy) document.getElementById("password")?.focus();
  }, [invalidCredentials, busy]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !checked) return;
    setBusy(true);
    setError("");
    setInvalidCredentials(false);
    try {
      await login(username, password);
      router.replace("/dashboard");
    } catch (cause) {
      setError(errorMessage(cause));
      setInvalidCredentials(cause instanceof ApiError && cause.status === 401);
      setBusy(false);
    }
  }

  return (
    <main id="main-content" className="login-main">
      <section className="login-card" aria-labelledby="login-title">
        <span className="login-emblem"><Flower2 aria-hidden="true" /></span>
        <p className="eyebrow">THE PANIMDIM WORKSPACE</p>
        <h1 id="login-title">Welcome <em>back.</em></h1>
        <p className="login-description">A little space for the people behind the blooms.</p>
        {notice ? <Feedback tone="info">{notice}</Feedback> : null}
        <form onSubmit={submit} className="login-form" aria-busy={busy}>
          <div className="field"><label htmlFor="username">Username</label><div className={`input-wrap${invalidCredentials ? " input-invalid" : ""}`}><UserRound className="input-icon" aria-hidden="true" /><input id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Your username" required disabled={busy} aria-invalid={invalidCredentials || undefined} aria-describedby={error ? "login-error" : undefined} /></div></div>
          <PasswordField id="password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" required disabled={busy} describedBy={error ? "login-error" : undefined} invalid={invalidCredentials} />
          {error ? <div id="login-error"><Feedback>{error}</Feedback></div> : null}
          <button type="submit" className="button button-primary login-submit" disabled={busy || !checked}><span>{busy ? "Signing in…" : checked ? "Sign in" : "Restoring your session…"}</span>{busy || !checked ? <LoaderCircle className="spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}</button>
        </form>
        <p className="login-access"><ShieldCheck aria-hidden="true" />For staff, admins, and shop owners.</p>
      </section>
      <div className="connection-note" role="status">
        {connection === "connecting" ? <><LoaderCircle className="spin" aria-hidden="true" /><span>Connecting to the shop server…<small>The first connection may take about a minute.</small></span></>
          : connection === "ready" ? <><span className="connection-dot" /><span>The shop server is ready.</span></>
            : <><ShieldCheck aria-hidden="true" /><span>Cannot connect yet. You can still try signing in.</span></>}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Flower2, LoaderCircle, LogOut, Moon, ShieldCheck, Sun } from "lucide-react";
import { useAuth } from "./auth-provider";
import { Dialog } from "./dialog";
import { Feedback } from "./feedback";
import { errorMessage } from "@/lib/client";

export function SiteHeader() {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleTheme() {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#0d1610" : "#fdfaf4");
    setDark(next);
  }

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await logout(); setConfirming(false); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href={user ? "/dashboard" : "/"} className="brand" aria-label="Panimdim administration home">
            <span className="brand-mark"><Flower2 aria-hidden="true" /></span>
            <span className="brand-copy"><strong translate="no">panimdim.</strong><span>FLOWER SHOP</span></span>
          </Link>
          <div className="header-actions">
            {user ? <><p className="greeting">Hello, <strong>{user.username}</strong></p><span className="header-role"><ShieldCheck aria-hidden="true" />{user.role}</span></> : <span className="header-caption">A thoughtful space for your team.</span>}
            <button type="button" className="icon-button theme-toggle" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} aria-pressed={dark} onClick={toggleTheme}>{dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</button>
            {user ? <button type="button" className="button button-outline signout-button" aria-label="Sign out" onClick={() => { setError(""); setConfirming(true); }}><LogOut aria-hidden="true" /><span>Sign out</span></button> : null}
          </div>
        </div>
      </header>
      {confirming ? (
        <Dialog title="Sign out of your workspace?" description="Are you sure you want to sign out? You can return to your workspace whenever you are ready." busy={busy} onClose={() => setConfirming(false)}>
          <div className="dialog-symbol"><LogOut aria-hidden="true" /></div>
          {error ? <Feedback>{error}</Feedback> : null}
          <div className="dialog-actions"><button type="button" className="button button-outline" autoFocus disabled={busy} onClick={() => setConfirming(false)}>No, stay here</button><button type="button" className="button button-primary" disabled={busy} onClick={() => void signOut()}>{busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />}{busy ? "Signing out…" : "Yes, sign out"}</button></div>
        </Dialog>
      ) : null}
    </>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { ApiError, callApi, type AuthenticatedRequest } from "@/lib/client";
import { loginSchema, sessionSchema, type Identity } from "@/lib/contracts";

type AuthContextValue = {
  user: Identity | null;
  checked: boolean;
  notice: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  request: AuthenticatedRequest;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Identity | null>(null);
  const [checked, setChecked] = useState(false);
  const [notice, setNotice] = useState("");
  const refreshInFlight = useRef<Promise<Identity> | null>(null);

  const refreshSession = useCallback((): Promise<Identity> => {
    if (!refreshInFlight.current) {
      refreshInFlight.current = callApi("auth/refresh", { method: "POST", body: {} })
        .then((data) => {
          const session = sessionSchema.parse(data);
          if (!session.user) throw new ApiError("Your session has ended. Please sign in again.", 401);
          setUser(session.user);
          return session.user;
        })
        .finally(() => { refreshInFlight.current = null; });
    }
    return refreshInFlight.current;
  }, []);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const data = sessionSchema.parse(await callApi("auth/session"));
        if (active) setUser(data.user);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          try { await refreshSession(); }
          catch { if (active) { setUser(null); setNotice("Your session has ended. Please sign in again."); } }
        } else if (active) setNotice("We could not restore your session. Please sign in again.");
      } finally { if (active) setChecked(true); }
    }
    void restore();
    return () => { active = false; };
  }, [refreshSession]);

  const login = useCallback(async (username: string, password: string) => {
    const body = loginSchema.parse({ username, password });
    const session = sessionSchema.parse(await callApi("auth/login", { method: "POST", body }));
    if (!session.user) throw new ApiError("We could not sign you in. Please try again.", 401);
    setNotice("");
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    const result = z.object({ ok: z.literal(true), warning: z.string().optional() }).parse(await callApi("auth/logout", { method: "POST", body: {} }));
    setUser(null);
    setNotice(result.warning || "You are signed out. See you again soon.");
  }, []);

  const request = useCallback<AuthenticatedRequest>(async (path, options) => {
    try { return await callApi(path, options); }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      try { await refreshSession(); }
      catch {
        setUser(null);
        setNotice("Your session has ended. Please sign in again.");
        throw new ApiError("Your session has ended. Please sign in again.", 401);
      }
      // A 401 rejects the original action before the backend writes any data.
      // Network failures and other write errors are never automatically retried.
      try { return await callApi(path, options); }
      catch (retryError) {
        if (retryError instanceof ApiError && retryError.status === 401) {
          setUser(null);
          setNotice("Your session has ended. Please sign in again.");
        }
        throw retryError;
      }
    }
  }, [refreshSession]);

  return <AuthContext.Provider value={{ user, checked, notice, login, logout, request }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth requires AuthProvider.");
  return context;
}

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export class BackendError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "BackendError";
  }
}

type BackendOptions = { method?: string; body?: unknown; token?: string; timeout?: number };

// Only server routes call the live backend. Tokens never enter browser storage.
export async function backend(path: string, { method = "GET", body, token, timeout = 95000 }: BackendOptions = {}): Promise<unknown> {
  const base = process.env.API_URL || "https://backend-1-po8y.onrender.com";
  const url = new URL(base);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password || url.search || url.hash) {
    throw new BackendError("The server connection is not configured correctly.", 500);
  }
  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`, {
      method, headers, cache: "no-store",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
  } catch {
    if (path.startsWith("auth/")) throw new BackendError("Cannot reach the shop server yet. It may be waking up. Please try again shortly.");
    throw new BackendError(method === "GET"
      ? "We cannot reach the shop server yet. It may be waking up. Please try again shortly."
      : "We could not confirm the response. The request may have completed. Refresh before trying again.");
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "Check the details and try again.",
      401: "Your session has ended. Please sign in again.",
      403: "This account does not have permission to manage users.",
      404: "This user could not be found. Refresh the list and try again.",
      409: "That username is already taken. Please choose another.",
      429: "Too many requests. Wait a moment and try again.",
    };
    const message = path === "auth/login" && [400, 401].includes(response.status)
      ? "Wrong username or password."
      : messages[response.status] || (method === "GET"
        ? "The shop server is unavailable. Please try again shortly."
        : "We could not confirm the change. Refresh the list before submitting again; it may already be saved.");
    throw new BackendError(message, response.status >= 500 ? 502 : response.status);
  }
  return data;
}

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof BackendError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError) return json({ error: error.issues[0]?.message || "Check the details and try again." }, 400);
  return json({ error: "The request could not finish. Please try again." }, 500);
}

export function requireSameOrigin(request: NextRequest): void {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    throw new BackendError("This request is not allowed.", 403);
  }
}

export async function readJson(request: NextRequest): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new BackendError("Send the form as JSON.", 415);
  }
  try { return await request.json(); }
  catch { throw new BackendError("The form could not be read. Please try again.", 400); }
}

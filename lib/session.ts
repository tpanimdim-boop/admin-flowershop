import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BackendError } from "./backend";
import { identitySchema, isStaff, type Identity, type TokenPair } from "./contracts";

export const ACCESS_COOKIE = "panimdim_admin_access";
export const REFRESH_COOKIE = "panimdim_admin_refresh";

const claimsSchema = z.object({
  sub: z.number().int().positive(), username: z.string().min(1), role: z.string().min(1), exp: z.number().positive().optional(),
});

function claims(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new BackendError("The session response could not be read. Please sign in again.", 401);
  let payload: unknown;
  try { payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")); }
  catch { throw new BackendError("The session response could not be read. Please sign in again.", 401); }
  const parsed = claimsSchema.safeParse(payload);
  if (!parsed.success) throw new BackendError("The session response is incomplete. Please sign in again.", 401);
  return parsed.data;
}

// Claims supply display details only. The live backend authorizes every CRUD call.
export function displayIdentity(token: string): Identity {
  const payload = claims(token);
  return identitySchema.parse({ id: payload.sub, username: payload.username, role: payload.role });
}

export function accessToken(request: NextRequest): string {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) throw new BackendError("Please sign in to continue.", 401);
  return token;
}

export function sessionExpired(token: string): boolean {
  const payload = claims(token);
  return Boolean(payload.exp && payload.exp <= Date.now() / 1000 + 10);
}

export function attachSession(response: NextResponse, pair: TokenPair): Identity {
  const user = displayIdentity(pair.accessToken);
  if (!isStaff(user.role)) throw new BackendError("This workspace is for staff, admins, and owners. Ask the shop owner for access.", 403);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  const now = Math.floor(Date.now() / 1000);
  response.cookies.set(ACCESS_COOKIE, pair.accessToken, { ...options, maxAge: Math.max(1, Math.min((claims(pair.accessToken).exp || now + 900) - now, 86400)) });
  response.cookies.set(REFRESH_COOKIE, pair.refreshToken, { ...options, maxAge: Math.max(1, Math.min((claims(pair.refreshToken).exp || now + 604800) - now, 2592000)) });
  return user;
}

export function clearSession(response: NextResponse): NextResponse {
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 0 };
  response.cookies.set(ACCESS_COOKIE, "", options);
  response.cookies.set(REFRESH_COOKIE, "", options);
  return response;
}

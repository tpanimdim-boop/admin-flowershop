import { NextRequest } from "next/server";
import { errorResponse, json } from "@/lib/backend";
import { isStaff } from "@/lib/contracts";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSession, displayIdentity, sessionExpired } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(ACCESS_COOKIE)?.value;
    if (!token) return request.cookies.has(REFRESH_COOKIE)
      ? json({ error: "Please restore your session." }, 401)
      : json({ user: null });
    if (sessionExpired(token)) return json({ error: "Please restore your session." }, 401);
    const user = displayIdentity(token);
    return isStaff(user.role) ? json({ user }) : clearSession(json({ user: null }));
  } catch (error) { return clearSession(errorResponse(error)); }
}

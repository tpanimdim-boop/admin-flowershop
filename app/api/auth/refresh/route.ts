import { NextRequest } from "next/server";
import { backend, BackendError, errorResponse, json, requireSameOrigin } from "@/lib/backend";
import { tokenPairSchema } from "@/lib/contracts";
import { REFRESH_COOKIE, attachSession, clearSession, displayIdentity } from "@/lib/session";

export async function POST(request: NextRequest) {
  try { requireSameOrigin(request); }
  catch (error) { return errorResponse(error); }
  try {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) throw new BackendError("Your session has ended. Please sign in again.", 401);
    const data = await backend("auth/refresh", { method: "POST", body: { refreshToken } });
    const pair = tokenPairSchema.safeParse(data);
    if (!pair.success) throw new BackendError("Your session has ended. Please sign in again.", 401);
    const response = json({ user: displayIdentity(pair.data.accessToken) });
    attachSession(response, pair.data);
    return response;
  } catch (error) { return clearSession(errorResponse(error)); }
}

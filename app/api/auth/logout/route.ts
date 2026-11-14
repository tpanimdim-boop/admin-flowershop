import { NextRequest } from "next/server";
import { z } from "zod";
import { backend, errorResponse, json, readJson, requireSameOrigin } from "@/lib/backend";
import { ACCESS_COOKIE, clearSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    z.object({}).strict().parse(await readJson(request));
    const token = request.cookies.get(ACCESS_COOKIE)?.value;
    let warning = "";
    try {
      if (token) {
        // Her logout route requires an empty JSON object, not a user ID.
        await backend("auth/logout", { method: "POST", body: {}, token, timeout: 15000 });
      } else warning = "Signed out on this device. The server could not confirm session revocation.";
    } catch {
      warning = "Signed out on this device. The server could not confirm session revocation.";
    }
    return clearSession(json({ ok: true, warning }));
  } catch (error) { return errorResponse(error); }
}

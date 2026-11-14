import { NextRequest } from "next/server";
import { backend, BackendError, errorResponse, json, readJson, requireSameOrigin } from "@/lib/backend";
import { loginSchema, tokenPairSchema } from "@/lib/contracts";
import { attachSession, displayIdentity } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const body = loginSchema.parse(await readJson(request));
    // Her backend can return HTTP 201 with { error: "Invalid credentials" }.
    const data = await backend("auth/login", { method: "POST", body });
    if (data && typeof data === "object" && "error" in data) {
      if (data.error === "Invalid credentials") throw new BackendError("Wrong username or password.", 401);
      throw new BackendError("The shop server could not complete sign-in. Please try again shortly.");
    }
    const pair = tokenPairSchema.safeParse(data);
    if (!pair.success) throw new BackendError("The sign-in response was incomplete. Please try again.");
    const response = json({ user: displayIdentity(pair.data.accessToken) });
    attachSession(response, pair.data);
    return response;
  } catch (error) { return errorResponse(error); }
}

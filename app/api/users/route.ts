import { NextRequest } from "next/server";
import { backend, BackendError, errorResponse, json, readJson, requireSameOrigin } from "@/lib/backend";
import { createUserSchema, userSchema, usersSchema } from "@/lib/contracts";
import { accessToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const data = await backend("users", { token: accessToken(request) });
    const users = usersSchema.safeParse(data);
    if (!users.success) throw new BackendError("The account list could not be read. Please refresh and try again.");
    return json(users.data);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const token = accessToken(request);
    // Verify current backend access before using its publicly exposed create route.
    await backend("users", { token });
    const body = createUserSchema.parse(await readJson(request));
    const data = await backend("users", { method: "POST", body, token });
    const created = userSchema.safeParse(data);
    if (!created.success) throw new BackendError("The account may have been created. Refresh the list before trying again.");
    return json(created.data, 201);
  } catch (error) { return errorResponse(error); }
}

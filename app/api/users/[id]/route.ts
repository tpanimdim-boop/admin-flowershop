import { NextRequest } from "next/server";
import { z } from "zod";
import { backend, BackendError, errorResponse, json, readJson, requireSameOrigin } from "@/lib/backend";
import { idSchema, updateUserSchema, userSchema } from "@/lib/contracts";
import { accessToken } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const id = idSchema.parse((await context.params).id);
    const data = await backend(`users/${id}`, { token: accessToken(request) });
    if (data === null) throw new BackendError("This user could not be found. Refresh the list.", 404);
    const user = userSchema.safeParse(data);
    if (!user.success) throw new BackendError("The account details could not be read. Please try again.");
    return json(user.data);
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const id = idSchema.parse((await context.params).id);
    const body = updateUserSchema.parse(await readJson(request));
    // Username, optional password, and role all use the same PUT endpoint.
    const data = await backend(`users/${id}`, { method: "PUT", body, token: accessToken(request) });
    const user = userSchema.safeParse(data);
    if (!user.success) throw new BackendError("The change may have saved. Refresh the list before trying again.");
    return json(user.data);
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const id = idSchema.parse((await context.params).id);
    const data = await backend(`users/${id}`, { method: "DELETE", token: accessToken(request) });
    const result = z.object({ affectedRows: z.number().int().nonnegative() }).safeParse(data);
    if (!result.success) throw new BackendError("Deletion could not be confirmed. Refresh before trying again.");
    if (!result.data.affectedRows) throw new BackendError("This user has already been removed. Refresh the list.", 404);
    return json({ ok: true });
  } catch (error) { return errorResponse(error); }
}

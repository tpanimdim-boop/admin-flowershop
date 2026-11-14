import { z } from "zod";
import { createUserSchema, idSchema, updateUserSchema, userSchema, usersSchema, type CreateUserInput, type UpdateUserInput } from "./contracts";
import type { AuthenticatedRequest } from "./client";

// Read / Refresh button -> GET /api/users -> live GET /users.
export async function listUsers(request: AuthenticatedRequest) {
  return usersSchema.parse(await request("users"));
}

// Read button -> GET /api/users/:id -> live GET /users/:id.
export async function getUser(request: AuthenticatedRequest, id: number) {
  return userSchema.parse(await request(`users/${idSchema.parse(id)}`));
}

// Create User form -> POST /api/users -> live POST /users.
// The backend assigns the new account's initial role: user.
export async function createUser(request: AuthenticatedRequest, input: CreateUserInput) {
  return userSchema.parse(await request("users", { method: "POST", body: createUserSchema.parse(input) }));
}

// Update form, including role -> PUT /api/users/:id -> live PUT /users/:id.
// This backend does not use a separate /users/:id/role endpoint.
export async function updateUser(request: AuthenticatedRequest, id: number, input: UpdateUserInput) {
  return userSchema.parse(await request(`users/${idSchema.parse(id)}`, { method: "PUT", body: updateUserSchema.parse(input) }));
}

// Confirm Delete -> DELETE /api/users/:id -> live DELETE /users/:id.
export async function deleteUser(request: AuthenticatedRequest, id: number) {
  return z.object({ ok: z.literal(true) }).parse(await request(`users/${idSchema.parse(id)}`, { method: "DELETE" }));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

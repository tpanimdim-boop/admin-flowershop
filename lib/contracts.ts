import { z } from "zod";

export const roles = ["user", "staff", "admin", "owner"] as const;
export type Role = (typeof roles)[number];

export const identitySchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(1),
  role: z.string().min(1),
});
export type Identity = z.infer<typeof identitySchema>;

export const sessionSchema = z.object({ user: identitySchema.nullable() });

export const userSchema = z.object({
  id: z.coerce.number().int().positive(),
  username: z.string().min(1),
  role: z.string().min(1),
  created_at: z.string().nullish(),
});
export type ShopUser = z.infer<typeof userSchema>;
export const usersSchema = z.array(userSchema);

const username = z.string().trim().min(1, "Enter a username.").max(50, "Use a username with 50 characters or fewer.");
const newPassword = z.string().min(8, "Use at least 8 characters for the password.")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Use a password no longer than 72 bytes.");

export const loginSchema = z.object({
  username,
  password: z.string().min(1, "Enter your password.").max(1024, "The password is too long."),
}).strict();

export const createUserSchema = z.object({ username, password: newPassword }).strict();
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  username: username.optional(),
  password: newPassword.optional(),
  role: z.enum(roles).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Make a change before saving.");
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const idSchema = z.coerce.number().int().positive();
export const tokenPairSchema = z.object({
  accessToken: z.string().min(1).max(8192),
  refreshToken: z.string().min(1).max(8192),
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

export function isStaff(role: string): boolean {
  return ["staff", "admin", "owner"].includes(role);
}

import { z } from "zod";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export type RequestOptions = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; signal?: AbortSignal };
export type AuthenticatedRequest = (path: string, options?: RequestOptions) => Promise<unknown>;

// Browser requests stay on this Next.js app. Its server routes call the backend.
export async function callApi(path: string, { method = "GET", body, signal }: RequestOptions = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`/api/${path.replace(/^\/+/, "")}`, {
      method, credentials: "same-origin", cache: "no-store", signal,
      headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (path === "auth/login") throw new ApiError("Cannot connect right now. Check your connection and try signing in again.", 0);
    throw new ApiError(method === "GET"
      ? "Cannot connect right now. Check your connection and try again."
      : "The response was lost. Refresh the list before submitting again; your request may already have completed.", 0);
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const result = z.object({ error: z.string().min(1).max(400) }).safeParse(data);
    throw new ApiError(result.success ? result.data.error : "The request could not finish. Please try again.", response.status);
  }
  return data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof z.ZodError) return error.issues[0]?.message || "Check the form and try again.";
  return "Something went wrong. Please try again.";
}

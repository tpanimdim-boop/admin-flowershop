import { backend, errorResponse, json } from "@/lib/backend";

// Her existing public GET / wakes Render. No new backend endpoint is needed.
export async function GET() {
  try { await backend(""); return json({ ok: true }); }
  catch (error) { return errorResponse(error); }
}

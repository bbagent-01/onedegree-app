export const runtime = "edge";

import { effectiveAuth } from "@/lib/impersonation/session";
import { searchUnsplash } from "@/lib/unsplash";

/**
 * GET /api/unsplash/search?q=lisbon
 *
 * Auth-only — we don't expose the Unsplash quota to anonymous traffic.
 * Returns up to 5 normalized photos plus a `cached` flag so the form
 * can show a tiny "from cache" hint when the call is free.
 */
export async function GET(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return Response.json({ photos: [], cached: false });
  }

  const result = await searchUnsplash(q);
  return Response.json(result);
}

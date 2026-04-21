export const runtime = "edge";

import { getCurrentUser, getThreadDetail } from "@/lib/messaging-data";

/**
 * GET /api/inbox/thread/[id]
 * Returns the same `ThreadDetail` payload the inbox page server-renders
 * for the selected thread — messages, booking, reservation sidebar data,
 * cancellation policy. Used by the inbox split-view to swap threads
 * client-side without re-running the full inbox RSC render.
 *
 * Auth: goes through `getCurrentUser` which honors the impersonation
 * cookie via `getEffectiveUserId`.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const thread = await getThreadDetail(currentUser.id, id);
  if (!thread) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ thread });
}

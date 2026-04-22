import "server-only";
import { getSupabaseAdmin } from "./supabase";

export type PhotoRequestStatus = "pending" | "submitted" | "dismissed";

export interface PhotoRequest {
  id: string;
  contact_request_id: string;
  thread_id: string;
  requester_id: string;
  responder_id: string;
  prompt: string;
  status: PhotoRequestStatus;
  photo_url: string | null;
  storage_path: string | null;
  submitted_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getPhotoRequestsForThread(
  threadId: string
): Promise<PhotoRequest[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("photo_requests")
    .select(
      "id, contact_request_id, thread_id, requester_id, responder_id, prompt, status, photo_url, storage_path, submitted_at, dismissed_at, created_at, updated_at"
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  return (data || []) as PhotoRequest[];
}

/** Thread-list camera icon — counts pending photo_requests per thread. */
export async function countPendingPhotoRequestsForThreads(
  threadIds: string[]
): Promise<Map<string, number>> {
  const supabase = getSupabaseAdmin();
  if (!threadIds.length) return new Map();
  const { data } = await supabase
    .from("photo_requests")
    .select("thread_id")
    .in("thread_id", threadIds)
    .eq("status", "pending");
  const m = new Map<string, number>();
  for (const row of data || []) {
    const tid = (row as { thread_id: string }).thread_id;
    m.set(tid, (m.get(tid) ?? 0) + 1);
  }
  return m;
}

/**
 * Sign a photo_url that's stored as a `photo-requests/...` storage
 * path. Returns null when the row hasn't been submitted yet.
 */
export async function signPhotoRequestUrl(
  storagePath: string | null,
  ttlSeconds = 60 * 60
): Promise<string | null> {
  if (!storagePath) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.storage
    .from("photo-requests")
    .createSignedUrl(storagePath, ttlSeconds);
  return data?.signedUrl ?? null;
}

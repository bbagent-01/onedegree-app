export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/photo-requests/[id]/submit
 *
 * Responder uploads the photo. Multipart/form-data body with a
 * single `file` part. Writes to the `photo-requests` bucket at
 * `{contact_request_id}/{request_id}.{ext}` and flips the row to
 * status=submitted. Idempotent on re-upload: the path is stable,
 * so the new upload overwrites the previous file.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: me } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!me) return new Response("User not found", { status: 404 });

  const { data: row } = await supabase
    .from("photo_requests")
    .select(
      "id, contact_request_id, responder_id, status, storage_path"
    )
    .eq("id", id)
    .maybeSingle();
  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (row.responder_id !== me.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }
  if (row.status === "dismissed") {
    return Response.json(
      { error: "Request was dismissed" },
      { status: 409 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "Photo must be 10MB or smaller." },
      { status: 413 }
    );
  }
  if (!file.type.startsWith("image/")) {
    return Response.json(
      { error: "Only image files are allowed." },
      { status: 400 }
    );
  }

  const rawExt = (file.name.split(".").pop() || "jpg").toLowerCase();
  const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : "jpg";
  const path = `${row.contact_request_id}/${row.id}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadErr } = await supabase.storage
    .from("photo-requests")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });
  if (uploadErr) {
    return Response.json(
      { error: "Upload failed", detail: uploadErr.message },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("photo_requests")
    .update({
      status: "submitted",
      storage_path: path,
      // photo_url stored as a path (not public URL) — the bucket is
      // private. The thread detail fetcher signs a short-lived URL
      // when rendering the card.
      photo_url: path,
      submitted_at: now,
    })
    .eq("id", id);
  if (updateErr) {
    return Response.json(
      { error: "Failed to save", detail: updateErr.message },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, status: "submitted", storage_path: path });
}

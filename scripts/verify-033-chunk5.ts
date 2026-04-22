/**
 * Verify S4 Chunk 5 schema (migration 036) end-to-end via the
 * Supabase service role — creates an issue_reports + photo_requests
 * row, flips through the state machine, then cleans up. No UI
 * required; useful as a smoke test when the app can't be exercised
 * interactively (e.g. edge-runtime formData uploads).
 *
 * Usage: npx tsx --env-file=.env.local scripts/verify-033-chunk5.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

async function main() {
  console.log("1. Find any contact_request with a thread…");
  const { data: threadRow, error: trErr } = await supabase
    .from("message_threads")
    .select("id, guest_id, host_id, contact_request_id")
    .not("contact_request_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (trErr || !threadRow) {
    console.error("No thread found:", trErr?.message);
    process.exit(1);
  }
  const request = {
    id: threadRow.contact_request_id as string,
    guest_id: threadRow.guest_id as string,
  };
  const thread = {
    id: threadRow.id as string,
    guest_id: threadRow.guest_id as string,
    host_id: threadRow.host_id as string,
  };
  console.log(
    `   contact_request=${request.id} thread=${thread.id} guest=${thread.guest_id} host=${thread.host_id}`
  );

  console.log("2. Create issue_reports row…");
  const { data: issue, error: issueErr } = await supabase
    .from("issue_reports")
    .insert({
      contact_request_id: request.id,
      thread_id: thread.id,
      reporter_id: thread.guest_id,
      category: "amenity",
      severity: "medium",
      description:
        "Smoke test — created by verify-033-chunk5.ts. Safe to delete.",
    })
    .select("id, status")
    .single();
  if (issueErr || !issue) {
    console.error("Insert failed:", issueErr?.message);
    process.exit(1);
  }
  console.log(`   issue_reports id=${issue.id} status=${issue.status}`);

  console.log("3. Acknowledge…");
  await supabase
    .from("issue_reports")
    .update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: thread.host_id,
    })
    .eq("id", issue.id);

  console.log("4. Resolve…");
  await supabase
    .from("issue_reports")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: thread.host_id,
      resolution_note: "Fixed during smoke test.",
    })
    .eq("id", issue.id);

  const { data: finalIssue } = await supabase
    .from("issue_reports")
    .select("status, resolution_note")
    .eq("id", issue.id)
    .single();
  console.log(
    `   Final status=${finalIssue?.status} note="${finalIssue?.resolution_note}"`
  );

  console.log("5. Create photo_requests row…");
  const { data: pr, error: prErr } = await supabase
    .from("photo_requests")
    .insert({
      contact_request_id: request.id,
      thread_id: thread.id,
      requester_id: thread.host_id,
      responder_id: thread.guest_id,
      prompt: "Smoke test — photo of the thermostat please.",
    })
    .select("id, status")
    .single();
  if (prErr || !pr) {
    console.error("Photo request insert failed:", prErr?.message);
    process.exit(1);
  }
  console.log(`   photo_requests id=${pr.id} status=${pr.status}`);

  console.log("6. Upload a tiny test image to the bucket…");
  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
  );
  const path = `${request.id}/${pr.id}.png`;
  const { error: upErr } = await supabase.storage
    .from("photo-requests")
    .upload(path, tinyPng, { contentType: "image/png", upsert: true });
  if (upErr) {
    console.error("Upload failed:", upErr.message);
    process.exit(1);
  }
  console.log(`   Uploaded ${path}`);

  console.log("7. Sign URL…");
  const { data: signed } = await supabase.storage
    .from("photo-requests")
    .createSignedUrl(path, 60);
  console.log(`   signedUrl=${signed?.signedUrl?.slice(0, 80)}…`);

  console.log("8. Flip to submitted…");
  await supabase
    .from("photo_requests")
    .update({
      status: "submitted",
      storage_path: path,
      photo_url: path,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", pr.id);

  console.log("9. Clean up smoke-test rows & object…");
  await supabase.from("issue_reports").delete().eq("id", issue.id);
  await supabase.from("photo_requests").delete().eq("id", pr.id);
  await supabase.storage.from("photo-requests").remove([path]);

  console.log("✓ All green.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

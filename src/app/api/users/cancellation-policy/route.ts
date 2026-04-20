export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import {
  buildPolicyFromPreset,
  parsePolicy,
  type CancellationPreset,
} from "@/lib/cancellation";

/**
 * GET  — fetch the current user's default cancellation policy.
 * PUT  — set / replace it. Body: { preset, customNote? } OR
 *        { policy: CancellationPolicy } for custom schedules.
 *
 * Surfaces at Settings → Hosting. Persists to `users.cancellation_policy`.
 * Future listing + reservation overrides write to their own columns
 * and are set via separate endpoints (not yet wired for alpha).
 */
export async function GET() {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("cancellation_policy")
    .eq("clerk_id", userId)
    .maybeSingle();
  return Response.json({
    policy: parsePolicy(data?.cancellation_policy) ?? null,
  });
}

export async function PUT(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  let body: { preset?: CancellationPreset; customNote?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    body.preset !== "flexible" &&
    body.preset !== "moderate" &&
    body.preset !== "strict"
  ) {
    // Custom schedules are schema-supported but Chunk 4 ships presets
    // only. Keep the input validator narrow until the custom builder
    // lands.
    return Response.json(
      { error: "preset must be flexible | moderate | strict" },
      { status: 400 }
    );
  }

  const policy = buildPolicyFromPreset(
    body.preset,
    typeof body.customNote === "string" ? body.customNote : null
  );

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("users")
    .update({ cancellation_policy: policy })
    .eq("clerk_id", userId);
  if (error) {
    return Response.json(
      { error: "Failed to save policy", detail: error.message },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, policy });
}

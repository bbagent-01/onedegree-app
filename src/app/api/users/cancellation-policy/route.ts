export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import {
  buildPolicyFromPreset,
  parsePolicy,
  type CancellationApproach,
  type CancellationPolicy,
  type CancellationPreset,
  type PaymentScheduleEntry,
  type RefundWindow,
} from "@/lib/cancellation";

/**
 * GET  — fetch the current user's default policy.
 * PUT  — replace it. Accepts two shapes:
 *   A) { approach, preset } — template shortcut (writes the
 *      preset template for the given approach).
 *   B) { approach, preset, payment_schedule, refund_schedule?,
 *        security_deposit?, custom_note? } — full editor payload.
 * Both run through parsePolicy on the way out so the stored JSON
 * is normalized.
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

interface PutBody {
  approach?: CancellationApproach;
  preset?: CancellationPreset;
  payment_schedule?: PaymentScheduleEntry[];
  refund_schedule?: RefundWindow[];
  security_deposit?: PaymentScheduleEntry[];
  custom_note?: string | null;
}

export async function PUT(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.approach !== "installments" && body.approach !== "refunds") {
    return Response.json(
      { error: "approach must be installments | refunds" },
      { status: 400 }
    );
  }

  if (
    body.preset !== "flexible" &&
    body.preset !== "moderate" &&
    body.preset !== "strict" &&
    body.preset !== "custom"
  ) {
    return Response.json(
      { error: "preset must be flexible | moderate | strict | custom" },
      { status: 400 }
    );
  }

  let policy: CancellationPolicy;
  const hasEditorPayload =
    body.payment_schedule !== undefined ||
    body.refund_schedule !== undefined ||
    body.security_deposit !== undefined;

  if (hasEditorPayload) {
    const candidate = {
      approach: body.approach,
      preset: body.preset,
      payment_schedule: body.payment_schedule ?? [],
      refund_schedule: body.refund_schedule ?? [],
      security_deposit: body.security_deposit ?? [],
      custom_note:
        typeof body.custom_note === "string" ? body.custom_note : null,
    };
    const parsed = parsePolicy(candidate);
    if (!parsed) {
      return Response.json({ error: "Invalid policy shape" }, { status: 400 });
    }
    policy = parsed;
  } else if (body.preset === "custom") {
    return Response.json(
      { error: "Custom preset requires schedule payload" },
      { status: 400 }
    );
  } else {
    policy = buildPolicyFromPreset(body.approach, body.preset, {
      customNote:
        typeof body.custom_note === "string" ? body.custom_note : null,
    });
  }

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

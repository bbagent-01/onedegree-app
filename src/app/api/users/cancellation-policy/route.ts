export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import {
  buildPolicyFromPreset,
  parsePolicy,
  type CancellationPolicy,
  type CancellationPreset,
  type PaymentScheduleEntry,
} from "@/lib/cancellation";

/**
 * GET  — fetch the current user's default cancellation + payment
 *        schedule.
 * PUT  — replace it. Accepts two payload shapes:
 *        A) `{ preset }` — legacy / settings-form quick-swap.
 *           Writes the preset's template verbatim.
 *        B) `{ preset, payment_schedule, security_deposit?,
 *           custom_note? }` — full editor payload. `preset` should
 *           be "custom" when the rows diverge from the template.
 *
 * All persisted values run through parsePolicy on the way out so
 * the stored JSON is normalized regardless of which payload shape
 * the client sent.
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
  preset?: CancellationPreset;
  payment_schedule?: PaymentScheduleEntry[];
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
  if (body.payment_schedule || body.security_deposit) {
    // Full editor payload. Push through parsePolicy so the shape
    // matches the stored normalization regardless of what the
    // client sent.
    const candidate = {
      preset: body.preset,
      payment_schedule: body.payment_schedule ?? [],
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
      { error: "Custom preset requires payment_schedule" },
      { status: 400 }
    );
  } else {
    policy = buildPolicyFromPreset(body.preset, {
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

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
 * Listing-level cancellation policy override.
 *
 *   GET  — returns { override: CancellationPolicy | null } so the edit
 *          form can tell "inherit host default" from "override set".
 *   PUT  — save an override. Same payload shape as
 *          /api/users/cancellation-policy PUT.
 *   DELETE — clear the override so the listing reverts to the host
 *            default.
 *
 * Host ownership is required for all mutations. Auth is impersonation-
 * aware through effectiveAuth.
 */

async function authorize(id: string) {
  const { userId } = await effectiveAuth();
  if (!userId) return { error: new Response("Unauthorized", { status: 401 }) };
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!user) {
    return { error: Response.json({ error: "User not found" }, { status: 404 }) };
  }
  const { data: listing } = await supabase
    .from("listings")
    .select("id, host_id, cancellation_policy_override")
    .eq("id", id)
    .maybeSingle();
  if (!listing) {
    return {
      error: Response.json({ error: "Listing not found" }, { status: 404 }),
    };
  }
  if (listing.host_id !== user.id) {
    return {
      error: Response.json({ error: "Not authorized" }, { status: 403 }),
    };
  }
  return { supabase, listing };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const a = await authorize(id);
  if (a.error) return a.error;
  return Response.json({
    override: parsePolicy(
      (a.listing as { cancellation_policy_override?: unknown })
        .cancellation_policy_override
    ),
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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const a = await authorize(id);
  if (a.error) return a.error;

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
  const hasEditor =
    body.payment_schedule !== undefined ||
    body.refund_schedule !== undefined ||
    body.security_deposit !== undefined;

  if (hasEditor) {
    const parsed = parsePolicy({
      approach: body.approach,
      preset: body.preset,
      payment_schedule: body.payment_schedule ?? [],
      refund_schedule: body.refund_schedule ?? [],
      security_deposit: body.security_deposit ?? [],
      custom_note:
        typeof body.custom_note === "string" ? body.custom_note : null,
    });
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

  const { error } = await a.supabase
    .from("listings")
    .update({ cancellation_policy_override: policy })
    .eq("id", id);
  if (error) {
    return Response.json(
      { error: "Failed to save", detail: error.message },
      { status: 500 }
    );
  }
  return Response.json({ ok: true, override: policy });
}

/** Clear the override — listing falls back to host default. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const a = await authorize(id);
  if (a.error) return a.error;
  const { error } = await a.supabase
    .from("listings")
    .update({ cancellation_policy_override: null })
    .eq("id", id);
  if (error) {
    return Response.json(
      { error: "Failed to clear", detail: error.message },
      { status: 500 }
    );
  }
  return Response.json({ ok: true, override: null });
}

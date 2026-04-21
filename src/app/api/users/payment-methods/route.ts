export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import {
  parsePaymentMethods,
  type PaymentMethod,
} from "@/lib/payment-methods";

/**
 * GET  — fetch the current user's payment methods.
 * PUT  — replace the entire list. Body: { methods: PaymentMethod[] }.
 *
 * Always round-trips through parsePaymentMethods so the stored JSON
 * is normalized (stripped whitespace, dropped empty rows, enforced
 * types). No per-row PATCH — the form posts the whole array.
 */
export async function GET() {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("payment_methods")
    .eq("clerk_id", userId)
    .maybeSingle();
  return Response.json({
    methods: parsePaymentMethods(data?.payment_methods),
  });
}

interface PutBody {
  methods?: PaymentMethod[];
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

  const normalized = parsePaymentMethods(body.methods ?? []);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("users")
    .update({ payment_methods: normalized })
    .eq("clerk_id", userId);
  if (error) {
    return Response.json(
      { error: "Failed to save", detail: error.message },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, methods: normalized });
}

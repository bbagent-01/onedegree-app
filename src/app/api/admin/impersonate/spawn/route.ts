// REMOVE BEFORE BETA — see CC-Dev1 recap. All files in
// src/lib/impersonation/, src/components/admin/Impersonation*.tsx, and
// src/app/api/admin/impersonate/ delete together. Env vars IMPERSONATION_*
// and the impersonation_log table + is_test_user column must also be removed.

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  isImpersonationEnabled,
  isAdmin,
} from "@/lib/impersonation/session";

export const runtime = "nodejs";

const gateFailed = () => new Response("Not Found", { status: 404 });

/**
 * Produce a Clerk magic-test phone in the reserved `+15555550XXX`
 * range. 500–599 is specifically documented by Clerk as test-mode
 * only (never dialable in production), which matches our alpha
 * posture. We pick a random 3-digit suffix rather than sequencing
 * through the DB to keep the endpoint stateless.
 */
function generateTestPhone(): string {
  const suffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `+15555550${suffix}`;
}

async function findAvailablePhone(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  attempts = 20
): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    const phone = generateTestPhone();
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("phone_number", phone)
      .maybeSingle();
    if (!data) return phone;
  }
  return null;
}

export async function POST(req: Request) {
  if (!isImpersonationEnabled()) return gateFailed();
  const { userId: clerkAdminId } = await auth();
  if (!clerkAdminId || !isAdmin(clerkAdminId)) return gateFailed();

  let body: { name?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = body?.name?.trim();
  if (!name) {
    return Response.json({ error: "name required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  let phone = body?.phone?.trim();
  if (phone) {
    if (!/^\+15555550\d{3}$/.test(phone)) {
      return Response.json(
        { error: "phone must be in +15555550XXX test range" },
        { status: 400 }
      );
    }
  } else {
    const auto = await findAvailablePhone(supabase);
    if (!auto) {
      return Response.json(
        { error: "Could not find an unused test phone number" },
        { status: 500 }
      );
    }
    phone = auto;
  }

  // Spawned users are DB-only — they are NEVER meant to sign in as
  // themselves; they exist solely to be impersonated by an admin.
  // The synthetic clerk_id prefix (`spawned_imp_…`) keeps them
  // distinguishable from seed users (`seed_hostgraph_…`) and real
  // Clerk users (`user_…`). Clerk SDK user creation was deliberately
  // skipped: it would require extra prod-safe credentials without
  // giving us anything the impersonation shim can't already do.
  const syntheticClerkId = `spawned_imp_${crypto.randomUUID()}`;
  const email = `${syntheticClerkId}@impersonation-spawn.1db`;

  const { data: created, error: insertErr } = await supabase
    .from("users")
    .insert({
      clerk_id: syntheticClerkId,
      email,
      name,
      phone_number: phone,
      is_test_user: true,
      avatar_url: `https://i.pravatar.cc/300?u=${encodeURIComponent(
        syntheticClerkId
      )}`,
    })
    .select("id, name, avatar_url, phone_number")
    .single();

  if (insertErr || !created) {
    return Response.json(
      {
        error: "Failed to spawn test user",
        detail: insertErr?.message ?? null,
      },
      { status: 500 }
    );
  }

  // Audit the spawn — separate action_type from 'impersonate' so the
  // log preserves the distinction.
  await supabase.from("impersonation_log").insert({
    admin_user_id: clerkAdminId,
    impersonated_user_id: created.id,
    action_type: "spawn",
    ended_at: new Date().toISOString(),
  });

  return Response.json({
    ok: true,
    user: {
      id: created.id,
      name: created.name,
      avatar_url: created.avatar_url,
      phone_number: created.phone_number,
    },
  });
}

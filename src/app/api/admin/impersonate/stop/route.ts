// REMOVE BEFORE BETA — see CC-Dev1 recap. All files in
// src/lib/impersonation/, src/components/admin/Impersonation*.tsx, and
// src/app/api/admin/impersonate/ delete together. Env vars IMPERSONATION_*
// and the impersonation_log table + is_test_user column must also be removed.

import { auth } from "@clerk/nextjs/server";
import {
  isImpersonationEnabled,
  isAdmin,
  clearImpersonation,
} from "@/lib/impersonation/session";

export const runtime = "nodejs";

const gateFailed = () => new Response("Not Found", { status: 404 });

export async function POST() {
  if (!isImpersonationEnabled()) return gateFailed();

  const { userId: clerkAdminId } = await auth();
  if (!clerkAdminId || !isAdmin(clerkAdminId)) return gateFailed();

  await clearImpersonation(clerkAdminId);
  return Response.json({ ok: true });
}

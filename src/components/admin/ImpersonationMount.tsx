// REMOVE BEFORE BETA — see CC-Dev1 recap. All files in
// src/lib/impersonation/, src/components/admin/Impersonation*.tsx, and
// src/app/api/admin/impersonate/ delete together. Env vars IMPERSONATION_*
// and the impersonation_log table + is_test_user column must also be removed.

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  isImpersonationEnabled,
  isAdmin,
  getIdentityState,
} from "@/lib/impersonation/session";
import { ImpersonationSwitcher } from "./ImpersonationSwitcher";
import { ImpersonationBar } from "./ImpersonationBar";

/**
 * Server component mount point for the impersonation UI. Returns
 * null when any gate fails so nothing — neither the pill nor the
 * top bar — is rendered or bundled for non-admins.
 *
 * Because this is a server component, the client-only switcher code
 * never ships unless this component decides to render it.
 */
export async function ImpersonationMount() {
  if (!isImpersonationEnabled()) return null;
  const { userId: clerkId } = await auth();
  if (!clerkId || !isAdmin(clerkId)) return null;

  const supabase = getSupabaseAdmin();
  const { data: realRow } = await supabase
    .from("users")
    .select("id, name")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  const realUserName = realRow?.name ?? "Admin";

  const identity = await getIdentityState(clerkId);

  let currentName = realUserName;
  if (identity.isImpersonating && identity.effectiveUserId) {
    const { data: effective } = await supabase
      .from("users")
      .select("name")
      .eq("id", identity.effectiveUserId)
      .maybeSingle();
    if (effective?.name) currentName = effective.name;
  }

  return (
    <>
      {identity.isImpersonating && (
        <ImpersonationBar
          currentName={currentName}
          realUserName={realUserName}
        />
      )}
      <ImpersonationSwitcher
        realUserName={realUserName}
        currentName={currentName}
        isImpersonating={identity.isImpersonating}
      />
    </>
  );
}

import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { OnboardingTakeover } from "./OnboardingTakeover";

/**
 * Server component. Renders the onboarding takeover only when the
 * signed-in user has never dismissed it (users.onboarding_seen_at
 * IS NULL). After dismiss (POST /api/onboarding/dismiss) the row is
 * stamped and this component returns null on every subsequent
 * render — no flash, no client-side check.
 *
 * Uses `effectiveAuth()` so impersonated sessions see the
 * impersonated user's onboarding state — handy for QA: impersonate
 * a brand-new test user to re-validate the takeover, or NULL the
 * column on a real account to re-trigger it.
 *
 * No-op for unauthenticated routes (Clerk returns null userId) and
 * for users whose row hasn't been provisioned yet.
 */
export async function OnboardingMount() {
  const { userId } = await effectiveAuth();
  if (!userId) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("onboarding_seen_at")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[OnboardingMount] lookup failed:", error);
    return null;
  }
  if (!data) return null;
  if (data.onboarding_seen_at) return null;

  return <OnboardingTakeover />;
}

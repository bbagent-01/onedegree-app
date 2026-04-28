/**
 * Listing access control (simplified model).
 * Server-side only.
 *
 * The new model collapses the 6-action gates into:
 *
 *   1. see_preview              — outer ring
 *   2. full_listing_contact     — inner ring (full listing + message
 *                                 + request-to-book together)
 *   3. allow_intro_requests     — toggle for viewers who see the
 *                                 preview but not the full listing
 *
 * Enforcement rule: full_listing_contact is *at most* as permissive
 * as see_preview. If the stored settings violate this (e.g. legacy
 * rows), full_listing_contact is clamped at read time.
 *
 * Anonymous viewers (null viewerId) are allowed through the outer
 * gate only when the host has opted into `anyone_anywhere`. Any
 * inner-gate action always requires auth, so logged-out viewers
 * never reach full_listing_contact.
 *
 * S2a addition — `hasActiveGrant`: when the viewer holds a bidirectional
 * access grant from the listing's host (via an accepted intro), every
 * gate for that pair is unlocked. The grant short-circuits BEFORE the
 * trust-score / specific_people evaluation — the intro accept *is* the
 * trust signal in this pair-scoped context.
 */

import type { AccessRule, AccessSettings, ListingAccessResult } from "./types";
import { DEFAULT_ACCESS_SETTINGS, normalizeAccessSettings } from "./types";

interface ListingForAccess {
  host_id: string;
  visibility_mode?: string;
  access_settings?: AccessSettings | null;
}

export function checkListingAccess(
  viewerId: string | null,
  listing: ListingForAccess,
  score: number,
  degree?: number | null,
  /** Bidirectional intro-accept grant: listing.host_id → viewerId. */
  hasActiveGrant?: boolean
): ListingAccessResult {
  const NO_ACCESS: ListingAccessResult = {
    can_see_preview: false,
    can_see_full: false,
    can_request_intro: false,
    can_request_book: false,
    can_message: false,
    can_view_host_profile: false,
  };

  const FULL_ACCESS: ListingAccessResult = {
    can_see_preview: true,
    can_see_full: true,
    can_request_intro: true,
    can_request_book: true,
    can_message: true,
    can_view_host_profile: true,
  };

  // Hosts always see their own listings fully.
  if (viewerId && viewerId === listing.host_id) return FULL_ACCESS;

  if (listing.visibility_mode === "hidden") return NO_ACCESS;
  if (listing.visibility_mode === "public") return FULL_ACCESS;

  // Pair-scoped grant from an accepted intro unlocks every gate for
  // this viewer on this host's listings, regardless of trust score or
  // specific_people rules. The recipient can revoke the grant at any
  // time and the caller is responsible for passing a fresh `hasActiveGrant`.
  if (viewerId && hasActiveGrant) return FULL_ACCESS;

  // preview_gated (default)
  const settings = normalizeAccessSettings(
    listing.access_settings ?? DEFAULT_ACCESS_SETTINGS
  );

  const canSeePreview = evaluateRule(
    settings.see_preview,
    viewerId,
    score,
    degree ?? null
  );

  // Clamp: full_listing_contact can never be more permissive than
  // see_preview, regardless of what's in the DB. Also: any inner-
  // gate action requires a signed-in viewer — messaging and booking
  // both need an identity.
  const canSeeFull =
    canSeePreview &&
    !!viewerId &&
    evaluateRule(
      settings.full_listing_contact,
      viewerId,
      score,
      degree ?? null
    );

  // Intro requests are available to anyone who can see the preview
  // but not the full listing, provided the host left the toggle on
  // AND the viewer is signed in (sending a message needs an identity,
  // even if it's anonymized to the host).
  const canRequestIntro =
    canSeePreview &&
    !canSeeFull &&
    !!viewerId &&
    settings.allow_intro_requests !== false;

  return {
    can_see_preview: canSeePreview,
    can_see_full: canSeeFull,
    can_request_intro: canRequestIntro,
    // Collapsed actions mirror can_see_full.
    can_request_book: canSeeFull,
    can_message: canSeeFull,
    can_view_host_profile: canSeeFull,
  };
}

/**
 * Evaluate a single rule. `anyone_anywhere` lets a null viewerId
 * through; every other rule requires a signed-in user.
 */
function evaluateRule(
  rule: AccessRule | undefined,
  viewerId: string | null,
  score: number,
  degree: number | null
): boolean {
  if (!rule) return false;

  switch (rule.type) {
    case "anyone_anywhere":
      return true;
    case "anyone":
      return viewerId != null;
    case "min_score":
      return viewerId != null && score >= (rule.threshold ?? 0);
    case "max_degrees": {
      if (viewerId == null) return false;
      // degree=null means "no path within 4 hops" — always a miss.
      if (degree == null) return false;
      const limit = Math.max(1, Math.min(3, rule.threshold ?? 2));
      return degree <= limit;
    }
    case "specific_people":
      return viewerId != null && (rule.user_ids ?? []).includes(viewerId);
    default:
      return false;
  }
}

/**
 * Server-side helper: does `granteeId` hold an active (non-revoked)
 * listing_access_grants row from `grantorId`?
 *
 * Wraps the DB lookup so callers (listing page RSC, listing-card
 * rendering) can await a single small query and pass the boolean
 * down to `checkListingAccess`.
 */
export async function hasActiveListingAccessGrant(
  grantorId: string,
  granteeId: string
): Promise<boolean> {
  if (!grantorId || !granteeId || grantorId === granteeId) return false;
  const { getSupabaseAdmin } = await import("../supabase");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("listing_access_grants")
    .select("id")
    .eq("grantor_id", grantorId)
    .eq("grantee_id", granteeId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) {
    console.error("hasActiveListingAccessGrant error", error);
    return false;
  }
  return Boolean(data?.id);
}

/**
 * Batched grant lookup. Returns the set of grantor_ids (out of the
 * caller-supplied `grantorIds`) that hold an active grant to `granteeId`.
 *
 * One query for the whole browse grid instead of N — the singular
 * `hasActiveListingAccessGrant` would issue N round-trips.
 */
export async function getActiveGrantorIds(
  grantorIds: string[],
  granteeId: string
): Promise<Set<string>> {
  if (!granteeId || grantorIds.length === 0) return new Set();
  const filtered = grantorIds.filter((id) => id && id !== granteeId);
  if (filtered.length === 0) return new Set();
  const { getSupabaseAdmin } = await import("../supabase");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("listing_access_grants")
    .select("grantor_id")
    .in("grantor_id", filtered)
    .eq("grantee_id", granteeId)
    .is("revoked_at", null);
  if (error) {
    console.error("getActiveGrantorIds error", error);
    return new Set();
  }
  return new Set(
    ((data || []) as { grantor_id: string }[]).map((r) => r.grantor_id)
  );
}

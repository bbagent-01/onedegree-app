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
 * Anonymous viewers are no longer supported. A null viewerId short-
 * circuits to "no access" — callers must sign the user in first.
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
  _unusedDegree?: number
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

  // Auth wall — no anonymous access under the new model.
  if (!viewerId) return NO_ACCESS;

  if (listing.visibility_mode === "hidden") return NO_ACCESS;
  if (listing.visibility_mode === "public") return FULL_ACCESS;

  // preview_gated (default)
  const settings = normalizeAccessSettings(
    listing.access_settings ?? DEFAULT_ACCESS_SETTINGS
  );

  const canSeePreview = evaluateRule(settings.see_preview, viewerId, score);

  // Clamp: full_listing_contact can never be more permissive than
  // see_preview, regardless of what's in the DB.
  const canSeeFull =
    canSeePreview &&
    evaluateRule(settings.full_listing_contact, viewerId, score);

  // Intro requests are available to anyone who can see the preview
  // but not the full listing, provided the host left the toggle on.
  const canRequestIntro =
    canSeePreview && !canSeeFull && settings.allow_intro_requests !== false;

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
 * Evaluate a single rule. Anonymous viewers are always denied — the
 * caller should have bounced them to sign-in before calling this.
 */
function evaluateRule(
  rule: AccessRule | undefined,
  viewerId: string | null,
  score: number
): boolean {
  if (!rule || !viewerId) return false;

  switch (rule.type) {
    case "anyone":
      return true;
    case "min_score":
      return score >= (rule.threshold ?? 0);
    case "specific_people":
      return (rule.user_ids ?? []).includes(viewerId);
    default:
      // Unknown legacy types get denied. normalizeAccessSettings
      // should have converted them before we reach this point.
      return false;
  }
}

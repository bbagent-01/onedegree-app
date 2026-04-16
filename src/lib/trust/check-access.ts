/**
 * Listing access control.
 * Server-side only.
 *
 * Evaluates access_settings JSON from a listing against a viewer's
 * 1° vouch score and degree count.
 */

import type { AccessRule, AccessSettings, ListingAccessResult } from "./types";
import { DEFAULT_ACCESS_SETTINGS } from "./types";

interface ListingForAccess {
  host_id: string;
  visibility_mode?: string;
  access_settings?: AccessSettings | null;
}

/**
 * Check what actions a viewer can perform on a listing.
 *
 * @param viewerId - The viewer's user ID (null = anonymous)
 * @param listing - The listing with host_id, visibility_mode, access_settings
 * @param score - The viewer's 1° score to the listing host
 * @param degrees - Number of degrees between viewer and host (stub for CC-C1b)
 */
export function checkListingAccess(
  viewerId: string | null,
  listing: ListingForAccess,
  score: number,
  degrees?: number
): ListingAccessResult {
  const FULL_ACCESS: ListingAccessResult = {
    can_see_preview: true,
    can_see_full: true,
    can_request_book: true,
    can_message: true,
    can_request_intro: true,
    can_view_host_profile: true,
  };

  const NO_ACCESS: ListingAccessResult = {
    can_see_preview: false,
    can_see_full: false,
    can_request_book: false,
    can_message: false,
    can_request_intro: false,
    can_view_host_profile: false,
  };

  // Host always has full access to their own listing
  if (viewerId && viewerId === listing.host_id) {
    return FULL_ACCESS;
  }

  // Hidden listings: no access unless you're the host (on browse; direct-link handled separately)
  if (listing.visibility_mode === "hidden") {
    return NO_ACCESS;
  }

  // Public listings: everyone gets full access
  if (listing.visibility_mode === "public") {
    return FULL_ACCESS;
  }

  // null/undefined visibility_mode treated as preview_gated (default)

  // Anonymous viewers: only see_preview if it's set to "anyone"
  if (!viewerId) {
    const settings = listing.access_settings ?? DEFAULT_ACCESS_SETTINGS;
    return {
      can_see_preview: evaluateRule(settings.see_preview, null, score, degrees),
      can_see_full: false,
      can_request_book: false,
      can_message: false,
      can_request_intro: false,
      can_view_host_profile: evaluateRule(
        settings.view_host_profile,
        null,
        score,
        degrees
      ),
    };
  }

  // preview_gated (default): evaluate each action against access_settings
  const settings = listing.access_settings ?? DEFAULT_ACCESS_SETTINGS;

  return {
    can_see_preview: evaluateRule(
      settings.see_preview,
      viewerId,
      score,
      degrees
    ),
    can_see_full: evaluateRule(settings.see_full, viewerId, score, degrees),
    can_request_book: evaluateRule(
      settings.request_book,
      viewerId,
      score,
      degrees
    ),
    can_message: evaluateRule(settings.message, viewerId, score, degrees),
    can_request_intro: evaluateRule(
      settings.request_intro,
      viewerId,
      score,
      degrees
    ),
    can_view_host_profile: evaluateRule(
      settings.view_host_profile,
      viewerId,
      score,
      degrees
    ),
  };
}

/**
 * Evaluate a single access rule against the viewer's context.
 */
function evaluateRule(
  rule: AccessRule | undefined,
  viewerId: string | null,
  score: number,
  degrees?: number
): boolean {
  if (!rule) return false;

  switch (rule.type) {
    case "anyone":
      return true;

    case "min_score":
      return score >= (rule.threshold ?? 0);

    case "specific_people":
      return viewerId != null && (rule.user_ids ?? []).includes(viewerId);

    case "max_degrees":
      return (
        degrees !== undefined &&
        degrees !== null &&
        degrees <= (rule.threshold ?? 0)
      );

    default:
      return false;
  }
}

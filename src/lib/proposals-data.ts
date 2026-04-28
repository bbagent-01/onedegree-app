/**
 * Proposals data layer — server-side only.
 *
 * Fetch + audience-filter proposals for the feed, the profile integration,
 * and the detail page. Visibility reuses the existing preview-gate
 * machinery:
 *
 *   - visibility_mode = 'inherit'
 *       trip_wish   → author's "profile default" audience
 *                     (currently = DEFAULT_ACCESS_SETTINGS.see_preview:
 *                     any signed-in user; there is no per-user
 *                     access_settings column yet).
 *       host_offer  → linked listing's access_settings.see_preview.
 *
 *   - visibility_mode = 'custom'
 *       → the proposal's own access_settings.see_preview.
 *
 * The inner full-listing-contact gate is not part of this evaluation —
 * proposals only have a single preview/feed-visibility decision.
 *
 * Scale/perf note: all listings referenced by host_offer proposals are
 * fetched in a single batch, and trust scores from the viewer to every
 * distinct "audience host" (the listing's host for host_offer, or the
 * author for trip_wish) are computed with one batched RPC call.
 */

import { getSupabaseAdmin } from "./supabase";
import {
  DEFAULT_ACCESS_SETTINGS,
  type AccessRule,
  type AccessSettings,
  normalizeAccessSettings,
} from "./trust/types";
import { computeIncomingTrustPaths } from "./trust-data";

export type ProposalKind = "trip_wish" | "host_offer";
export type ProposalStatus = "active" | "expired" | "closed";
export type ProposalVisibilityMode = "inherit" | "custom";
export type ProposalHookType = "discount" | "trade" | "none";

export type ProposalThumbnailSource =
  | "unsplash_auto"
  | "unsplash_picked"
  | "user_upload";

/**
 * Attribution blob persisted on each Trip Wish proposal whose photo
 * came from Unsplash. Required to render the "Photo by {photographer}
 * on Unsplash" credit on the card per Unsplash's production-tier
 * guidelines. Null on legacy proposals (predates migration 043) and
 * on user-uploaded thumbnails.
 */
export interface ProposalThumbnailAttribution {
  photographer_name: string;
  photographer_url: string;
  unsplash_url: string;
  download_location: string;
  photo_id: string;
}

export interface ProposalRow {
  id: string;
  author_id: string;
  kind: ProposalKind;
  title: string;
  description: string;
  destinations: string[];
  start_date: string | null;
  end_date: string | null;
  flexible_month: string | null;
  guest_count: number | null;
  listing_id: string | null;
  hook_type: ProposalHookType;
  hook_details: string | null;
  visibility_mode: ProposalVisibilityMode;
  access_settings: AccessSettings | null;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
  thumbnail_url: string | null;
  thumbnail_source: ProposalThumbnailSource | null;
  thumbnail_attribution: ProposalThumbnailAttribution | null;
}

export interface ProposalAuthor {
  id: string;
  name: string;
  avatar_url: string | null;
  vouch_power: number | null;
  host_rating: number | null;
  guest_rating: number | null;
}

export interface ProposalListingSnippet {
  id: string;
  title: string;
  area_name: string;
  cover_photo_url: string | null;
  /** Up to 6 photos total, cover first then sort_order. Feeds the
   *  card-side image carousel. Empty when the listing has no photos. */
  photo_urls: string[];
  host_id: string;
  access_settings: AccessSettings | null;
  visibility_mode: string | null;
}

export interface HydratedProposal {
  row: ProposalRow;
  author: ProposalAuthor;
  listing: ProposalListingSnippet | null;
  /**
   * The rule the viewer was evaluated against (after inheritance
   * resolution). Handy for the detail page's "Visibility" hint row.
   */
  effectiveRule: AccessRule;
  /** Host/author the audience ultimately belongs to. Used by the feed
   *  card to render TrustTag + connection popover. */
  audienceHostId: string;
  /** True when the viewer passes the audience check. */
  visibleToViewer: boolean;
  /** Trust score (audience host → viewer). 0 when not connected. */
  trustScore: number;
  /** Trust degree 1..4, or null when there's no path within 4 hops. */
  trustDegree: 1 | 2 | 3 | 4 | null;
  /** True iff the audience host has a direct vouch on the viewer. */
  hasDirectVouch: boolean;
}

/**
 * Resolve the preview-audience rule for a proposal. For 'custom' mode
 * we read the row's own access_settings.see_preview. For 'inherit' we
 * walk out to the linked listing (host_offer) or use the platform-
 * default profile audience (trip_wish). If a host_offer is pointing at
 * a listing that has been hard-deleted or hidden the proposal falls
 * back to NO-ACCESS — the defensive default keeps orphan rows from
 * leaking into feeds.
 */
export function resolveProposalAudience(
  proposal: Pick<
    ProposalRow,
    "kind" | "visibility_mode" | "access_settings"
  >,
  listing: Pick<ProposalListingSnippet, "access_settings" | "visibility_mode"> | null
): {
  rule: AccessRule;
  /** When true, no viewer (other than the author) can see the proposal.
   *  Currently only hit when a host_offer's listing is hidden. */
  blocked: boolean;
} {
  if (proposal.visibility_mode === "custom") {
    const settings = normalizeAccessSettings(proposal.access_settings);
    return { rule: settings.see_preview, blocked: false };
  }

  // Inherit branch.
  if (proposal.kind === "host_offer") {
    if (!listing || listing.visibility_mode === "hidden") {
      return { rule: { type: "anyone" }, blocked: true };
    }
    const settings = normalizeAccessSettings(listing.access_settings);
    return { rule: settings.see_preview, blocked: false };
  }

  // trip_wish inherit: platform default until profile-level access_settings
  // ships (tracked separately — no per-user visibility rules today).
  return { rule: DEFAULT_ACCESS_SETTINGS.see_preview, blocked: false };
}

/**
 * Evaluate a single AccessRule against (viewerId, score, degree). Mirrors
 * evaluateRule in check-access.ts but without the full listing-contact
 * machinery — proposals only care about preview-level visibility.
 */
export function evaluateAudienceRule(
  rule: AccessRule,
  viewerId: string | null,
  score: number,
  degree: number | null
): boolean {
  switch (rule.type) {
    case "anyone_anywhere":
      return true;
    case "anyone":
      return viewerId != null;
    case "min_score":
      return viewerId != null && score >= (rule.threshold ?? 0);
    case "max_degrees": {
      if (viewerId == null || degree == null) return false;
      const limit = Math.max(1, Math.min(3, rule.threshold ?? 2));
      return degree <= limit;
    }
    case "specific_people":
      return viewerId != null && (rule.user_ids ?? []).includes(viewerId);
    default:
      return false;
  }
}

interface FeedParams {
  viewerId: string | null;
  kind?: ProposalKind | "all";
  authorId?: string;
  /** When true, include the viewer's own proposals (profile integration
   *  and owner-facing detail page need this; the feed hides them so
   *  the list is other-people's posts). */
  includeOwn?: boolean;
  /** Hard cap — the feed is small enough that pagination is overkill
   *  for alpha. Defaults to 200. */
  limit?: number;
}

/**
 * Core feed query + visibility filter. Returns only rows the viewer
 * can see (or every row belonging to the viewer if `includeOwn`).
 */
export async function fetchVisibleProposals(
  params: FeedParams
): Promise<HydratedProposal[]> {
  const supabase = getSupabaseAdmin();
  const limit = params.limit ?? 200;

  let query = supabase
    .from("proposals")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.kind && params.kind !== "all") {
    query = query.eq("kind", params.kind);
  }
  if (params.authorId) {
    query = query.eq("author_id", params.authorId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[proposals] fetch error", error);
    return [];
  }

  const rows = (data ?? []) as ProposalRow[];
  if (rows.length === 0) return [];

  // Batch-load linked listings for inherit host_offer rows.
  const listingIds = [
    ...new Set(
      rows
        .filter((r) => r.listing_id !== null)
        .map((r) => r.listing_id as string)
    ),
  ];
  const listingById = new Map<string, ProposalListingSnippet>();
  if (listingIds.length > 0) {
    const { data: listingRows } = await supabase
      .from("listings")
      .select(
        "id, title, area_name, host_id, access_settings, visibility_mode"
      )
      .in("id", listingIds);
    const { data: photoRows } = await supabase
      .from("listing_photos")
      .select("listing_id, public_url, is_cover, sort_order")
      .in("listing_id", listingIds);
    // Sort cover-first then sort_order, then bucket by listing.
    const byListing = new Map<
      string,
      { public_url: string; is_cover: boolean; sort_order: number }[]
    >();
    for (const p of (photoRows ?? []) as {
      listing_id: string;
      public_url: string;
      is_cover: boolean;
      sort_order: number;
    }[]) {
      const arr = byListing.get(p.listing_id) ?? [];
      arr.push({
        public_url: p.public_url,
        is_cover: p.is_cover,
        sort_order: p.sort_order ?? 0,
      });
      byListing.set(p.listing_id, arr);
    }
    const photosByListing = new Map<string, string[]>();
    const coverByListing = new Map<string, string>();
    for (const [lid, arr] of byListing.entries()) {
      arr.sort((a, b) => {
        if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1;
        return a.sort_order - b.sort_order;
      });
      photosByListing.set(lid, arr.slice(0, 6).map((p) => p.public_url));
      if (arr[0]) coverByListing.set(lid, arr[0].public_url);
    }
    for (const l of (listingRows ?? []) as {
      id: string;
      title: string;
      area_name: string;
      host_id: string;
      access_settings: AccessSettings | null;
      visibility_mode: string | null;
    }[]) {
      listingById.set(l.id, {
        id: l.id,
        title: l.title,
        area_name: l.area_name,
        host_id: l.host_id,
        access_settings: l.access_settings,
        visibility_mode: l.visibility_mode,
        cover_photo_url: coverByListing.get(l.id) ?? null,
        photo_urls: photosByListing.get(l.id) ?? [],
      });
    }
  }

  // Batch-load authors.
  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const { data: authorRows } = await supabase
    .from("users")
    .select("id, name, avatar_url, vouch_power, host_rating, guest_rating")
    .in("id", authorIds);
  const authorById = new Map<string, ProposalAuthor>();
  for (const a of (authorRows ?? []) as ProposalAuthor[]) {
    authorById.set(a.id, a);
  }

  // Resolve audience hosts (the identity whose trust → viewer matters).
  // For inherit host_offer the listing's host is the gate-keeper; for
  // everything else (custom, or trip_wish inherit) the author is.
  const hydrated: HydratedProposal[] = [];
  const audienceHostIds = new Set<string>();
  for (const r of rows) {
    const listing = r.listing_id ? listingById.get(r.listing_id) ?? null : null;
    const { rule, blocked } = resolveProposalAudience(r, listing);
    const audienceHostId =
      r.visibility_mode === "inherit" && r.kind === "host_offer" && listing
        ? listing.host_id
        : r.author_id;
    audienceHostIds.add(audienceHostId);

    hydrated.push({
      row: r,
      author: authorById.get(r.author_id) ?? {
        id: r.author_id,
        name: "Unknown",
        avatar_url: null,
        vouch_power: null,
        host_rating: null,
        guest_rating: null,
      },
      listing,
      effectiveRule: blocked ? { type: "specific_people", user_ids: [] } : rule,
      audienceHostId,
      visibleToViewer: false, // filled in below
      trustScore: 0,
      trustDegree: null,
      hasDirectVouch: false,
    });
  }

  // Batch trust computation: one call for every distinct audience host.
  const trustByHost =
    params.viewerId && audienceHostIds.size > 0
      ? await computeIncomingTrustPaths(
          [...audienceHostIds],
          params.viewerId
        )
      : {};

  // Evaluate visibility per row.
  const visible: HydratedProposal[] = [];
  for (const h of hydrated) {
    const isAuthor =
      params.viewerId != null && h.row.author_id === params.viewerId;

    // Defensive short-circuit: hidden underlying listing never shows to
    // anyone but the author (even on their own profile, the proposal
    // technically "points nowhere" — we still let the author see it so
    // they can close / edit / relink it).
    if (h.effectiveRule.type === "specific_people" && !h.effectiveRule.user_ids?.length && !isAuthor) {
      continue;
    }

    const trust = trustByHost[h.audienceHostId];
    const score = trust?.score ?? 0;
    const degree = (trust?.degree as 1 | 2 | 3 | 4 | null | undefined) ?? null;
    h.trustScore = score;
    h.trustDegree = degree;
    h.hasDirectVouch = trust?.hasDirectVouch ?? false;

    // The author always sees their own proposal; otherwise run the
    // access rule against the viewer.
    if (isAuthor) {
      h.visibleToViewer = true;
    } else {
      h.visibleToViewer = evaluateAudienceRule(
        h.effectiveRule,
        params.viewerId,
        score,
        degree
      );
    }

    if (h.visibleToViewer) {
      if (isAuthor && !params.includeOwn) continue;
      visible.push(h);
    }
  }

  return visible;
}

/**
 * Single-row fetch for the detail page. Respects the same visibility
 * rules as the feed (including "author always sees their own"). Returns
 * null when the viewer isn't allowed OR the row doesn't exist.
 */
export async function fetchProposalById(
  id: string,
  viewerId: string | null
): Promise<HydratedProposal | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as ProposalRow;

  // Expired rows are visible to the author (for edit/archive UX) but
  // hidden from everyone else — mirrors the feed RLS policy.
  const isAuthor = viewerId != null && viewerId === row.author_id;
  if (row.status !== "active" && !isAuthor) return null;

  let listing: ProposalListingSnippet | null = null;
  if (row.listing_id) {
    const { data: listingRow } = await supabase
      .from("listings")
      .select("id, title, area_name, host_id, access_settings, visibility_mode")
      .eq("id", row.listing_id)
      .maybeSingle();
    if (listingRow) {
      const listingTyped = listingRow as {
        id: string;
        title: string;
        area_name: string;
        host_id: string;
        access_settings: AccessSettings | null;
        visibility_mode: string | null;
      };
      const { data: photoRows } = await supabase
        .from("listing_photos")
        .select("public_url, is_cover, sort_order")
        .eq("listing_id", row.listing_id)
        .order("is_cover", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(6);
      const photos = (photoRows ?? []) as {
        public_url: string;
        is_cover: boolean;
        sort_order: number;
      }[];
      listing = {
        id: listingTyped.id,
        title: listingTyped.title,
        area_name: listingTyped.area_name,
        host_id: listingTyped.host_id,
        access_settings: listingTyped.access_settings,
        visibility_mode: listingTyped.visibility_mode,
        cover_photo_url: photos[0]?.public_url ?? null,
        photo_urls: photos.map((p) => p.public_url),
      };
    }
  }

  const { data: authorRow } = await supabase
    .from("users")
    .select("id, name, avatar_url, vouch_power, host_rating, guest_rating")
    .eq("id", row.author_id)
    .maybeSingle();
  const author = (authorRow as ProposalAuthor) ?? {
    id: row.author_id,
    name: "Unknown",
    avatar_url: null,
    vouch_power: null,
    host_rating: null,
    guest_rating: null,
  };

  const { rule, blocked } = resolveProposalAudience(row, listing);
  const audienceHostId =
    row.visibility_mode === "inherit" && row.kind === "host_offer" && listing
      ? listing.host_id
      : row.author_id;

  let score = 0;
  let degree: 1 | 2 | 3 | 4 | null = null;
  let hasDirectVouch = false;
  if (viewerId && !isAuthor) {
    const trust = await computeIncomingTrustPaths(
      [audienceHostId],
      viewerId
    );
    const r = trust[audienceHostId];
    score = r?.score ?? 0;
    degree = (r?.degree as 1 | 2 | 3 | 4 | null | undefined) ?? null;
    hasDirectVouch = r?.hasDirectVouch ?? false;
  }

  const visibleToViewer =
    isAuthor ||
    (!blocked && evaluateAudienceRule(rule, viewerId, score, degree));

  if (!visibleToViewer) return null;

  return {
    row,
    author,
    listing,
    effectiveRule: blocked
      ? { type: "specific_people", user_ids: [] }
      : rule,
    audienceHostId,
    visibleToViewer,
    trustScore: score,
    trustDegree: degree,
    hasDirectVouch,
  };
}

/**
 * Count of active proposals per kind for a given author. Used both on
 * POST (cap enforcement) and on the detail page for "you have X
 * remaining" hints.
 */
export async function countActiveProposalsByAuthor(
  authorId: string
): Promise<{ trip_wish: number; host_offer: number }> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("proposals")
    .select("kind")
    .eq("author_id", authorId)
    .eq("status", "active");
  const out = { trip_wish: 0, host_offer: 0 };
  for (const r of (data ?? []) as { kind: ProposalKind }[]) {
    out[r.kind] += 1;
  }
  return out;
}

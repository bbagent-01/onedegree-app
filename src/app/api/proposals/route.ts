export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { rateLimitOr429 } from "@/lib/rate-limit";
import {
  countActiveProposalsByAuthor,
  fetchVisibleProposals,
  type ProposalHookType,
  type ProposalKind,
} from "@/lib/proposals-data";
import {
  DEFAULT_ACCESS_SETTINGS,
  normalizeAccessSettings,
  type AccessSettings,
} from "@/lib/trust/types";
import { fanOutAlerts } from "@/lib/proposal-alerts";
import { triggerUnsplashDownload } from "@/lib/unsplash";

// Trip Wishes are uncapped — we want guests to post freely and have hosts
// respond. Host Offers are capped at 5 active per author to keep the feed
// from being dominated by a single prolific host and to nudge hosts toward
// refreshing their offer catalog.
const HOST_OFFER_CAP = 5;

interface CreateBody {
  kind?: ProposalKind;
  title?: string;
  description?: string;
  destinations?: string[];
  start_date?: string | null;
  end_date?: string | null;
  flexible_month?: string | null;
  guest_count?: number | null;
  listing_id?: string | null;
  hook_type?: ProposalHookType;
  hook_details?: string | null;
  visibility_mode?: "inherit" | "custom";
  access_settings?: AccessSettings | null;
  thumbnail_url?: string | null;
  thumbnail_source?:
    | "unsplash_auto"
    | "unsplash_picked"
    | "user_upload"
    | null;
  thumbnail_attribution?: ThumbnailAttribution | null;
}

interface ThumbnailAttribution {
  photographer_name: string;
  photographer_url: string;
  unsplash_url: string;
  download_location: string;
  photo_id: string;
}

const THUMBNAIL_SOURCES = new Set([
  "unsplash_auto",
  "unsplash_picked",
  "user_upload",
]);

/**
 * Validate the client-supplied attribution blob. We never trust this
 * shape blindly — the server enforces every required field is present
 * and a string before the row hits Postgres so a bad client can't
 * leave us with a half-populated JSON column. Returns null when any
 * field is missing or wrong type.
 */
function sanitizeThumbnailAttribution(
  raw: unknown
): ThumbnailAttribution | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const isStr = (v: unknown): v is string =>
    typeof v === "string" && v.trim().length > 0;
  if (
    !isStr(r.photographer_name) ||
    !isStr(r.photographer_url) ||
    !isStr(r.unsplash_url) ||
    !isStr(r.download_location) ||
    !isStr(r.photo_id)
  ) {
    return null;
  }
  return {
    photographer_name: r.photographer_name,
    photographer_url: r.photographer_url,
    unsplash_url: r.unsplash_url,
    download_location: r.download_location,
    photo_id: r.photo_id,
  };
}

/**
 * GET /api/proposals
 * Query params:
 *   - kind:     "trip_wish" | "host_offer" | "all" (default "all")
 *   - author:   uuid — filter to this author's posts
 *   - include_own: "1" to keep the viewer's own posts in the result
 *                  (default omits them so the feed is discovery-only)
 */
export async function GET(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!viewer) return Response.json({ error: "User not found" }, { status: 404 });

  const url = new URL(req.url);
  const kindParam = url.searchParams.get("kind") ?? "all";
  const kind: ProposalKind | "all" =
    kindParam === "trip_wish" || kindParam === "host_offer"
      ? kindParam
      : "all";
  const authorParam = url.searchParams.get("author");
  const includeOwn = url.searchParams.get("include_own") === "1";

  const proposals = await fetchVisibleProposals({
    viewerId: viewer.id,
    kind,
    authorId: authorParam ?? undefined,
    includeOwn: includeOwn || Boolean(authorParam && authorParam === viewer.id),
  });

  return Response.json({ proposals });
}

/**
 * POST /api/proposals
 * Body: CreateBody — see type above.
 * Enforces the 5-active-per-kind-per-user cap. Fires alert matching
 * asynchronously after the row lands so the POST isn't blocked on
 * email/SMS network calls.
 */
export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const blocked = await rateLimitOr429("proposal", userId);
  if (blocked) return blocked;

  const supabase = getSupabaseAdmin();
  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!viewer) return Response.json({ error: "User not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as CreateBody | null;
  if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });

  const err = validateCreate(body);
  if (err) return Response.json({ error: err }, { status: 400 });

  // host_offer requires an owned listing — blocks posting offers on
  // someone else's place.
  if (body.kind === "host_offer") {
    const { data: listing } = await supabase
      .from("listings")
      .select("id, host_id")
      .eq("id", body.listing_id as string)
      .maybeSingle();
    if (!listing) {
      return Response.json({ error: "Listing not found" }, { status: 400 });
    }
    if ((listing as { host_id: string }).host_id !== viewer.id) {
      return Response.json(
        { error: "You can only post an offer on your own listing" },
        { status: 403 }
      );
    }
  }

  // Cap check — Host Offers only. Trip Wishes are uncapped.
  if (body.kind === "host_offer") {
    const counts = await countActiveProposalsByAuthor(viewer.id);
    if (counts.host_offer >= HOST_OFFER_CAP) {
      return Response.json(
        {
          error: `You already have ${HOST_OFFER_CAP} active Host Offers. Close one before posting another.`,
          code: "cap_reached",
        },
        { status: 409 }
      );
    }
  }

  // Normalize custom access_settings: require a see_preview rule,
  // default full_listing_contact + allow_intro_requests to sensible
  // values so downstream normalization doesn't trip.
  let accessSettings: AccessSettings | null = null;
  if (body.visibility_mode === "custom") {
    if (!body.access_settings?.see_preview) {
      return Response.json(
        { error: "Custom visibility requires see_preview rule" },
        { status: 400 }
      );
    }
    accessSettings = normalizeAccessSettings({
      ...DEFAULT_ACCESS_SETTINGS,
      ...body.access_settings,
    });
  }

  const destinations = (body.destinations ?? [])
    .map((d) => d.trim())
    .filter((d) => d.length > 0)
    .slice(0, 10);

  const insert = {
    author_id: viewer.id,
    kind: body.kind,
    title: (body.title as string).trim(),
    description: (body.description as string).trim(),
    destinations,
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    flexible_month: body.flexible_month || null,
    guest_count: body.kind === "trip_wish" ? body.guest_count ?? null : null,
    listing_id: body.kind === "host_offer" ? body.listing_id : null,
    hook_type: body.kind === "host_offer" ? body.hook_type ?? "none" : "none",
    hook_details:
      body.kind === "host_offer" && body.hook_type !== "none"
        ? body.hook_details ?? null
        : null,
    visibility_mode: body.visibility_mode ?? "inherit",
    access_settings: accessSettings,
    // Thumbnails are Trip Wish only — Host Offers reuse the listing's
    // photo carousel. Reject mismatches at the boundary so we don't
    // accidentally render a stale thumbnail on an offer card.
    thumbnail_url:
      body.kind === "trip_wish" ? body.thumbnail_url ?? null : null,
    thumbnail_source:
      body.kind === "trip_wish" &&
      body.thumbnail_source &&
      THUMBNAIL_SOURCES.has(body.thumbnail_source)
        ? body.thumbnail_source
        : null,
    // Only persist the attribution blob when the source is one of the
    // Unsplash variants — user_upload + null sources never carry one.
    thumbnail_attribution:
      body.kind === "trip_wish" &&
      typeof body.thumbnail_source === "string" &&
      body.thumbnail_source.startsWith("unsplash_")
        ? sanitizeThumbnailAttribution(body.thumbnail_attribution)
        : null,
  };

  const { data: created, error } = await supabase
    .from("proposals")
    .insert(insert)
    .select("id")
    .single();
  if (error || !created) {
    console.error("[proposals] insert error", error);
    return Response.json(
      { error: "Couldn't create proposal" },
      { status: 500 }
    );
  }

  // Per Unsplash production-tier guidelines, hit the photo's
  // download_location whenever the photo is "used" — we treat creating
  // the proposal as that event. Fire-and-forget inside try/catch so a
  // Unsplash hiccup never blocks the POST response.
  if (
    insert.thumbnail_source &&
    insert.thumbnail_source.startsWith("unsplash_") &&
    insert.thumbnail_attribution
  ) {
    try {
      await triggerUnsplashDownload(
        insert.thumbnail_attribution.download_location
      );
    } catch (e) {
      console.error("[proposals] unsplash download trigger failed:", e);
    }
  }

  // Fire-and-forget alert fan-out. We intentionally await inside a
  // try/catch so a Twilio/Resend hiccup doesn't leak into the POST
  // response, but still runs synchronously on the edge runtime where
  // waitUntil isn't available.
  try {
    await fanOutAlerts(created.id);
  } catch (e) {
    console.error("[proposals] fanOutAlerts failed:", e);
  }

  return Response.json({ id: created.id });
}

function validateCreate(body: CreateBody): string | null {
  if (body.kind !== "trip_wish" && body.kind !== "host_offer") {
    return "kind must be 'trip_wish' or 'host_offer'";
  }
  const title = (body.title ?? "").trim();
  if (title.length < 1 || title.length > 120) {
    return "Title must be 1–120 characters";
  }
  const description = (body.description ?? "").trim();
  if (description.length < 20 || description.length > 1000) {
    return "Description must be 20–1000 characters";
  }
  if ((body.start_date || body.end_date) && body.flexible_month) {
    return "Use either a concrete date range OR a flexible month — not both";
  }
  if (body.start_date && body.end_date && body.start_date > body.end_date) {
    return "start_date must be on or before end_date";
  }
  if (body.kind === "trip_wish" && body.listing_id) {
    return "Trip Wishes cannot link a listing";
  }
  if (body.kind === "host_offer") {
    if (!body.listing_id) return "Host Offers must link a listing";
    if (!body.start_date || !body.end_date) {
      return "Host Offers must include a concrete date range";
    }
    if (body.hook_type && body.hook_type !== "none") {
      if (!body.hook_details || body.hook_details.trim().length < 3) {
        return "Hook details are required when hook type is Discount or Trade";
      }
    }
  }
  if (
    body.visibility_mode &&
    body.visibility_mode !== "inherit" &&
    body.visibility_mode !== "custom"
  ) {
    return "visibility_mode must be 'inherit' or 'custom'";
  }
  if (
    body.visibility_mode === "custom" &&
    !body.access_settings?.see_preview
  ) {
    return "Custom visibility requires access_settings.see_preview";
  }
  // Proposals don't expose a "specific people" picker, so the rule type
  // is rejected at the API as well as the form. Listings still allow it
  // via the listing access controls.
  if (
    body.visibility_mode === "custom" &&
    body.access_settings?.see_preview?.type === "specific_people"
  ) {
    return "Specific-people audiences aren't supported on proposals";
  }
  return null;
}

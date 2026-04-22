export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
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

const ACTIVE_CAP_PER_KIND = 5;

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

  // Cap check. Same user can have 5 Trip Wishes and 5 Host Offers
  // simultaneously — caps are independent across the two kinds.
  const counts = await countActiveProposalsByAuthor(viewer.id);
  if (counts[body.kind as ProposalKind] >= ACTIVE_CAP_PER_KIND) {
    return Response.json(
      {
        error: `You already have ${ACTIVE_CAP_PER_KIND} active ${
          body.kind === "trip_wish" ? "Trip Wishes" : "Host Offers"
        }. Close one before posting another.`,
        code: "cap_reached",
      },
      { status: 409 }
    );
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

  // Alert fan-out is intentionally NOT wired into the POST path on
  // alpha-c — importing `proposal-alerts` (Resend + Twilio + the
  // hydrated-proposal fetch) pushed the Cloudflare Worker bundle over
  // the 3 MiB compressed cap. The code still lives in
  // src/lib/proposal-alerts.ts; hooking it into a future cron (or
  // paid-tier direct call) is a one-line change once we have the
  // bundle headroom.
  console.log(
    `[proposals] created ${created.id} — alert fan-out skipped on alpha-c`
  );

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
  return null;
}

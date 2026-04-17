import { getSupabaseAdmin } from "./supabase";
import {
  computeIncomingTrustPaths,
  type ConnectorPathSummary,
} from "./trust-data";

export type TripTab = "upcoming" | "completed" | "cancelled";

export interface TripCard {
  id: string;
  listing_id: string;
  status: string; // pending | accepted | declined | cancelled
  check_in: string | null;
  check_out: string | null;
  guest_count: number;
  created_at: string;
  cancelled_at: string | null;
  listing: {
    id: string;
    title: string;
    area_name: string;
    thumbnail_url: string | null;
  } | null;
  host: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  thread_id: string | null;
  stay_confirmation_id: string | null;
  guest_left_review: boolean;
  /** Guest's trust score to this host. 0 if none. */
  trust_score: number;
  /** Distinct connectors feeding the score. 0 if none. */
  trust_connection_count: number;
  /** Guest has personally vouched for this host. */
  trust_is_direct: boolean;
  /** Degree of separation. */
  trust_degree: 1 | 2 | null;
  /** Connector bridges sorted strongest → weakest. */
  trust_connector_paths: ConnectorPathSummary[];
}

const todayISO = () => new Date().toISOString().split("T")[0];

/** Categorize a contact_request row into one of the trip tabs. */
export function categorizeTrip(row: {
  status: string;
  check_out: string | null;
}): TripTab {
  if (row.status === "cancelled" || row.status === "declined") return "cancelled";
  if (row.check_out && row.check_out < todayISO()) return "completed";
  return "upcoming";
}

/**
 * Build the full list of trips for a guest. Returns ALL trips with their
 * computed tab so the page can switch tabs client-side.
 */
export async function getTripsForGuest(guestId: string): Promise<TripCard[]> {
  const supabase = getSupabaseAdmin();

  const { data: requests } = await supabase
    .from("contact_requests")
    .select(
      "id, listing_id, host_id, status, check_in, check_out, guest_count, created_at, cancelled_at"
    )
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false });

  if (!requests || requests.length === 0) return [];

  const listingIds = [...new Set(requests.map((r) => r.listing_id))];
  const hostIds = [...new Set(requests.map((r) => r.host_id))];
  const requestIds = requests.map((r) => r.id);

  const [
    { data: listings },
    { data: photos },
    { data: hosts },
    { data: threads },
    { data: stays },
  ] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, area_name")
      .in("id", listingIds.length ? listingIds : ["_"]),
    supabase
      .from("listing_photos")
      .select("listing_id, public_url, sort_order, is_preview")
      .in("listing_id", listingIds.length ? listingIds : ["_"])
      .order("sort_order", { ascending: true }),
    supabase
      .from("users")
      .select("id, name, avatar_url")
      .in("id", hostIds.length ? hostIds : ["_"]),
    supabase
      .from("message_threads")
      .select("id, listing_id, contact_request_id")
      .eq("guest_id", guestId),
    supabase
      .from("stay_confirmations")
      .select("id, contact_request_id, host_rating")
      .in("contact_request_id", requestIds.length ? requestIds : ["_"]),
  ]);

  const listingMap = new Map((listings || []).map((l) => [l.id, l]));
  const hostMap = new Map((hosts || []).map((u) => [u.id, u]));
  const trustByHost = hostIds.length
    ? await computeIncomingTrustPaths(hostIds, guestId)
    : {};
  const thumbMap = new Map<string, string>();
  for (const p of photos || []) {
    // Prefer is_preview=true, otherwise first by sort_order
    if (p.is_preview && !thumbMap.has(`__preview_${p.listing_id}`)) {
      thumbMap.set(`__preview_${p.listing_id}`, p.public_url);
    }
    if (!thumbMap.has(p.listing_id)) thumbMap.set(p.listing_id, p.public_url);
  }
  const threadByRequest = new Map(
    (threads || [])
      .filter((t) => t.contact_request_id)
      .map((t) => [t.contact_request_id as string, t.id as string])
  );
  const threadByListing = new Map(
    (threads || []).map((t) => [t.listing_id, t.id as string])
  );
  const stayByRequest = new Map(
    (stays || []).map((s) => [
      s.contact_request_id as string,
      { id: s.id as string, hostRated: s.host_rating !== null },
    ])
  );

  return requests.map((r) => {
    const listing = listingMap.get(r.listing_id);
    const host = hostMap.get(r.host_id);
    const stay = stayByRequest.get(r.id);
    return {
      id: r.id,
      listing_id: r.listing_id,
      status: r.status,
      check_in: r.check_in,
      check_out: r.check_out,
      guest_count: r.guest_count || 1,
      created_at: r.created_at,
      cancelled_at: r.cancelled_at || null,
      listing: listing
        ? {
            id: listing.id,
            title: listing.title,
            area_name: listing.area_name,
            thumbnail_url:
              thumbMap.get(`__preview_${listing.id}`) ||
              thumbMap.get(listing.id) ||
              null,
          }
        : null,
      host: host
        ? { id: host.id, name: host.name, avatar_url: host.avatar_url }
        : null,
      thread_id:
        threadByRequest.get(r.id) || threadByListing.get(r.listing_id) || null,
      stay_confirmation_id: stay?.id || null,
      guest_left_review: !!stay?.hostRated,
      trust_score: trustByHost[r.host_id]?.score ?? 0,
      trust_connection_count: trustByHost[r.host_id]?.connectionCount ?? 0,
      trust_is_direct: trustByHost[r.host_id]?.hasDirectVouch ?? false,
      trust_degree: trustByHost[r.host_id]?.degree ?? null,
      trust_connector_paths:
        trustByHost[r.host_id]?.connectorPaths ?? [],
    } satisfies TripCard;
  });
}

export interface TripDetail extends TripCard {
  message: string | null;
  host_response_message: string | null;
  responded_at: string | null;
  house_manual: { id: string; content: Record<string, unknown> } | null;
  host_email: string | null;
}

/** Fetch a single trip with extra detail for the trip detail page. */
export async function getTripDetail(
  guestId: string,
  bookingId: string
): Promise<TripDetail | null> {
  const supabase = getSupabaseAdmin();

  const { data: request } = await supabase
    .from("contact_requests")
    .select("*")
    .eq("id", bookingId)
    .eq("guest_id", guestId)
    .maybeSingle();
  if (!request) return null;

  const [
    { data: listing },
    { data: photos },
    { data: host },
    { data: thread },
    { data: stay },
    { data: manual },
  ] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, area_name")
      .eq("id", request.listing_id)
      .maybeSingle(),
    supabase
      .from("listing_photos")
      .select("public_url, sort_order, is_preview")
      .eq("listing_id", request.listing_id)
      .order("sort_order", { ascending: true })
      .limit(4),
    supabase
      .from("users")
      .select("id, name, avatar_url, email, phone_number")
      .eq("id", request.host_id)
      .maybeSingle(),
    supabase
      .from("message_threads")
      .select("id")
      .eq("listing_id", request.listing_id)
      .eq("guest_id", guestId)
      .maybeSingle(),
    supabase
      .from("stay_confirmations")
      .select("id, host_rating")
      .eq("contact_request_id", bookingId)
      .maybeSingle(),
    supabase
      .from("house_manuals")
      .select("id, content")
      .eq("listing_id", request.listing_id)
      .maybeSingle(),
  ]);

  const thumbnail =
    (photos || []).find((p) => p.is_preview)?.public_url ||
    (photos || [])[0]?.public_url ||
    null;

  const trust = host?.id
    ? (await computeIncomingTrustPaths([host.id], guestId))[host.id]
    : null;

  return {
    id: request.id,
    listing_id: request.listing_id,
    status: request.status,
    check_in: request.check_in,
    check_out: request.check_out,
    guest_count: request.guest_count || 1,
    created_at: request.created_at,
    cancelled_at: request.cancelled_at || null,
    listing: listing
      ? {
          id: listing.id,
          title: listing.title,
          area_name: listing.area_name,
          thumbnail_url: thumbnail,
        }
      : null,
    host: host
      ? { id: host.id, name: host.name, avatar_url: host.avatar_url }
      : null,
    thread_id: thread?.id || null,
    stay_confirmation_id: stay?.id || null,
    guest_left_review: stay?.host_rating !== null && stay?.host_rating !== undefined,
    trust_score: trust?.score ?? 0,
    trust_connection_count: trust?.connectionCount ?? 0,
    trust_is_direct: trust?.hasDirectVouch ?? false,
    trust_degree: trust?.degree ?? null,
    trust_connector_paths: trust?.connectorPaths ?? [],
    message: request.message || null,
    host_response_message: request.host_response_message || null,
    responded_at: request.responded_at || null,
    house_manual: manual
      ? { id: manual.id as string, content: (manual.content || {}) as Record<string, unknown> }
      : null,
    host_email: request.status === "accepted" ? host?.email || null : null,
  };
}

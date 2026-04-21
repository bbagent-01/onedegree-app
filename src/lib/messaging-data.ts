import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "./supabase";
import {
  computeTrustPaths,
  computeIncomingTrustPaths,
  type ConnectorPathSummary,
} from "./trust-data";
import { parsePolicy, resolveEffectivePolicy } from "./cancellation";
import {
  enabledMethods,
  parsePaymentMethods,
  type PaymentMethod,
} from "./payment-methods";
import type { PaymentEvent } from "./payment-events";

export type ThreadRole = "guest" | "host";

export interface InboxThread {
  id: string;
  listing_id: string;
  guest_id: string;
  host_id: string;
  contact_request_id: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  role: ThreadRole;
  other_user: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  listing: {
    id: string;
    title: string;
    area_name: string;
    thumbnail_url: string | null;
  } | null;
  /** Viewer's trust score with the other participant. 0 if none. */
  trust_score: number;
  /** Distinct connectors feeding the score. 0 if none. */
  trust_connection_count: number;
  /** Viewer has personally vouched for the other participant. */
  trust_is_direct: boolean;
  /** Degree of separation (1 = direct/single-connector, 2+ = multi-hop). */
  trust_degree: 1 | 2 | 3 | 4 | null;
  /** Connector bridges sorted strongest → weakest. */
  trust_connector_paths: ConnectorPathSummary[];
  /** True for pending intro requests. Hidden from Messages tab. */
  is_intro_request: boolean;
  /** When populated, the intro was promoted to a normal conversation. */
  intro_promoted_at: string | null;
  /** When true, hide sender identity until host replies. */
  sender_anonymous: boolean;
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  sender_id: string | null;
  content: string;
  is_system: boolean;
  created_at: string;
}

export interface ThreadDetail extends InboxThread {
  messages: ThreadMessage[];
  booking: {
    id: string;
    status: string;
    check_in: string | null;
    check_out: string | null;
    guest_count: number;
    total_estimate: number | null;
    message: string | null;
    responded_at: string | null;
    host_response_message: string | null;
    created_at: string | null;
    /** When the guest acknowledged the snapshot terms. Null = pending. */
    terms_accepted_at: string | null;
    /** Original-request snapshot — what the guest actually submitted
     *  before any host-side counter-offer. Drives "Changed from X"
     *  badges on the terms_offered card. */
    original_check_in: string | null;
    original_check_out: string | null;
    original_guest_count: number | null;
    original_total_estimate: number | null;
    /** Snapshot of the cancellation policy as the guest saw it at
     *  submission (listing override → host default → platform
     *  default). Drives the "Host updated" pill on the policy
     *  section when the host counter-offers. */
    original_cancellation_policy: import("./cancellation").CancellationPolicy | null;
  } | null;
  /**
   * Extra fields the reservation sidebar renders. Optional so legacy
   * callers of ThreadDetail that don't need them stay compatible;
   * `getThreadDetail` always populates them.
   */
  reservation_sidebar?: {
    listing_price_min: number | null;
    listing_price_max: number | null;
    /** Flat cleaning fee the host charges once per reservation
     *  (USD, whole dollars). 0/null = no fee. */
    listing_cleaning_fee: number | null;
    listing_rating_avg: number | null;
    listing_review_count: number;
    other_user_host_rating: number | null;
    other_user_guest_rating: number | null;
    other_user_review_count: number;
    other_user_is_host: boolean;
    other_user_joined_year: number | null;
    other_user_location: string | null;
    stay_confirmation_id: string | null;
    stay_reviewed_by_me: boolean;
    /** Has the viewer already vouched for the other participant?
     *  Drives the post-review vouch step in the thread card. */
    viewer_has_vouched: boolean;
    /** Effective cancellation policy for this reservation: snapshot
     *  on the contact_request if accepted, otherwise listing
     *  override → host default → platform default. */
    cancellation_policy: import("./cancellation").CancellationPolicy;
    /**
     * Host's enabled payment methods (with handles). Populated only
     * when the viewer is the guest AND the request is accepted —
     * before approval the guest sees only method *types* on the
     * listing page. The host side of this thread already knows their
     * own handles, so we leave this empty for hosts.
     */
    host_payment_methods: PaymentMethod[];
  };
  /**
   * Per-payment ledger rows for this reservation (Chunk 4.75).
   * Empty array when terms haven't been accepted yet, or when the
   * policy has no payment_schedule. Ordered by schedule_index.
   */
  payment_events?: PaymentEvent[];
}

/** Resolves the current Clerk user to a Track B users row.
 *
 * ALPHA ONLY (CC-Dev1): when an admin is impersonating, this
 * returns the impersonated user's row instead of the real Clerk
 * user's. `getEffectiveUserId` falls through to the real clerk_id
 * lookup whenever the impersonation feature is off. */
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const { getEffectiveUserId } = await import("./impersonation/session");
  const effectiveId = await getEffectiveUserId(userId);
  if (!effectiveId) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("id, name, avatar_url, clerk_id")
    .eq("id", effectiveId)
    .single();
  return data;
}

/**
 * Fetch the inbox for the current user. Returns threads where the user is
 * either the guest or the host, sorted by last_message_at desc.
 */
export async function getInboxForUser(currentUserId: string): Promise<InboxThread[]> {
  const supabase = getSupabaseAdmin();

  const { data: threads } = await supabase
    .from("message_threads")
    .select(
      "id, listing_id, guest_id, host_id, contact_request_id, last_message_at, last_message_preview, guest_unread_count, host_unread_count, is_intro_request, intro_promoted_at, sender_anonymous"
    )
    .or(`guest_id.eq.${currentUserId},host_id.eq.${currentUserId}`)
    .order("last_message_at", { ascending: false });

  if (!threads || threads.length === 0) return [];

  const otherUserIds = Array.from(
    new Set(
      threads.map((t) =>
        t.guest_id === currentUserId ? t.host_id : t.guest_id
      )
    )
  );
  const listingIds = Array.from(new Set(threads.map((t) => t.listing_id)));

  const [{ data: users }, { data: listings }, { data: photos }] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, avatar_url")
      .in("id", otherUserIds.length ? otherUserIds : ["_"]),
    supabase
      .from("listings")
      .select("id, title, area_name")
      .in("id", listingIds.length ? listingIds : ["_"]),
    supabase
      .from("listing_photos")
      .select("listing_id, public_url, sort_order")
      .in("listing_id", listingIds.length ? listingIds : ["_"])
      .order("sort_order", { ascending: true }),
  ]);

  const userMap = new Map((users || []).map((u) => [u.id, u]));
  const listingMap = new Map((listings || []).map((l) => [l.id, l]));
  const thumbMap = new Map<string, string>();
  for (const p of photos || []) {
    if (!thumbMap.has(p.listing_id)) thumbMap.set(p.listing_id, p.public_url);
  }

  // Trust direction in the inbox follows the host→guest rule: when
  // the viewer is the guest, show the host's trust of them (incoming
  // from the other participant). When the viewer is the host, show
  // their own trust of the guest (outgoing, current direction). Split
  // the other participants into two buckets and batch each.
  const guestOtherIds: string[] = []; // others the viewer is a guest of
  const hostOtherIds: string[] = []; // others the viewer is hosting
  for (const t of threads) {
    const isGuest = t.guest_id === currentUserId;
    const otherId = isGuest ? t.host_id : t.guest_id;
    if (isGuest) guestOtherIds.push(otherId);
    else hostOtherIds.push(otherId);
  }
  const [incomingTrust, outgoingTrust] = await Promise.all<
    Awaited<ReturnType<typeof computeTrustPaths>>
  >([
    guestOtherIds.length
      ? computeIncomingTrustPaths(
          [...new Set(guestOtherIds)],
          currentUserId
        )
      : Promise.resolve({}),
    hostOtherIds.length
      ? computeTrustPaths(currentUserId, [...new Set(hostOtherIds)])
      : Promise.resolve({}),
  ]);

  return threads.map((t) => {
    const isGuest = t.guest_id === currentUserId;
    const role: ThreadRole = isGuest ? "guest" : "host";
    const otherId = isGuest ? t.host_id : t.guest_id;
    const otherUser = userMap.get(otherId);
    const listing = listingMap.get(t.listing_id);
    const isIntro = Boolean(t.is_intro_request) && !t.intro_promoted_at;
    // Anonymize the sender when the host is viewing an un-replied
    // anonymous intro request. The guest side always sees the host.
    const hideIdentity =
      isIntro && !isGuest && Boolean(t.sender_anonymous);
    return {
      id: t.id,
      listing_id: t.listing_id,
      guest_id: t.guest_id,
      host_id: t.host_id,
      contact_request_id: t.contact_request_id,
      last_message_at: t.last_message_at,
      last_message_preview: t.last_message_preview,
      unread_count: isGuest ? t.guest_unread_count : t.host_unread_count,
      role,
      other_user: {
        id: otherId,
        name: hideIdentity ? "Someone on 1° B&B" : otherUser?.name || "User",
        avatar_url: hideIdentity ? null : otherUser?.avatar_url || null,
      },
      listing: listing
        ? {
            id: listing.id,
            title: listing.title,
            area_name: listing.area_name,
            thumbnail_url: thumbMap.get(listing.id) || null,
          }
        : null,
      trust_score: hideIdentity
        ? 0
        : (isGuest ? incomingTrust : outgoingTrust)[otherId]?.score ?? 0,
      trust_connection_count: hideIdentity
        ? 0
        : (isGuest ? incomingTrust : outgoingTrust)[otherId]
            ?.connectionCount ?? 0,
      trust_is_direct: hideIdentity
        ? false
        : (isGuest ? incomingTrust : outgoingTrust)[otherId]
            ?.hasDirectVouch ?? false,
      trust_degree: hideIdentity
        ? null
        : (isGuest ? incomingTrust : outgoingTrust)[otherId]?.degree ?? null,
      trust_connector_paths: hideIdentity
        ? []
        : (isGuest ? incomingTrust : outgoingTrust)[otherId]
            ?.connectorPaths ?? [],
      is_intro_request: isIntro,
      intro_promoted_at: t.intro_promoted_at ?? null,
      sender_anonymous: Boolean(t.sender_anonymous),
    } satisfies InboxThread;
  });
}

/**
 * Fetch a single thread with its messages and booking context. Verifies the
 * current user is a participant. Returns null if not found / not authorized.
 */
export async function getThreadDetail(
  currentUserId: string,
  threadId: string
): Promise<ThreadDetail | null> {
  const supabase = getSupabaseAdmin();

  const { data: thread } = await supabase
    .from("message_threads")
    .select(
      "id, listing_id, guest_id, host_id, contact_request_id, last_message_at, last_message_preview, guest_unread_count, host_unread_count, is_intro_request, intro_promoted_at, sender_anonymous"
    )
    .eq("id", threadId)
    .single();

  if (!thread) return null;
  if (thread.guest_id !== currentUserId && thread.host_id !== currentUserId) {
    return null;
  }

  const isGuest = thread.guest_id === currentUserId;
  const role: ThreadRole = isGuest ? "guest" : "host";
  const otherId = isGuest ? thread.host_id : thread.guest_id;
  const isIntro =
    Boolean(thread.is_intro_request) && !thread.intro_promoted_at;
  const hideIdentity =
    isIntro && !isGuest && Boolean(thread.sender_anonymous);

  const [
    { data: messages },
    { data: otherUser },
    { data: listing },
    { data: photos },
    { data: booking },
  ] = await Promise.all([
    supabase
      .from("messages")
      .select("id, thread_id, sender_id, content, is_system, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true }),
    supabase
      .from("users")
      .select(
        "id, name, avatar_url, host_rating, guest_rating, host_review_count, guest_review_count, location, created_at"
      )
      .eq("id", otherId)
      .single(),
    supabase
      .from("listings")
      .select(
        "id, title, area_name, price_min, price_max, cleaning_fee, avg_listing_rating, listing_review_count, host_id, cancellation_policy_override"
      )
      .eq("id", thread.listing_id)
      .single(),
    supabase
      .from("listing_photos")
      .select("listing_id, public_url, sort_order")
      .eq("listing_id", thread.listing_id)
      .order("sort_order", { ascending: true })
      .limit(1),
    thread.contact_request_id
      ? supabase
          .from("contact_requests")
          .select(
            "id, status, check_in, check_out, guest_count, total_estimate, message, responded_at, host_response_message, created_at, cancellation_policy, terms_accepted_at, original_check_in, original_check_out, original_guest_count, original_total_estimate, original_cancellation_policy"
          )
          .eq("id", thread.contact_request_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  // Look up the listing's host cancellation policy + payment
  // methods as the fallback for the resolver. Single targeted
  // query — keeps the parallel bundle above tidy.
  const hostId = (listing as { host_id?: string } | null)?.host_id ?? null;
  let hostCancellationPolicy: unknown = null;
  let hostPaymentMethodsRaw: unknown = null;
  if (hostId) {
    const { data: hostRow } = await supabase
      .from("users")
      .select("cancellation_policy, payment_methods")
      .eq("id", hostId)
      .maybeSingle();
    hostCancellationPolicy =
      (hostRow as { cancellation_policy?: unknown } | null)
        ?.cancellation_policy ?? null;
    hostPaymentMethodsRaw =
      (hostRow as { payment_methods?: unknown } | null)
        ?.payment_methods ?? null;
  }

  // Sidebar-only: check if the other user owns any listings (→
  // "also a host" label) and whether this contact_request already
  // has a stay_confirmation + whether the current user has already
  // rated it. Both are cheap count-style queries; leave them out
  // of the parallel bundle above to keep that block focused.
  const { data: otherHostedListings } = await supabase
    .from("listings")
    .select("id")
    .eq("host_id", otherId)
    .limit(1);
  const otherUserIsHost = (otherHostedListings || []).length > 0;

  // Has the current viewer already vouched for the other user?
  // Drives the post-review vouch-step UX — if they've already
  // vouched we skip the vouch step in ReviewFlowDialog.
  const { data: existingVouch } = await supabase
    .from("vouches")
    .select("id")
    .eq("voucher_id", currentUserId)
    .eq("vouchee_id", otherId)
    .maybeSingle();
  const viewerHasVouched = Boolean(existingVouch?.id);

  // Fetch per-payment events for the reservation. Only relevant
  // on accepted requests that have materialized a ledger via
  // accept-terms; for pending/declined/cancelled we skip the
  // query entirely.
  let paymentEvents: PaymentEvent[] = [];
  if (thread.contact_request_id && booking && (booking as { status?: string }).status === "accepted") {
    const { data: events } = await supabase
      .from("payment_events")
      .select(
        "id, contact_request_id, schedule_index, amount_cents, due_at, status, method, claimed_at, confirmed_at, note"
      )
      .eq("contact_request_id", thread.contact_request_id)
      .order("schedule_index", { ascending: true });
    paymentEvents = (events || []) as PaymentEvent[];
  }

  let stayConfirmationId: string | null = null;
  let stayReviewedByMe = false;
  if (thread.contact_request_id) {
    const { data: stay } = await supabase
      .from("stay_confirmations")
      .select("id, guest_rating, host_rating")
      .eq("contact_request_id", thread.contact_request_id)
      .maybeSingle();
    if (stay) {
      stayConfirmationId = stay.id as string;
      // stay_confirmations column naming: each *_rating column
      // holds the rating given TO that role. So host_rating is
      // the rating the GUEST gave to the host (set by the
      // guest-review endpoint), and guest_rating is the rating
      // the HOST gave the guest (set by the host-review endpoint).
      // The review is "reviewed by me" when the column opposite
      // my role is populated.
      stayReviewedByMe = isGuest
        ? stay.host_rating !== null
        : stay.guest_rating !== null;
    }
  }

  // Reset unread for this side now that the user is viewing the thread.
  await supabase
    .from("message_threads")
    .update(
      isGuest ? { guest_unread_count: 0 } : { host_unread_count: 0 }
    )
    .eq("id", threadId);

  // Thread detail follows the same direction rule as the inbox list:
  // guest side sees host→me (incoming), host side sees me→guest
  // (outgoing / current direction).
  const trust = hideIdentity
    ? undefined
    : isGuest
      ? (await computeIncomingTrustPaths([otherId], currentUserId))[otherId]
      : (await computeTrustPaths(currentUserId, [otherId]))[otherId];

  return {
    id: thread.id,
    listing_id: thread.listing_id,
    guest_id: thread.guest_id,
    host_id: thread.host_id,
    contact_request_id: thread.contact_request_id,
    last_message_at: thread.last_message_at,
    last_message_preview: thread.last_message_preview,
    unread_count: 0,
    role,
    other_user: {
      id: otherId,
      name: hideIdentity ? "Someone on 1° B&B" : otherUser?.name || "User",
      avatar_url: hideIdentity ? null : otherUser?.avatar_url || null,
    },
    listing: listing
      ? {
          id: listing.id,
          title: listing.title,
          area_name: listing.area_name,
          thumbnail_url: photos?.[0]?.public_url || null,
        }
      : null,
    trust_score: trust?.score ?? 0,
    trust_connection_count: trust?.connectionCount ?? 0,
    trust_is_direct: trust?.hasDirectVouch ?? false,
    trust_degree: trust?.degree ?? null,
    trust_connector_paths: trust?.connectorPaths ?? [],
    is_intro_request: isIntro,
    intro_promoted_at: thread.intro_promoted_at ?? null,
    sender_anonymous: Boolean(thread.sender_anonymous),
    messages: (messages || []) as ThreadMessage[],
    booking: booking
      ? {
          id: booking.id,
          status: booking.status,
          check_in: booking.check_in,
          check_out: booking.check_out,
          guest_count: booking.guest_count ?? 1,
          total_estimate:
            (booking as { total_estimate?: number | null }).total_estimate ??
            null,
          message: (booking as { message?: string | null }).message ?? null,
          responded_at:
            (booking as { responded_at?: string | null }).responded_at ?? null,
          host_response_message:
            (booking as { host_response_message?: string | null })
              .host_response_message ?? null,
          created_at:
            (booking as { created_at?: string | null }).created_at ?? null,
          terms_accepted_at:
            (booking as { terms_accepted_at?: string | null })
              .terms_accepted_at ?? null,
          original_check_in:
            (booking as { original_check_in?: string | null })
              .original_check_in ?? null,
          original_check_out:
            (booking as { original_check_out?: string | null })
              .original_check_out ?? null,
          original_guest_count:
            (booking as { original_guest_count?: number | null })
              .original_guest_count ?? null,
          original_total_estimate:
            (booking as { original_total_estimate?: number | null })
              .original_total_estimate ?? null,
          original_cancellation_policy: parsePolicy(
            (booking as { original_cancellation_policy?: unknown })
              .original_cancellation_policy ?? null
          ),
        }
      : null,
    reservation_sidebar: {
      listing_price_min:
        (listing as { price_min?: number | null } | null)?.price_min ?? null,
      listing_price_max:
        (listing as { price_max?: number | null } | null)?.price_max ?? null,
      listing_cleaning_fee:
        (listing as { cleaning_fee?: number | null } | null)?.cleaning_fee ??
        null,
      listing_rating_avg:
        (listing as { avg_listing_rating?: number | null } | null)
          ?.avg_listing_rating ?? null,
      listing_review_count:
        (listing as { listing_review_count?: number | null } | null)
          ?.listing_review_count ?? 0,
      other_user_host_rating:
        (otherUser as { host_rating?: number | null } | null)?.host_rating ??
        null,
      other_user_guest_rating:
        (otherUser as { guest_rating?: number | null } | null)?.guest_rating ??
        null,
      other_user_review_count:
        ((otherUser as { host_review_count?: number | null } | null)
          ?.host_review_count ?? 0) +
        ((otherUser as { guest_review_count?: number | null } | null)
          ?.guest_review_count ?? 0),
      other_user_is_host: otherUserIsHost,
      other_user_joined_year: (otherUser as { created_at?: string | null } | null)
        ?.created_at
        ? new Date((otherUser as { created_at: string }).created_at).getUTCFullYear()
        : null,
      other_user_location:
        (otherUser as { location?: string | null } | null)?.location ?? null,
      stay_confirmation_id: stayConfirmationId,
      stay_reviewed_by_me: stayReviewedByMe,
      viewer_has_vouched: viewerHasVouched,
      cancellation_policy: resolveEffectivePolicy({
        hostDefault: hostCancellationPolicy,
        listingOverride:
          (listing as { cancellation_policy_override?: unknown } | null)
            ?.cancellation_policy_override ?? null,
        reservationSnapshot:
          (booking as { cancellation_policy?: unknown } | null)
            ?.cancellation_policy ?? null,
      }),
      host_payment_methods:
        isGuest && booking?.status === "accepted"
          ? enabledMethods(parsePaymentMethods(hostPaymentMethodsRaw))
          : [],
    },
    payment_events: paymentEvents,
  };
}

/**
 * Get-or-create a thread for (listing, guest). Used both by the booking flow
 * and the host "Message guest" button. Returns the thread id.
 *
 * When a real reservation is attached (`contactRequestId` present) to a
 * thread that was previously just an intro request, we PROMOTE it —
 * set `intro_promoted_at` and drop `sender_anonymous` — so the inbox
 * surfaces it in the main Messages tab instead of Intros. Without
 * this, a guest who first sent an anonymous intro and then submitted
 * a real reservation request would find their booking stuck in the
 * host's Intros tab with the host wondering why the message is
 * invisible in their normal inbox.
 */
export async function getOrCreateThread(opts: {
  listingId: string;
  guestId: string;
  hostId: string;
  contactRequestId?: string | null;
}): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("message_threads")
    .select(
      "id, contact_request_id, is_intro_request, intro_promoted_at, sender_anonymous"
    )
    .eq("listing_id", opts.listingId)
    .eq("guest_id", opts.guestId)
    .maybeSingle();

  if (existing) {
    if (opts.contactRequestId) {
      const patch: Record<string, unknown> = {};
      // Always re-point to the latest contact_request. One
      // reservation per thread is the invariant — after a guest
      // cancels and re-requests, the sidebar + terms card need to
      // reflect the new request, not the stale cancelled one.
      if (existing.contact_request_id !== opts.contactRequestId) {
        patch.contact_request_id = opts.contactRequestId;
      }
      // Promote a stuck intro into a normal conversation. The
      // is_intro_request flag stays so historical context is
      // preserved; the renderer keys off `intro_promoted_at`.
      if (existing.is_intro_request && !existing.intro_promoted_at) {
        patch.intro_promoted_at = new Date().toISOString();
      }
      if (existing.sender_anonymous) {
        patch.sender_anonymous = false;
      }
      if (Object.keys(patch).length > 0) {
        await supabase
          .from("message_threads")
          .update(patch)
          .eq("id", existing.id);
      }
    }
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("message_threads")
    .insert({
      listing_id: opts.listingId,
      guest_id: opts.guestId,
      host_id: opts.hostId,
      contact_request_id: opts.contactRequestId ?? null,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create thread: ${error?.message}`);
  }
  return created.id;
}

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
import type {
  IntroSenderListing,
  IntroSenderProfile,
} from "@/components/trust/IntroRequestCard";
import {
  getIssueReportsForThread,
  type IssueReport,
} from "./issue-reports-data";
import {
  countPendingPhotoRequestsForThreads,
  getPhotoRequestsForThread,
  signPhotoRequestUrl,
  type PhotoRequest,
} from "./photo-requests-data";

export type ThreadRole = "guest" | "host";

export type IntroStatus = "pending" | "accepted" | "declined" | "ignored";

export interface InboxThread {
  id: string;
  /** Null for listing-less DMs (migration 034 — person-to-person
   *  threads opened from profile Contact or intro card DM). */
  listing_id: string | null;
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
  /** Count of pending photo_requests on this thread. Inbox list
   *  shows a small camera icon when > 0. S4 Chunk 5. */
  pending_photo_request_count: number;
  /** True when the thread is an intro thread (filters the Intros tab).
   *  Stays true across pending/accepted states; flips to false on
   *  decline so declined threads archive out of the Intros tab. */
  is_intro_request: boolean;
  /** Intro metadata — null when not an intro thread. */
  intro: {
    sender_id: string;
    recipient_id: string;
    status: IntroStatus;
    decided_at: string | null;
  } | null;
  /** S9d: proposal this thread originated from (Trip Wish or Host
   *  Offer). Null on legacy threads + threads not opened from a
   *  proposal. Drives the OriginProposalCard at the top of the
   *  thread + the bridge action buttons (Send stay terms / Request
   *  these terms). Hydrated by getThreadDetail; the inbox list
   *  doesn't need it. */
  origin_proposal_id?: string | null;
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
  /** Full intro payload + sender profile + sender listings.
   *  Populated only for intro threads (is_intro_request = true). */
  intro_detail: {
    sender_id: string;
    recipient_id: string;
    status: IntroStatus;
    message: string | null;
    start_date: string | null;
    end_date: string | null;
    decided_at: string | null;
    sender_profile: IntroSenderProfile;
    sender_listings: IntroSenderListing[];
  } | null;
  /** S9d: hydrated proposal slice for the OriginProposalCard.
   *  Null when the thread has no origin_proposal_id, or when the
   *  referenced proposal was deleted (FK ON DELETE SET NULL). The
   *  `isAvailable` flag drops to false once the proposal expires or
   *  closes — the card stays visible but the link is suppressed. */
  origin_proposal: {
    id: string;
    kind: "trip_wish" | "host_offer";
    title: string;
    listing_id: string | null;
    /** Author of the proposal. For TW the author is the guest seeking
     *  a stay; for HO the author is the host. The bridge action row
     *  uses this (not thread.host_id) to gate which side sees the
     *  CTA — TW threads are listing-less DMs whose guest_id/host_id
     *  are UUID-canonicalized and therefore meaningless for role. */
    author_id: string;
    status: "active" | "expired" | "closed";
    /** Convenience: row-status==='active' AND not past expires_at.
     *  Mirrors the visibility gate the feed uses. */
    isAvailable: boolean;
  } | null;
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
    /** When either party declined the offered terms before acceptance.
     *  Distinguishes a post-accept decline (this column) from the
     *  pre-terms host decline (status='declined' at stage 2). */
    terms_declined_at: string | null;
    /** Who declined — 'guest' via decline-terms, 'host' via
     *  decline-reservation. Null while pending / accepted. */
    terms_declined_by: "guest" | "host" | null;
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
    /** S7: guest clicked "Request Edits" on pending terms. Card
     *  stays pending; host-side Edit button picks up an amber
     *  accent until the host commits an edit (which clears this). */
    edits_requested_at: string | null;
    edits_requested_by: string | null;
    /** S7: timestamp of the most recent host edit on offered terms. */
    last_edited_at: string | null;
    /** S7: number of times the host has edited the pending offer. */
    edit_count: number;
    /** S7/040: host-offered per-line breakdown. Null on legacy rows
     *  that predate migration 040 — the card falls back to deriving
     *  from listing values in that case. */
    offered_nightly_rate: number | null;
    offered_cleaning_fee: number | null;
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
  /**
   * Issue reports tied to this thread — S4 Chunk 5. Sorted by
   * created_at asc so card renders stay stable.
   */
  issue_reports?: IssueReport[];
  /**
   * Photo requests tied to this thread. `photo_url` on each row is
   * a signed (short-lived) URL suitable for inline rendering — null
   * for pending/dismissed requests.
   */
  photo_requests?: (PhotoRequest & { signed_photo_url: string | null })[];
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
      "id, listing_id, guest_id, host_id, contact_request_id, last_message_at, last_message_preview, guest_unread_count, host_unread_count, is_intro_request, intro_sender_id, intro_recipient_id, intro_status, intro_decided_at"
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
  // listing_id is nullable for DM threads — filter nulls out before
  // fanning to the listings lookup.
  const listingIds = Array.from(
    new Set(threads.map((t) => t.listing_id).filter((x): x is string => !!x))
  );

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
  const [incomingTrust, outgoingTrust, pendingPhotoReqCount] = await Promise.all([
    guestOtherIds.length
      ? computeIncomingTrustPaths(
          [...new Set(guestOtherIds)],
          currentUserId
        )
      : Promise.resolve(
          {} as Awaited<ReturnType<typeof computeTrustPaths>>
        ),
    hostOtherIds.length
      ? computeTrustPaths(currentUserId, [...new Set(hostOtherIds)])
      : Promise.resolve(
          {} as Awaited<ReturnType<typeof computeTrustPaths>>
        ),
    countPendingPhotoRequestsForThreads(threads.map((t) => t.id)),
  ]);

  return threads.map((t) => {
    const isGuest = t.guest_id === currentUserId;
    const role: ThreadRole = isGuest ? "guest" : "host";
    const otherId = isGuest ? t.host_id : t.guest_id;
    const otherUser = userMap.get(otherId);
    const listing = listingMap.get(t.listing_id);
    const introSenderId = (t as { intro_sender_id?: string | null })
      .intro_sender_id ?? null;
    const introRecipientId = (t as { intro_recipient_id?: string | null })
      .intro_recipient_id ?? null;
    const introStatus = (t as { intro_status?: IntroStatus | null })
      .intro_status ?? null;
    const introDecidedAt = (t as { intro_decided_at?: string | null })
      .intro_decided_at ?? null;
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
        name: otherUser?.name || "User",
        avatar_url: otherUser?.avatar_url || null,
      },
      listing: listing
        ? {
            id: listing.id,
            title: listing.title,
            area_name: listing.area_name,
            thumbnail_url: thumbMap.get(listing.id) || null,
          }
        : null,
      trust_score:
        (isGuest ? incomingTrust : outgoingTrust)[otherId]?.score ?? 0,
      trust_connection_count:
        (isGuest ? incomingTrust : outgoingTrust)[otherId]?.connectionCount ??
        0,
      trust_is_direct:
        (isGuest ? incomingTrust : outgoingTrust)[otherId]?.hasDirectVouch ??
        false,
      trust_degree:
        (isGuest ? incomingTrust : outgoingTrust)[otherId]?.degree ?? null,
      trust_connector_paths:
        (isGuest ? incomingTrust : outgoingTrust)[otherId]?.connectorPaths ??
        [],
      pending_photo_request_count: pendingPhotoReqCount.get(t.id) ?? 0,
      is_intro_request: Boolean(t.is_intro_request),
      intro:
        introSenderId && introRecipientId && introStatus
          ? {
              sender_id: introSenderId,
              recipient_id: introRecipientId,
              status: introStatus,
              decided_at: introDecidedAt,
            }
          : null,
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
      "id, listing_id, guest_id, host_id, contact_request_id, last_message_at, last_message_preview, guest_unread_count, host_unread_count, is_intro_request, intro_sender_id, intro_recipient_id, intro_status, intro_message, intro_start_date, intro_end_date, intro_decided_at, origin_proposal_id"
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
    // Listing is optional — DM threads (migration 034) have no
    // listing_id. Resolve to a null-shaped result so the rest of
    // the ThreadDetail builder can treat listing/photos uniformly.
    thread.listing_id
      ? supabase
          .from("listings")
          .select(
            "id, title, area_name, price_min, price_max, cleaning_fee, avg_listing_rating, listing_review_count, host_id, cancellation_policy_override"
          )
          .eq("id", thread.listing_id)
          .single()
      : Promise.resolve({ data: null }),
    thread.listing_id
      ? supabase
          .from("listing_photos")
          .select("listing_id, public_url, sort_order")
          .eq("listing_id", thread.listing_id)
          .order("sort_order", { ascending: true })
          .limit(1)
      : Promise.resolve({ data: null }),
    thread.contact_request_id
      ? supabase
          .from("contact_requests")
          .select(
            "id, status, check_in, check_out, guest_count, total_estimate, message, responded_at, host_response_message, created_at, cancellation_policy, terms_accepted_at, terms_declined_at, terms_declined_by, original_check_in, original_check_out, original_guest_count, original_total_estimate, original_cancellation_policy, edits_requested_at, edits_requested_by, last_edited_at, edit_count, offered_nightly_rate, offered_cleaning_fee"
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
    .eq("is_demo_origin", false)
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

  // Issue reports + photo requests for this thread (S4 Chunk 5).
  // Sign each submitted photo so the card can render inline without
  // exposing the private bucket path to the client.
  const issueReports = await getIssueReportsForThread(threadId);
  const photoRequestRows = await getPhotoRequestsForThread(threadId);
  const photoRequests = await Promise.all(
    photoRequestRows.map(async (pr) => ({
      ...pr,
      signed_photo_url:
        pr.status === "submitted"
          ? await signPhotoRequestUrl(pr.storage_path)
          : null,
    }))
  );

  // Reset unread for this side now that the user is viewing the thread.
  await supabase
    .from("message_threads")
    .update(
      isGuest ? { guest_unread_count: 0 } : { host_unread_count: 0 }
    )
    .eq("id", threadId);

  // Intro detail — fetch the sender's profile + their listings so the
  // IntroRequestCard can render inline without additional round trips.
  // Populated whenever the thread has intro metadata, REGARDLESS of
  // is_intro_request. After Accept we flip is_intro_request=false to
  // move the thread out of the Intros tab, but the card still needs
  // to render (in its collapsed accepted-strip form) so the recipient
  // can revoke. Gating on is_intro_request would leave accepted
  // threads with a broken intro_request system message (falls through
  // to the plain-text fallback renderer and shows a bare "Intro
  // request" row).
  let introDetail: ThreadDetail["intro_detail"] = null;
  const introSenderId = (thread as { intro_sender_id?: string | null })
    .intro_sender_id ?? null;
  const introRecipientId = (thread as { intro_recipient_id?: string | null })
    .intro_recipient_id ?? null;
  const introStatus = (thread as { intro_status?: IntroStatus | null })
    .intro_status ?? null;
  if (introSenderId && introRecipientId && introStatus) {
    const [{ data: senderRow }, { data: senderListings }] = await Promise.all([
      supabase
        .from("users")
        .select(
          "id, name, avatar_url, bio, created_at, host_rating, guest_rating, vouch_count_received"
        )
        .eq("id", introSenderId)
        .maybeSingle(),
      supabase
        .from("listings")
        .select("id, title, area_name, price_min, visibility_mode")
        .eq("host_id", introSenderId)
        .neq("visibility_mode", "hidden")
        .limit(4),
    ]);

    const senderListingPhotos: Map<string, string> = new Map();
    if (senderListings && senderListings.length) {
      const { data: spPhotos } = await supabase
        .from("listing_photos")
        .select("listing_id, public_url, sort_order")
        .in(
          "listing_id",
          senderListings.map((l) => l.id as string)
        )
        .order("sort_order", { ascending: true });
      for (const p of spPhotos || []) {
        if (!senderListingPhotos.has(p.listing_id as string)) {
          senderListingPhotos.set(p.listing_id as string, p.public_url as string);
        }
      }
    }

    introDetail = {
      sender_id: introSenderId,
      recipient_id: introRecipientId,
      status: introStatus,
      message:
        (thread as { intro_message?: string | null }).intro_message ?? null,
      start_date:
        (thread as { intro_start_date?: string | null }).intro_start_date ??
        null,
      end_date:
        (thread as { intro_end_date?: string | null }).intro_end_date ?? null,
      decided_at:
        (thread as { intro_decided_at?: string | null }).intro_decided_at ??
        null,
      sender_profile: {
        id: introSenderId,
        name: (senderRow as { name?: string } | null)?.name || "Someone",
        avatar_url:
          (senderRow as { avatar_url?: string | null } | null)?.avatar_url ??
          null,
        bio: (senderRow as { bio?: string | null } | null)?.bio ?? null,
        member_since_year:
          (senderRow as { created_at?: string | null } | null)?.created_at
            ? new Date(
                (senderRow as { created_at: string }).created_at
              ).getUTCFullYear()
            : null,
        host_rating_avg:
          (senderRow as { host_rating?: number | null } | null)?.host_rating ??
          null,
        guest_rating_avg:
          (senderRow as { guest_rating?: number | null } | null)
            ?.guest_rating ?? null,
        vouch_count_received:
          (senderRow as { vouch_count_received?: number | null } | null)
            ?.vouch_count_received ?? 0,
      },
      sender_listings: (senderListings || []).map((l) => ({
        id: l.id as string,
        title: l.title as string,
        area_name: l.area_name as string,
        price_min: (l as { price_min?: number | null }).price_min ?? null,
        thumbnail_url: senderListingPhotos.get(l.id as string) ?? null,
      })),
    };
  }

  // S9d: hydrate the origin proposal slice if this thread was opened
  // from /proposals/[id]. Fail-soft: if the row was deleted (FK SET
  // NULL) or otherwise missing, the card just doesn't render — the
  // rest of the thread still works. We only need a tiny slice; full
  // visibility re-check is handled when the user clicks through to
  // the detail page.
  let originProposal: ThreadDetail["origin_proposal"] = null;
  const originProposalId = (thread as { origin_proposal_id?: string | null })
    .origin_proposal_id ?? null;
  if (originProposalId) {
    const { data: opRow } = await supabase
      .from("proposals")
      .select("id, kind, title, listing_id, author_id, status, expires_at")
      .eq("id", originProposalId)
      .maybeSingle();
    if (opRow) {
      const status = (opRow as { status: "active" | "expired" | "closed" })
        .status;
      const expiresAt =
        (opRow as { expires_at?: string | null }).expires_at ?? null;
      const expired =
        expiresAt != null && new Date(expiresAt).getTime() < Date.now();
      originProposal = {
        id: (opRow as { id: string }).id,
        kind: (opRow as { kind: "trip_wish" | "host_offer" }).kind,
        title: (opRow as { title: string }).title,
        listing_id:
          (opRow as { listing_id?: string | null }).listing_id ?? null,
        author_id: (opRow as { author_id: string }).author_id,
        status,
        isAvailable: status === "active" && !expired,
      };
    }
  }

  // Thread detail follows the same direction rule as the inbox list:
  // guest side sees host→me (incoming), host side sees me→guest
  // (outgoing / current direction).
  const trust = isGuest
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
      name: otherUser?.name || "User",
      avatar_url: otherUser?.avatar_url || null,
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
    pending_photo_request_count: photoRequests.filter(
      (p) => p.status === "pending"
    ).length,
    is_intro_request: Boolean(thread.is_intro_request),
    intro: introDetail
      ? {
          sender_id: introDetail.sender_id,
          recipient_id: introDetail.recipient_id,
          status: introDetail.status,
          decided_at: introDetail.decided_at,
        }
      : null,
    intro_detail: introDetail,
    origin_proposal_id: originProposalId,
    origin_proposal: originProposal,
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
          terms_declined_at:
            (booking as { terms_declined_at?: string | null })
              .terms_declined_at ?? null,
          terms_declined_by:
            ((booking as { terms_declined_by?: "guest" | "host" | null })
              .terms_declined_by as "guest" | "host" | null | undefined) ??
            null,
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
          edits_requested_at:
            (booking as { edits_requested_at?: string | null })
              .edits_requested_at ?? null,
          edits_requested_by:
            (booking as { edits_requested_by?: string | null })
              .edits_requested_by ?? null,
          last_edited_at:
            (booking as { last_edited_at?: string | null }).last_edited_at ??
            null,
          edit_count:
            (booking as { edit_count?: number | null }).edit_count ?? 0,
          offered_nightly_rate:
            (booking as { offered_nightly_rate?: number | null })
              .offered_nightly_rate ?? null,
          offered_cleaning_fee:
            (booking as { offered_cleaning_fee?: number | null })
              .offered_cleaning_fee ?? null,
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
    issue_reports: issueReports,
    photo_requests: photoRequests,
  };
}

/**
 * Get-or-create a thread for (listing, guest). Used both by the booking flow
 * and the host "Message guest" button. Returns the thread id.
 *
 * When a real reservation is attached (`contactRequestId` present) to a
 * thread that was previously an intro thread, we leave the intro metadata
 * alone — a real booking on an intro thread is ALLOWED after the intro
 * is accepted (the grants exist and unlocked the full listing). If the
 * intro wasn't accepted, the booking flow will have been blocked upstream
 * by check-access, so we'd never reach this path.
 */
export async function getOrCreateThread(opts: {
  listingId: string;
  guestId: string;
  hostId: string;
  contactRequestId?: string | null;
  /** S9d: stamp origin_proposal_id on insert. Existing threads keep
   *  whatever origin they already have — provenance is "first
   *  contact reason," not "latest click." */
  originProposalId?: string | null;
}): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("message_threads")
    .select("id, contact_request_id, origin_proposal_id")
    .eq("listing_id", opts.listingId)
    .eq("guest_id", opts.guestId)
    .maybeSingle();

  if (existing) {
    if (
      opts.contactRequestId &&
      existing.contact_request_id !== opts.contactRequestId
    ) {
      await supabase
        .from("message_threads")
        .update({ contact_request_id: opts.contactRequestId })
        .eq("id", existing.id);
    }
    // Backfill origin_proposal_id only when the row has none yet —
    // never overwrite a different origin already attached to this
    // thread.
    if (
      opts.originProposalId &&
      !existing.origin_proposal_id
    ) {
      await supabase
        .from("message_threads")
        .update({ origin_proposal_id: opts.originProposalId })
        .eq("id", existing.id);
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
      origin_proposal_id: opts.originProposalId ?? null,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create thread: ${error?.message}`);
  }
  return created.id;
}

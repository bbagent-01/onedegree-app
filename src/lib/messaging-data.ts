import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "./supabase";

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
  } | null;
}

/** Resolves the current Clerk user to a Track B users row. */
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("id, name, avatar_url, clerk_id")
    .eq("clerk_id", userId)
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
      "id, listing_id, guest_id, host_id, contact_request_id, last_message_at, last_message_preview, guest_unread_count, host_unread_count"
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

  return threads.map((t) => {
    const isGuest = t.guest_id === currentUserId;
    const role: ThreadRole = isGuest ? "guest" : "host";
    const otherId = isGuest ? t.host_id : t.guest_id;
    const otherUser = userMap.get(otherId);
    const listing = listingMap.get(t.listing_id);
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
      "id, listing_id, guest_id, host_id, contact_request_id, last_message_at, last_message_preview, guest_unread_count, host_unread_count"
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
      .select("id, name, avatar_url")
      .eq("id", otherId)
      .single(),
    supabase
      .from("listings")
      .select("id, title, area_name")
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
          .select("id, status, check_in, check_out, guest_count, total_estimate")
          .eq("id", thread.contact_request_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  // Reset unread for this side now that the user is viewing the thread.
  await supabase
    .from("message_threads")
    .update(
      isGuest ? { guest_unread_count: 0 } : { host_unread_count: 0 }
    )
    .eq("id", threadId);

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
        }
      : null,
  };
}

/**
 * Get-or-create a thread for (listing, guest). Used both by the booking flow
 * and the host "Message guest" button. Returns the thread id.
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
    .select("id, contact_request_id")
    .eq("listing_id", opts.listingId)
    .eq("guest_id", opts.guestId)
    .maybeSingle();

  if (existing) {
    if (opts.contactRequestId && !existing.contact_request_id) {
      await supabase
        .from("message_threads")
        .update({ contact_request_id: opts.contactRequestId })
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
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create thread: ${error?.message}`);
  }
  return created.id;
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getCurrentUser } from "@/lib/messaging-data";
import { getSupabaseAdmin } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface TripRow {
  id: string;
  listing_id: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  guest_count: number;
  created_at: string;
  listing: { id: string; title: string; area_name: string } | null;
  thumbnail_url: string | null;
  thread_id: string | null;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
    accepted: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
    declined: { label: "Declined", className: "bg-red-100 text-red-800 hover:bg-red-100" },
    cancelled: { label: "Cancelled", className: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100" },
  };
  const m = map[status] || map.pending;
  return <Badge className={m.className}>{m.label}</Badge>;
}

function fmt(date: string | null) {
  if (!date) return "TBD";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function TripsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/sign-in?redirect_url=/trips");
  }

  const supabase = getSupabaseAdmin();

  const { data: requests } = await supabase
    .from("contact_requests")
    .select("id, listing_id, status, check_in, check_out, guest_count, created_at")
    .eq("guest_id", currentUser.id)
    .order("created_at", { ascending: false });

  const listingIds = [...new Set((requests || []).map((r) => r.listing_id))];
  const [{ data: listings }, { data: photos }, { data: threads }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, area_name")
      .in("id", listingIds.length ? listingIds : ["_"]),
    supabase
      .from("listing_photos")
      .select("listing_id, public_url, sort_order")
      .in("listing_id", listingIds.length ? listingIds : ["_"])
      .order("sort_order", { ascending: true }),
    supabase
      .from("message_threads")
      .select("id, listing_id, contact_request_id")
      .eq("guest_id", currentUser.id),
  ]);

  const listingMap = new Map((listings || []).map((l) => [l.id, l]));
  const thumbMap = new Map<string, string>();
  for (const p of photos || []) {
    if (!thumbMap.has(p.listing_id)) thumbMap.set(p.listing_id, p.public_url);
  }
  const threadByListing = new Map(
    (threads || []).map((t) => [t.listing_id, t.id as string])
  );
  const threadByRequest = new Map(
    (threads || [])
      .filter((t) => t.contact_request_id)
      .map((t) => [t.contact_request_id as string, t.id as string])
  );

  const trips: TripRow[] = (requests || []).map((r) => ({
    id: r.id,
    listing_id: r.listing_id,
    status: r.status,
    check_in: r.check_in,
    check_out: r.check_out,
    guest_count: r.guest_count || 1,
    created_at: r.created_at,
    listing: listingMap.get(r.listing_id) || null,
    thumbnail_url: thumbMap.get(r.listing_id) || null,
    thread_id:
      threadByRequest.get(r.id) || threadByListing.get(r.listing_id) || null,
  }));

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 py-6 md:px-6 md:py-10">
      <h1 className="text-2xl font-semibold md:text-3xl">Trips</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your reservation requests and upcoming stays.
      </p>

      {trips.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">No trips yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Time to dust off your suitcase.
          </p>
          <Link
            href="/browse"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Start searching
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {trips.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-border bg-white p-4 transition-shadow hover:shadow-sm md:p-5"
            >
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted md:h-24 md:w-24">
                  {t.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.thumbnail_url}
                      alt={t.listing?.title || "Listing"}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/listings/${t.listing_id}`}
                        className="truncate text-base font-semibold hover:underline"
                      >
                        {t.listing?.title || "Listing"}
                      </Link>
                      <div className="truncate text-sm text-muted-foreground">
                        {t.listing?.area_name}
                      </div>
                    </div>
                    {statusBadge(t.status)}
                  </div>
                  <div className="mt-2 text-sm">
                    {fmt(t.check_in)} – {fmt(t.check_out)}
                    <span className="text-muted-foreground">
                      {" · "}
                      {t.guest_count} guest{t.guest_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {t.thread_id && (
                      <Link
                        href={`/inbox/${t.thread_id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600"
                      >
                        Open conversation
                      </Link>
                    )}
                    <Link
                      href={`/listings/${t.listing_id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      View listing
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

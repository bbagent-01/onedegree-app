import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSavedListings } from "@/lib/wishlist-data";
import { LiveListingCard } from "@/components/browse/live-listing-card";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function WishlistsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    redirect("/sign-in?redirect_url=/wishlists");
  }

  const supabase = getSupabaseAdmin();
  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (!userRow?.id) {
    // User synced hasn't completed yet — render empty state.
    return <EmptyWishlist />;
  }

  const listings = await getSavedListings(userRow.id as string);

  if (listings.length === 0) {
    return <EmptyWishlist />;
  }

  return (
    <div className="w-full px-4 py-6 md:px-10 md:py-10 lg:px-20">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold md:text-3xl">Wishlists</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {listings.length} saved {listings.length === 1 ? "place" : "places"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {listings.map((l) => (
          <LiveListingCard key={l.id} listing={l} initialSaved />
        ))}
      </div>
    </div>
  );
}

function EmptyWishlist() {
  return (
    <div className="w-full px-4 py-10 md:px-10 lg:px-20">
      <h1 className="text-2xl font-semibold md:text-3xl">Wishlists</h1>
      <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Heart className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">No saved stays yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Save your favorite places by tapping the heart icon while you browse.
        </p>
        <Link
          href="/browse"
          className="mt-5 inline-flex items-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90"
        >
          Start exploring
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Heart } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getWishlistWithItems } from "@/lib/wishlist-data";
import { LiveListingCard } from "@/components/browse/live-listing-card";
import { WishlistActions } from "@/components/wishlist/wishlist-actions";
import { effectiveAuth } from "@/lib/impersonation/session";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function WishlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId: clerkId } = await effectiveAuth();
  if (!clerkId) {
    redirect(`/sign-in?redirect_url=/wishlists/${id}`);
  }

  const supabase = getSupabaseAdmin();
  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!userRow?.id) notFound();

  const data = await getWishlistWithItems(userRow.id as string, id);
  if (!data) notFound();

  const { wishlist, items } = data;

  return (
    <div className="w-full px-4 py-6 md:px-10 md:py-10 lg:px-20">
      <Link
        href="/wishlists"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All wishlists
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold md:text-3xl">
            {wishlist.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {wishlist.item_count}{" "}
            {wishlist.item_count === 1 ? "place" : "places"} saved
          </p>
        </div>
        <WishlistActions
          wishlistId={wishlist.id}
          initialName={wishlist.name}
          canDelete={!wishlist.is_default}
        />
      </div>

      {items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Heart className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">This list is empty</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Tap the heart on any listing to add it here.
          </p>
          <Link
            href="/browse"
            className="mt-5 inline-flex items-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90"
          >
            Browse stays
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((l) => (
            <LiveListingCard key={l.id} listing={l} initialSaved />
          ))}
        </div>
      )}
    </div>
  );
}

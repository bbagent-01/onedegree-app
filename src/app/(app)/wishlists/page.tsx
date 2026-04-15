import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserWishlists, type WishlistSummary } from "@/lib/wishlist-data";

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

  if (!userRow?.id) return <EmptyState />;

  const lists = await getUserWishlists(userRow.id as string);

  if (lists.length === 0) return <EmptyState />;

  return (
    <div className="w-full px-4 py-6 md:px-10 md:py-10 lg:px-20">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold md:text-3xl">Wishlists</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lists.length} {lists.length === 1 ? "list" : "lists"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {lists.map((l) => (
          <WishlistCollectionCard key={l.id} list={l} />
        ))}
      </div>
    </div>
  );
}

function WishlistCollectionCard({ list }: { list: WishlistSummary }) {
  const covers = list.cover_photos;

  return (
    <Link href={`/wishlists/${list.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        {covers.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Heart className="h-10 w-10" />
          </div>
        ) : covers.length === 1 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={covers[0]}
            alt={list.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          // 2x2 mosaic for 2+ covers; stretch 2 covers to fill the right column.
          <div className="grid h-full w-full grid-cols-2 gap-0.5">
            {[0, 1, 2, 3].map((i) => {
              const src = covers[i] ?? covers[i - 2] ?? covers[0];
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                />
              );
            })}
          </div>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-base font-semibold">{list.name}</h3>
        <p className="text-sm text-muted-foreground">
          {list.item_count} {list.item_count === 1 ? "saved" : "saved"}
        </p>
      </div>
    </Link>
  );
}

function EmptyState() {
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

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
  return (
    <Link href={`/wishlists/${list.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        <CoverMosaic covers={list.cover_photos} alt={list.name} />
      </div>
      <div className="mt-3">
        <h3 className="text-base font-semibold">{list.name}</h3>
        <p className="text-sm text-muted-foreground">
          {list.item_count} saved
        </p>
      </div>
    </Link>
  );
}

/**
 * Proper mosaic that never repeats images:
 *  - 0 covers → heart placeholder
 *  - 1 cover  → full single photo
 *  - 2 covers → 2 columns side-by-side
 *  - 3 covers → one big left + two stacked right
 *  - 4+       → 2×2 grid, first four only
 */
function CoverMosaic({ covers, alt }: { covers: string[]; alt: string }) {
  if (covers.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <Heart className="h-10 w-10" />
      </div>
    );
  }

  if (covers.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={covers[0]}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    );
  }

  if (covers.length === 2) {
    return (
      <div className="grid h-full w-full grid-cols-2 gap-0.5">
        {covers.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt=""
            className="h-full w-full object-cover"
          />
        ))}
      </div>
    );
  }

  if (covers.length === 3) {
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
        {/* Big left cell spans both rows */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={covers[0]}
          alt=""
          className="row-span-2 h-full w-full object-cover"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={covers[1]} alt="" className="h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={covers[2]} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  // 4+ covers → first four in a 2x2 grid
  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
      {covers.slice(0, 4).map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt=""
          className="h-full w-full object-cover"
        />
      ))}
    </div>
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

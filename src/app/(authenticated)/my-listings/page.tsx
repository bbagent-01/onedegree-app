import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase";
import { Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const runtime = "edge";

export default async function MyListingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const supabase = getSupabaseAdmin();
  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!viewer) redirect("/");

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, area_name, price_min, price_max, property_type, is_active, created_at")
    .eq("host_id", viewer.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground">My Listings</h1>
          <p className="text-foreground-secondary text-sm">
            {(listings?.length ?? 0)} listing{(listings?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/listings/create">
          <Button size="sm">
            <Plus className="size-3.5 mr-1" />
            New Listing
          </Button>
        </Link>
      </div>

      {(!listings || listings.length === 0) ? (
        <div className="text-center py-16">
          <p className="text-sm text-foreground-tertiary">
            You haven&apos;t created any listings yet.
          </p>
          <Link href="/listings/create">
            <Button size="sm" className="mt-4">
              <Plus className="size-3.5 mr-1" />
              Create a Listing
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={`/listings/${l.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3 hover:border-primary-border transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{l.title}</p>
                  <p className="flex items-center gap-1 text-xs text-foreground-secondary">
                    <MapPin className="size-3" />
                    {l.area_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {l.price_min && (
                  <span className="text-sm text-foreground-secondary">
                    ${l.price_min}{l.price_max ? `–$${l.price_max}` : ""}/night
                  </span>
                )}
                <Badge variant={l.is_active ? "success" : "secondary"}>
                  {l.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

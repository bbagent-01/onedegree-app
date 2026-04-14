import { redirect } from "next/navigation";
import Link from "next/link";
import { getHostDashboardData } from "@/lib/hosting-data";
import { StatsCards } from "@/components/hosting/stats-cards";
import { ReservationsSection } from "@/components/hosting/reservations-section";
import { ListingsSection } from "@/components/hosting/listings-section";
import { EarningsSection } from "@/components/hosting/earnings-section";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function HostingPage() {
  const data = await getHostDashboardData();
  if (!data) redirect("/");

  const firstName = data.user.name?.split(" ")[0] || "there";
  const hasListings = data.listings.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your listings and guests.
          </p>
        </div>
        {hasListings && (
          <Link
            href="/listings/new"
            className={cn(
              buttonVariants({ size: "lg" }),
              "gap-1.5 bg-brand text-white hover:bg-brand-600"
            )}
          >
            <Plus className="h-4 w-4" />
            New listing
          </Link>
        )}
      </div>

      <div className="mt-8">
        <StatsCards stats={data.stats} />
      </div>

      <div className="mt-12">
        <ReservationsSection
          upcoming={data.reservations.upcoming}
          completed={data.reservations.completed}
          cancelled={data.reservations.cancelled}
        />
      </div>

      <div className="mt-12">
        {hasListings ? (
          <ListingsSection listings={data.listings} />
        ) : (
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Your listings
            </h2>
            <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
              <p className="text-base font-medium text-foreground">
                You don&apos;t have any listings yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first listing to start hosting.
              </p>
              <Link
                href="/listings/new"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-4 gap-1.5 bg-brand text-white hover:bg-brand-600"
                )}
              >
                <Plus className="h-4 w-4" />
                Create a listing
              </Link>
            </div>
          </section>
        )}
      </div>

      <div className="mt-12">
        <EarningsSection earnings={data.earnings} />
      </div>
    </div>
  );
}

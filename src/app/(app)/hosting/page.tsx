import { redirect } from "next/navigation";
import Link from "next/link";
import { getHostDashboardData } from "@/lib/hosting-data";
import { getNetworkData } from "@/lib/network-data";
import { StatsCards } from "@/components/hosting/stats-cards";
import { ReservationsSection } from "@/components/hosting/reservations-section";
import { ListingsSection } from "@/components/hosting/listings-section";
import { EarningsSection } from "@/components/hosting/earnings-section";
import { NetworkSection } from "@/components/trust/network-section";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Plus } from "lucide-react";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function HostingPage() {
  const [data, networkData] = await Promise.all([
    getHostDashboardData(),
    getNetworkData(),
  ]);
  if (!data) redirect("/");

  const firstName = data.user.name?.split(" ")[0] || "there";
  const hasListings = data.listings.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your listings and guests.
        </p>
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
                href="/hosting/create"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
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

      {networkData && (
        <div className="mt-12">
          <TooltipProvider>
            <NetworkSection data={networkData} />
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}

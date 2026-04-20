import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/messaging-data";
import { getHostDashboardData } from "@/lib/hosting-data";
import { getNetworkData } from "@/lib/network-data";
import { getTripsForGuest } from "@/lib/trips-data";
import { StatsCards } from "@/components/hosting/stats-cards";
import { ReservationsSection } from "@/components/hosting/reservations-section";
import { ListingsSection } from "@/components/hosting/listings-section";
import { EarningsSection } from "@/components/hosting/earnings-section";
import { NetworkSection } from "@/components/trust/network-section";
import { TripsList } from "@/components/trips/trips-list";
import { UnifiedDashboard } from "./unified-dashboard";
import { SectionNav } from "@/components/layout/section-nav";
import { Plus } from "lucide-react";
import type { DashboardTab } from "@/components/dashboard/dashboard-tabs";

export async function DashboardContent({
  defaultTab,
}: {
  defaultTab: DashboardTab;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?redirect_url=/dashboard");

  const [hostData, networkData, trips] = await Promise.all([
    getHostDashboardData(),
    getNetworkData(),
    getTripsForGuest(currentUser.id),
  ]);

  if (!hostData) redirect("/");

  const firstName = hostData.user.name?.split(" ")[0] || "there";
  const hasListings = hostData.listings.length > 0;

  const hostingContent = (
    <>
      <div className="mt-8">
        <StatsCards stats={hostData.stats} />
      </div>
      <div className="mt-12">
        <ReservationsSection
          upcoming={hostData.reservations.upcoming}
          completed={hostData.reservations.completed}
          cancelled={hostData.reservations.cancelled}
        />
      </div>
      <div className="mt-12">
        {hasListings ? (
          <ListingsSection listings={hostData.listings} />
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
        <EarningsSection earnings={hostData.earnings} />
      </div>
    </>
  );

  const travelingContent = (
    <div className="mt-8">
      <TripsList trips={trips} />
    </div>
  );

  const networkContent = networkData ? (
    <div className="mt-8">
      <NetworkSection data={networkData} />
    </div>
  ) : null;

  return (
    <>
      <SectionNav />
      <div className="mx-auto w-full max-w-[1600px] px-6 py-10 lg:px-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your dashboard for hosting, traveling, and your trust network.
          </p>
        </div>

        <UnifiedDashboard
          defaultTab={defaultTab}
          hostingContent={hostingContent}
          travelingContent={travelingContent}
          networkContent={networkContent}
        />
      </div>
    </>
  );
}

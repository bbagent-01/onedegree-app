import type { DashboardTab } from "@/components/dashboard/dashboard-tabs";

interface UnifiedDashboardProps {
  defaultTab: DashboardTab;
  hostingContent: React.ReactNode;
  travelingContent: React.ReactNode;
  networkContent: React.ReactNode;
}

/**
 * Section switcher for /dashboard. Previously rendered an in-page
 * DashboardTabs row with Hosting/Traveling/Network buttons — those
 * moved up to the global SectionNav, so this now just picks the
 * right content block for the current ?tab= value. Server component
 * (no client state); nav clicks reload the page with a new URL,
 * which is what drives defaultTab.
 */
export function UnifiedDashboard({
  defaultTab,
  hostingContent,
  travelingContent,
  networkContent,
}: UnifiedDashboardProps) {
  if (defaultTab === "traveling") return <>{travelingContent}</>;
  if (defaultTab === "network") return <>{networkContent}</>;
  return <>{hostingContent}</>;
}

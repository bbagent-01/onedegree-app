"use client";

import { useRouter, usePathname } from "next/navigation";
import { DashboardTabs, type DashboardTab } from "@/components/dashboard/dashboard-tabs";

interface UnifiedDashboardProps {
  defaultTab: DashboardTab;
  hostingContent: React.ReactNode;
  travelingContent: React.ReactNode;
  networkContent: React.ReactNode;
}

const TAB_PATHS: Record<DashboardTab, string> = {
  hosting: "/dashboard",
  traveling: "/dashboard/traveling",
  network: "/dashboard/network",
};

function tabFromPath(path: string): DashboardTab {
  if (path.startsWith("/dashboard/traveling")) return "traveling";
  if (path.startsWith("/dashboard/network")) return "network";
  return "hosting";
}

export function UnifiedDashboard({
  defaultTab,
  hostingContent,
  travelingContent,
  networkContent,
}: UnifiedDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const tab = tabFromPath(pathname) || defaultTab;

  const handleTabChange = (newTab: DashboardTab) => {
    router.push(TAB_PATHS[newTab]);
  };

  return (
    <>
      <div className="mt-6">
        <DashboardTabs active={tab} onChange={handleTabChange} />
      </div>

      {tab === "hosting" && hostingContent}
      {tab === "traveling" && travelingContent}
      {tab === "network" && networkContent}
    </>
  );
}

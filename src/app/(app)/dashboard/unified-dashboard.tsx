"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardTabs, type DashboardTab } from "@/components/dashboard/dashboard-tabs";

interface UnifiedDashboardProps {
  defaultTab: DashboardTab;
  hostingContent: React.ReactNode;
  travelingContent: React.ReactNode;
  networkContent: React.ReactNode;
}

/**
 * Single-page dashboard. All three tabs' content is rendered up-front
 * (already fetched in parallel server-side) and switched via CSS, so
 * tab changes feel instant. The URL stays in sync via history.replaceState
 * so each tab is still bookmark- and share-able at /dashboard?tab=…
 */
export function UnifiedDashboard({
  defaultTab,
  hostingContent,
  travelingContent,
  networkContent,
}: UnifiedDashboardProps) {
  const [tab, setTab] = useState<DashboardTab>(defaultTab);

  const handleTabChange = (newTab: DashboardTab) => {
    setTab(newTab);
    if (typeof window !== "undefined") {
      const qs = newTab === "hosting" ? "" : `?tab=${newTab}`;
      window.history.replaceState(null, "", `/dashboard${qs}`);
    }
  };

  return (
    <>
      <div className="mt-6">
        <DashboardTabs active={tab} onChange={handleTabChange} />
      </div>

      <div className={cn(tab !== "hosting" && "hidden")}>{hostingContent}</div>
      <div className={cn(tab !== "traveling" && "hidden")}>
        {travelingContent}
      </div>
      <div className={cn(tab !== "network" && "hidden")}>{networkContent}</div>
    </>
  );
}

"use client";

import { useState } from "react";
import { DashboardTabs, type DashboardTab } from "@/components/dashboard/dashboard-tabs";

interface UnifiedDashboardProps {
  hostingContent: React.ReactNode;
  travelingContent: React.ReactNode;
  networkContent: React.ReactNode;
}

export function UnifiedDashboard({
  hostingContent,
  travelingContent,
  networkContent,
}: UnifiedDashboardProps) {
  const [tab, setTab] = useState<DashboardTab>("hosting");

  return (
    <>
      <div className="mt-6">
        <DashboardTabs active={tab} onChange={setTab} />
      </div>

      {tab === "hosting" && hostingContent}
      {tab === "traveling" && travelingContent}
      {tab === "network" && networkContent}
    </>
  );
}

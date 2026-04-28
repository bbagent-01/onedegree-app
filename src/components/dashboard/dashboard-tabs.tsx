"use client";

import { cn } from "@/lib/utils";
import { LayoutGrid, CalendarDays, Users, Sparkles } from "lucide-react";

export type DashboardTab = "hosting" | "traveling" | "network" | "proposals";

const tabs: { value: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "hosting", label: "Hosting", icon: LayoutGrid },
  { value: "traveling", label: "Traveling", icon: CalendarDays },
  { value: "network", label: "Network", icon: Users },
  { value: "proposals", label: "Proposals", icon: Sparkles },
];

interface DashboardTabsProps {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}

export function DashboardTabs({ active, onChange }: DashboardTabsProps) {
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => {
        const isActive = active === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all",
              isActive
                ? "bg-foreground text-background shadow-sm"
                : "border border-border bg-white text-foreground hover:bg-muted"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

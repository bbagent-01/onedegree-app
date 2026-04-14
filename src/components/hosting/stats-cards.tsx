import { Home, Calendar, MessageSquare, Star } from "lucide-react";
import type { HostDashboardData } from "@/lib/hosting-data";

export function StatsCards({ stats }: { stats: HostDashboardData["stats"] }) {
  const items = [
    {
      label: "Active listings",
      value: stats.activeListings.toString(),
      icon: Home,
    },
    {
      label: "Upcoming stays (30 days)",
      value: stats.upcomingStays.toString(),
      icon: Calendar,
    },
    {
      label: "Pending requests",
      value: stats.unreadMessages.toString(),
      icon: MessageSquare,
    },
    {
      label: "Average rating",
      value:
        stats.avgRating !== null
          ? `${stats.avgRating.toFixed(1)}`
          : "—",
      sub:
        stats.ratingCount > 0
          ? `${stats.ratingCount} review${stats.ratingCount === 1 ? "" : "s"}`
          : "No reviews yet",
      icon: Star,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {item.label}
              </p>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {item.value}
            </p>
            {"sub" in item && item.sub && (
              <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { DollarSign, TrendingUp, Clock } from "lucide-react";
import type { HostDashboardData } from "@/lib/hosting-data";

function fmt(amount: number) {
  return `$${amount.toLocaleString()}`;
}

export function EarningsSection({
  earnings,
}: {
  earnings: HostDashboardData["earnings"];
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground">Earnings</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Estimated from confirmed stays. Final payouts depend on your payment method.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Total earned
            </p>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {fmt(earnings.total)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">All time</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              This month
            </p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {fmt(earnings.thisMonth)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            From completed stays
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Pending payouts
            </p>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {fmt(earnings.pending)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upcoming confirmed stays
          </p>
        </div>
      </div>
    </section>
  );
}

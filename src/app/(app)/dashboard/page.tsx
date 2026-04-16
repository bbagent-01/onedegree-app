import { DashboardContent } from "./dashboard-content";
import type { DashboardTab } from "@/components/dashboard/dashboard-tabs";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function parseTab(raw: string | string[] | undefined): DashboardTab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "traveling" || v === "network") return v;
  return "hosting";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const sp = await searchParams;
  return <DashboardContent defaultTab={parseTab(sp.tab)} />;
}

import { DashboardContent } from "./dashboard-content";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return <DashboardContent defaultTab="hosting" />;
}

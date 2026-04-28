import { redirect } from "next/navigation";

export const runtime = "edge";

/**
 * Legacy route. The dashboard now lives at /dashboard?tab=network
 * with client-side tab switching.
 */
export default function DashboardNetworkRedirect() {
  redirect("/dashboard?tab=network");
}

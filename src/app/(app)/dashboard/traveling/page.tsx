import { redirect } from "next/navigation";

export const runtime = "edge";

/**
 * Legacy route. The dashboard now lives at /dashboard?tab=traveling
 * with client-side tab switching.
 */
export default function DashboardTravelingRedirect() {
  redirect("/dashboard?tab=traveling");
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { getEffectiveUserId } from "@/lib/impersonation/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { AlertsManager } from "@/components/proposals/alerts-manager";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in?redirect=/alerts");
  const viewerId = await getEffectiveUserId(clerkId);
  if (!viewerId) redirect("/sign-in?redirect=/alerts");

  const sp = await searchParams;
  const prefillKind =
    typeof sp.prefill_kind === "string" ? sp.prefill_kind : "";
  const prefillDest =
    typeof sp.prefill_dest === "string" ? sp.prefill_dest : "";

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("proposal_alerts")
    .select("*")
    .eq("subscriber_id", viewerId)
    .order("created_at", { ascending: false });

  const alerts = (data ?? []) as Array<{
    id: string;
    kind: "trip_wish" | "host_offer" | "either";
    destinations: string[];
    start_window: string | null;
    end_window: string | null;
    delivery: "email" | "sms" | "both";
    status: "active" | "paused";
    created_at: string;
    last_notified_at: string | null;
  }>;

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/proposals"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to proposals
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-semibold md:text-3xl">
        Proposal alerts
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Get notified when a new Trip Wish or Host Offer in your network
        matches what you&apos;re looking for.
      </p>

      <AlertsManager
        initialAlerts={alerts}
        prefillKind={
          prefillKind === "trip_wish" ||
          prefillKind === "host_offer" ||
          prefillKind === "either"
            ? prefillKind
            : undefined
        }
        prefillDestinations={
          prefillDest
            ? prefillDest.split(",").map((d) => d.trim()).filter(Boolean)
            : undefined
        }
      />
    </div>
  );
}

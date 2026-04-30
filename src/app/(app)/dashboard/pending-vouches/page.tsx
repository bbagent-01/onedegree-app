import { redirect } from "next/navigation";
import Link from "next/link";
import { Send } from "lucide-react";
import { effectiveAuth } from "@/lib/impersonation/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { buttonVariants } from "@/components/ui/button";
import { PendingVouchesList } from "@/components/invite/pending-vouches-list";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface PendingRow {
  id: string;
  recipient_name: string;
  recipient_phone: string | null;
  status: "pending" | "claimed" | "canceled" | "expired";
  created_at: string;
  expires_at: string;
  token: string;
  claimed_at: string | null;
  vouch_type: "standard" | "inner_circle";
}

export default async function PendingVouchesPage() {
  const { userId } = await effectiveAuth();
  if (!userId) redirect("/sign-in?redirect_url=/dashboard/pending-vouches");

  const supabase = getSupabaseAdmin();
  const { data: me } = await supabase
    .from("users")
    .select("id, name")
    .eq("clerk_id", userId)
    .single();
  if (!me) redirect("/sign-in");

  const { data } = await supabase
    .from("pending_vouches")
    .select(
      "id, recipient_name, recipient_phone, status, created_at, expires_at, token, claimed_at, vouch_type"
    )
    .eq("sender_id", me.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as PendingRow[];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://trustead.app";
  // Pre-compute the share URL + prefilled SMS text for each row server-
  // side so the client doesn't need to hit the create endpoint again
  // when the user taps "Resend" — same token, same URL, same text.
  const senderFirstName = (me.name as string)?.split(" ")[0] || "A friend";
  const enriched = rows.map((r) => ({
    ...r,
    share_url: `${baseUrl}/join/${r.token}`,
    prefilled_sms_text: `${senderFirstName} wants to vouch for you on Trustead — ${baseUrl}/join/${r.token}`,
  }));

  const pendingCount = enriched.filter((r) => r.status === "pending").length;

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-8 md:px-6 md:py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Pending invites</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {pendingCount} active · invites expire after 30 days
          </p>
        </div>
        <Link
          href="/invite/share"
          className={buttonVariants({ size: "lg", className: "shrink-0 gap-1.5" })}
        >
          <Send className="h-4 w-4" />
          New invite
        </Link>
      </div>

      <div className="mt-6">
        <PendingVouchesList rows={enriched} />
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Cap: 20 active invites at once. Cancel one or wait for it to expire.
      </p>
    </div>
  );
}

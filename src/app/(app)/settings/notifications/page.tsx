import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NotificationsForm } from "@/components/settings/notifications-form";
import { effectiveAuth } from "@/lib/impersonation/session";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const DEFAULTS = {
  booking_request: true,
  booking_confirmed: true,
  booking_declined: true,
  new_message: true,
  checkin_reminder: true,
  review_reminder: true,
};

export default async function NotificationsSettingsPage() {
  const { userId } = await effectiveAuth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/settings/notifications");
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("email_prefs")
    .eq("clerk_id", userId)
    .single();

  const prefs = { ...DEFAULTS, ...(data?.email_prefs || {}) };

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Account settings
      </Link>
      <h1 className="text-2xl font-semibold md:text-3xl">Email notifications</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose which transactional emails One Degree BNB sends you.
      </p>

      <NotificationsForm initialPrefs={prefs} />
    </div>
  );
}

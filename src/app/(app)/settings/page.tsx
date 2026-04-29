import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, User, Bell, Shield } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DeactivateButton } from "@/components/settings/deactivate-button";
import { ReplayOnboardingLink } from "@/components/settings/replay-onboarding-link";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    redirect("/sign-in?redirect_url=/settings");
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return (
    <div className="mx-auto w-full max-w-[780px] px-4 py-6 md:px-6 md:py-10">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Account settings</h1>
        {data?.email && (
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">{data.email}</span>
          </p>
        )}
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your account
        </h2>
        <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-white">
          <SettingsLink
            href="/profile/edit"
            icon={User}
            title="Personal info"
            description="Name, bio, location, languages, and work."
          />
          <SettingsLink
            href="/settings/notifications"
            icon={Bell}
            title="Notifications"
            description="Choose which emails you want to receive."
          />
          {data?.id && (
            <SettingsLink
              href={`/profile/${data.id}`}
              icon={Shield}
              title="View public profile"
              description="See how your profile looks to other users."
            />
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Help & tour
        </h2>
        <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-white">
          <ReplayOnboardingLink />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Account management
        </h2>
        <div className="mt-3 rounded-2xl border border-border bg-white p-6">
          <h3 className="text-base font-semibold">Deactivate account</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your listings will be hidden and you&apos;ll be signed out. We
            don&apos;t delete your data — contact support if you need a full
            deletion.
          </p>
          <div className="mt-4">
            <DeactivateButton />
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingsLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

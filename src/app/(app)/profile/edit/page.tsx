import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { effectiveAuth } from "@/lib/impersonation/session";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const { userId: clerkId } = await effectiveAuth();
  if (!clerkId) {
    redirect("/sign-in?redirect_url=/profile/edit");
  }

  // SELECT * so this page still works pre-migration-011 — the new
  // profile columns (location/languages/occupation) just come back
  // undefined and the form falls back to empty strings.
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (!data) {
    // Webhook hasn't synced this Clerk user yet. Show a friendly message
    // instead of redirecting away from the page the user asked for.
    return (
      <div className="mx-auto w-full max-w-[680px] px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl font-semibold md:text-4xl">Edit profile</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We&apos;re still finishing setting up your account. Give it a few
          seconds and reload this page.
        </p>
      </div>
    );
  }

  const raw = data as Record<string, unknown>;

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Account settings
      </Link>
      <h1 className="font-serif text-3xl font-semibold md:text-4xl">Edit profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This info appears on your public profile. Avatar and email are managed
        through your account settings.
      </p>

      <ProfileEditForm
        userId={raw.id as string}
        initial={{
          name: (raw.name as string) || "",
          bio: (raw.bio as string | null) || "",
          location: (raw.location as string | null) || "",
          occupation: (raw.occupation as string | null) || "",
          languages:
            ((raw.languages as string[] | null) || []).join(", ") || "",
        }}
      />
    </div>
  );
}

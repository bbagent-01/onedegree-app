import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    redirect("/sign-in?redirect_url=/profile/edit");
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("id, name, avatar_url, bio, location, occupation, languages")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (!data) {
    // User row should exist via webhook — bail out gracefully.
    redirect("/browse");
  }

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-6 md:px-6 md:py-10">
      <h1 className="text-2xl font-semibold md:text-3xl">Edit profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This info appears on your public profile. Avatar and email are managed
        through your account settings.
      </p>

      <ProfileEditForm
        userId={data.id as string}
        initial={{
          name: (data.name as string) || "",
          bio: (data.bio as string | null) || "",
          location: (data.location as string | null) || "",
          occupation: (data.occupation as string | null) || "",
          languages:
            ((data.languages as string[] | null) || []).join(", ") || "",
        }}
      />
    </div>
  );
}

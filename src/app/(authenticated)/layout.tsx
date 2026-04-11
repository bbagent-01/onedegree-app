import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { AppShell } from "@/components/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const supabase = getSupabaseAdmin();

  // Get current user's profile
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, name, avatar_url, guest_rating, guest_review_count")
    .eq("clerk_id", userId)
    .single();

  if (!currentUser) redirect("/");

  // Check if user has any listings
  const { count } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("host_id", currentUser.id)
    .eq("is_active", true);

  return (
    <AppShell
      currentUser={{
        ...currentUser,
        has_listings: (count ?? 0) > 0,
      }}
    >
      {children}
    </AppShell>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getEffectiveUserId } from "@/lib/impersonation/session";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * /profile fallback. Signed-in viewers bounce to their own profile;
 * signed-out viewers land on the signup flow (they can't meaningfully
 * browse profiles without an account).
 */
export default async function ProfileIndexPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    redirect("/sign-up");
  }
  const viewerId = await getEffectiveUserId(clerkId);
  if (!viewerId) {
    redirect("/sign-up");
  }
  redirect(`/profile/${viewerId}`);
}

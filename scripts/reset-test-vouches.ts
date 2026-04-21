/**
 * Delete Loren's vouches to the three test hosts so the review +
 * vouch flow shows the vouch prompt (alreadyVouched=false). The
 * standard wipe-bookings.ts preserves vouches (trust graph is
 * independent of booking data), but for end-to-end review-flow
 * testing we want the post-review vouch step to actually appear.
 */
import { createClient } from "@supabase/supabase-js";

const TEST_HOST_NAMES = ["Rosa Delgado", "Priya Reddy", "Kai Stephens"];

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: loren } = await sb
    .from("users")
    .select("id")
    .eq("email", "lorenpolster@gmail.com")
    .maybeSingle();
  if (!loren) {
    console.error("loren not found");
    process.exit(1);
  }

  const { data: hosts } = await sb
    .from("users")
    .select("id, name")
    .in("name", TEST_HOST_NAMES);

  for (const h of hosts || []) {
    const { error } = await sb
      .from("vouches")
      .delete()
      .eq("voucher_id", loren.id)
      .eq("vouchee_id", h.id);
    console.log(
      `${h.name}: ${error ? `ERROR ${error.message}` : "vouches cleared"}`
    );
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

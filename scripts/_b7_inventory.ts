/**
 * One-shot inventory of current demo state for B7.
 * Reads users WHERE is_test_user=true + their listings.
 * Output is captured for DEMO_SEED_BEFORE.md.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error("Missing env");
  process.exit(1);
}
const sb = createClient(url, key);

async function main() {
  const { count: totalUsers } = await sb
    .from("users")
    .select("*", { count: "exact", head: true });
  const { count: realUsers } = await sb
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("is_test_user", false);
  const { count: testUsers } = await sb
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("is_test_user", true);

  const { data: demos } = await sb
    .from("users")
    .select("id, clerk_id, name, email, avatar_url, bio, phone_number, created_at")
    .eq("is_test_user", true)
    .order("created_at", { ascending: true });

  console.log("=== COUNTS ===");
  console.log(`users total          : ${totalUsers}`);
  console.log(`users real           : ${realUsers}`);
  console.log(`users is_test_user=t : ${testUsers}`);
  console.log("");
  console.log("=== DEMO USERS ===");
  for (const u of demos ?? []) {
    console.log(JSON.stringify(u));
  }

  console.log("");
  console.log("=== DEMO LISTINGS (host is_test_user=true) ===");
  const demoIds = (demos ?? []).map((d) => d.id);
  if (demoIds.length) {
    const { data: listings } = await sb
      .from("listings")
      .select("id, host_id, title, area_name, price_min, price_max, is_active, created_at")
      .in("host_id", demoIds)
      .order("created_at", { ascending: true });
    console.log(`count: ${listings?.length ?? 0}`);
    for (const l of listings ?? []) {
      console.log(JSON.stringify(l));
    }
  }

  console.log("");
  console.log("=== STORAGE BUCKETS ===");
  const { data: buckets } = await sb.storage.listBuckets();
  for (const b of buckets ?? []) {
    console.log(`${b.name} (public=${b.public})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

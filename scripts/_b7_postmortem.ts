/**
 * Post-apply diagnostic: dump every user with name/clerk_id/is_test_user
 * so we can compare against the pre-migration state in DEMO_SEED_BEFORE.md
 * and figure out whether real users were affected.
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { count: total } = await sb
    .from("users")
    .select("*", { count: "exact", head: true });

  const { data: users } = await sb
    .from("users")
    .select("id, clerk_id, name, email, is_test_user, created_at")
    .order("created_at", { ascending: true });

  console.log(`TOTAL users: ${total}\n`);
  console.log("clerk_id_prefix | is_test | name (email)");
  console.log("─".repeat(100));
  for (const u of users ?? []) {
    const prefix = (u.clerk_id || "").slice(0, 30);
    const flag = u.is_test_user ? "TEST" : "REAL";
    console.log(`${prefix.padEnd(35)} | ${flag} | ${u.name} (${u.email})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Populate payment_methods on every seeded test user that doesn't
 * already have at least one enabled. Adds a Venmo handle derived
 * from the user's first name so PaymentDueCard's "How to pay X"
 * block has clickable links to test. Idempotent — users with any
 * enabled method are left alone.
 */
import { createClient } from "@supabase/supabase-js";

function venmoHandle(name: string | null): string {
  const first = (name ?? "friend").split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  return `@${first || "friend"}`;
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: users } = await sb
    .from("users")
    .select("id, name, is_test_user, payment_methods")
    .eq("is_test_user", true);

  if (!users || users.length === 0) {
    console.log("no test users");
    return;
  }

  let updated = 0;
  let skipped = 0;
  for (const u of users) {
    const existing = Array.isArray(u.payment_methods)
      ? (u.payment_methods as Array<{ enabled?: boolean }>)
      : [];
    const hasEnabled = existing.some((m) => m?.enabled === true);
    if (hasEnabled) {
      skipped += 1;
      continue;
    }
    const methods = [
      {
        type: "venmo",
        handle: venmoHandle(u.name),
        note: null,
        enabled: true,
      },
    ];
    const { error } = await sb
      .from("users")
      .update({ payment_methods: methods })
      .eq("id", u.id);
    if (error) {
      console.error("update failed:", u.id, error.message);
      continue;
    }
    updated += 1;
    console.log(`  ${u.name ?? u.id} → venmo ${methods[0].handle}`);
  }
  console.log(`\ndone — updated ${updated}, skipped ${skipped}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

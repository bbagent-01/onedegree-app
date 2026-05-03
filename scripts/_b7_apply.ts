/**
 * Apply migration 050 to the live Supabase project via the Management API.
 * Same code path as _b7_dryrun.ts, but commits instead of rolling back.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PROJECT_REF = SUPABASE_URL.replace(/^https:\/\//, "").split(".")[0];

const sql = readFileSync(
  join(process.cwd(), "supabase", "migrations", "050_demo_presidents.sql"),
  "utf8"
);

async function run() {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  console.log(`status: ${r.status}`);
  console.log(await r.text());

  // Post-apply: verify counts
  const verifySql = `
    SELECT
      (SELECT count(*) FROM users WHERE clerk_id LIKE 'seed_president_%') AS presidents,
      (SELECT count(*) FROM users WHERE is_test_user = true) AS test_users,
      (SELECT count(*) FROM users WHERE is_test_user = false) AS real_users,
      (SELECT count(*) FROM listings l JOIN users u ON l.host_id = u.id WHERE u.clerk_id LIKE 'seed_president_%') AS pres_listings,
      (SELECT count(*) FROM listing_photos lp JOIN listings l ON lp.listing_id = l.id JOIN users u ON l.host_id = u.id WHERE u.clerk_id LIKE 'seed_president_%') AS pres_listing_photos,
      (SELECT count(*) FROM vouches v
        JOIN users a ON v.voucher_id = a.id
        JOIN users b ON v.vouchee_id = b.id
        WHERE a.clerk_id LIKE 'seed_president_%' OR b.clerk_id LIKE 'seed_president_%') AS pres_vouches;
  `;
  const r2 = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: verifySql }),
    }
  );
  console.log(`\nverify status: ${r2.status}`);
  console.log(await r2.text());
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

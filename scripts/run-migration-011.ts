/**
 * Apply migration 011_wishlists_profiles_support.sql to the linked
 * Supabase project.
 *
 *   npx tsx --env-file=.env.local scripts/run-migration-011.ts
 *
 * Preferred path: Supabase Management API (POST /v1/projects/{ref}/database/query),
 * which requires SUPABASE_ACCESS_TOKEN (a personal access token, "sbp_...").
 * Falls back to a prior exec_sql RPC if no token is set, and finally
 * prints the SQL for manual execution.
 *
 * Idempotent: all DDL uses IF NOT EXISTS / DO $$ guards.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MANAGEMENT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/011_wishlists_profiles_support.sql"
  ),
  "utf8"
);

// Derive the project ref from the Supabase URL: https://<ref>.supabase.co
function projectRef() {
  const m = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/);
  return m ? m[1] : null;
}

async function tryManagementApi() {
  if (!MANAGEMENT_TOKEN) return false;
  const ref = projectRef();
  if (!ref) return false;

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MANAGEMENT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Management API failed: ${res.status} ${text}`);
  }
  console.log("✓ Applied 011 via Supabase Management API");
  return true;
}

async function tryRpc() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });
  if (res.status === 404) return false;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`exec_sql failed: ${res.status} ${text}`);
  }
  console.log("✓ Applied 011 via exec_sql RPC");
  return true;
}

async function main() {
  if (await tryManagementApi()) return;
  if (await tryRpc()) return;

  console.error(
    "No automation path available. Run the migration manually in the Supabase SQL editor:\n  https://supabase.com/dashboard/project/_/sql/new"
  );
  console.error(
    "\n--- supabase/migrations/011_wishlists_profiles_support.sql ---\n"
  );
  console.error(sql);
  process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

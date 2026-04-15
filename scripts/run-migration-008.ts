/**
 * Apply migration 008_trips_notifications.sql to the linked Supabase project.
 *
 *   npx tsx --env-file=.env.local scripts/run-migration-008.ts
 *
 * Uses Supabase's PostgREST + a `query` RPC if present, otherwise falls back
 * to running each statement via the management API. Idempotent thanks to
 * "DO $$ BEGIN ... EXCEPTION WHEN duplicate_column" guards in the SQL itself.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/008_trips_notifications.sql"),
  "utf8"
);

async function tryRpc() {
  // Many Supabase projects expose an `exec_sql` helper. We try it; if the
  // function doesn't exist Supabase returns 404 and we bail out.
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
  console.log("✓ Applied via exec_sql RPC");
  return true;
}

async function main() {
  if (await tryRpc()) return;

  console.error(
    "No exec_sql RPC available. Run the migration manually in the Supabase SQL editor:\n  https://supabase.com/dashboard/project/_/sql/new"
  );
  console.error("\n--- supabase/migrations/008_trips_notifications.sql ---\n");
  console.error(sql);
  process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

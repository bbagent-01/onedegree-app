/**
 * Generic migration runner. Usage:
 *
 *   npx tsx --env-file=.env.local scripts/run-migration.ts <file-number>
 *
 * Example:
 *   npx tsx --env-file=.env.local scripts/run-migration.ts 012
 *
 * Resolves supabase/migrations/<number>_*.sql, applies it via the
 * Supabase Management API (requires SUPABASE_ACCESS_TOKEN in
 * .env.local), and logs success. Migrations should be idempotent.
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const MANAGEMENT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}
if (!MANAGEMENT_TOKEN) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens and add it to .env.local."
  );
  process.exit(1);
}

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: npx tsx scripts/run-migration.ts <number>");
  process.exit(1);
}

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const match = readdirSync(migrationsDir).find((f) =>
  f.startsWith(`${arg}_`)
);
if (!match) {
  console.error(`No migration file matching ${arg}_*.sql`);
  process.exit(1);
}

const sql = readFileSync(resolve(migrationsDir, match), "utf8");

const ref = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!ref) {
  console.error("Couldn't parse project ref from NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

async function main() {
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
    console.error(`Management API failed: ${res.status}\n${text}`);
    process.exit(1);
  }

  console.log(`✓ Applied ${match}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

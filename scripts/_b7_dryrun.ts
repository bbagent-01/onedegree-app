/**
 * Dry-run migration 050 against the live Supabase project via the
 * Management API. Wraps in BEGIN/ROLLBACK so nothing persists.
 *
 * Detects SQL errors (syntax, FK violations, type mismatches) before
 * Loren applies the migration for real.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!TOKEN || !SUPABASE_URL) {
  console.error("missing SUPABASE_ACCESS_TOKEN or NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const PROJECT_REF = SUPABASE_URL
  .replace(/^https:\/\//, "")
  .split(".")[0];
console.log(`Project ref: ${PROJECT_REF}`);

const sql = readFileSync(
  join(process.cwd(), "supabase", "migrations", "050_demo_presidents.sql"),
  "utf8"
);

// The migration already wraps in BEGIN/COMMIT. Replace COMMIT with ROLLBACK
// so nothing persists. Note: any RAISE NOTICE will still print row counts.
const dryRunSql = sql.replace(/\nCOMMIT;\s*$/, "\nROLLBACK;\n");

async function run() {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: dryRunSql }),
    }
  );

  const text = await r.text();
  console.log(`status: ${r.status}`);
  console.log(text);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

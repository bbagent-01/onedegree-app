/**
 * Ad-hoc SQL runner for S7 inspections and data wipes.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/run-sql.ts <file-path-or-inline-sql>
 *
 * Prints the query result rows as JSON. Uses the Supabase Management
 * API (same endpoint as scripts/run-migration.ts).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const MANAGEMENT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL || !MANAGEMENT_TOKEN) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const ref = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!ref) {
  console.error("Couldn't parse project ref from NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: npx tsx scripts/run-sql.ts <file or inline SQL>");
  process.exit(1);
}

let sql = arg;
const asPath = resolve(process.cwd(), "scripts", arg);
if (existsSync(asPath)) {
  sql = readFileSync(asPath, "utf8");
} else if (existsSync(arg)) {
  sql = readFileSync(arg, "utf8");
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

  const body = await res.text();
  if (!res.ok) {
    console.error(`API ${res.status}: ${body}`);
    process.exit(1);
  }
  try {
    const json = JSON.parse(body);
    console.log(JSON.stringify(json, null, 2));
  } catch {
    console.log(body);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

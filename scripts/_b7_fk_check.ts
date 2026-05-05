/**
 * One-shot: list every FK that references users(id) and its ON DELETE rule.
 * Tells us which tables CASCADE clean up vs. which would BLOCK a user delete.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(url, key);

async function main() {
  const { data, error } = await sb.rpc("exec_sql_readonly", {
    sql: "SELECT 1",
  });
  // Probably the RPC doesn't exist — fall back to raw HTTP querying via PostgREST
  // by reading information_schema directly.
  const q = `
    SELECT
      tc.table_name AS child_table,
      kcu.column_name AS child_col,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'users'
      AND ccu.column_name = 'id'
    ORDER BY rc.delete_rule, tc.table_name;
  `;

  // Use direct fetch against the SQL endpoint exposed by Supabase
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: q }),
  });

  if (!res.ok) {
    // Fallback: read schema.sql + migrations and grep for REFERENCES users
    console.log(`exec_sql RPC unavailable (${res.status}). Use grep fallback.`);
    return;
  }
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Quick verification that migration 045 landed: lists the new columns,
 * the access_settings DEFAULT, and a row count.
 *
 * Usage: npx tsx --env-file=.env.local scripts/check-045.ts
 */
export {};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;
const REF = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)![1];

async function q(sql: string) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function main() {
  const want = [
    "place_kind",
    "property_label",
    "max_guests",
    "bedrooms",
    "beds",
    "bathrooms",
    "street",
    "city",
    "state",
    "postal_code",
    "lat",
    "lng",
    "weekly_discount_pct",
    "monthly_discount_pct",
    "extended_overview",
    "guest_access_text",
    "interaction_text",
    "other_details_text",
    "tags",
    "stay_style",
    "service_discounts",
    "checkin_instructions",
    "checkout_instructions",
    "house_manual",
    "pets_allowed",
    "children_allowed",
    "pets_on_property",
    "accessibility_features",
    "no_smoking",
    "no_parties",
    "quiet_hours",
    "preview_settings",
  ];
  const cols = (await q(
    `select column_name, data_type, is_nullable, column_default
     from information_schema.columns
     where table_name='listings' and column_name in (${want
       .map((c) => `'${c}'`)
       .join(",")})
     order by column_name`
  )) as Array<Record<string, unknown>>;
  console.log(`new columns present: ${cols.length}/${want.length}`);
  for (const c of cols) {
    console.log(
      `  ${c.column_name} ${c.data_type}${
        c.is_nullable === "NO" ? " NOT NULL" : ""
      }${c.column_default ? " DEFAULT " + c.column_default : ""}`
    );
  }
  const missing = want.filter((c) => !cols.some((r) => r.column_name === c));
  if (missing.length) console.log(`MISSING: ${missing.join(", ")}`);

  const def = await q(
    `select column_default from information_schema.columns
     where table_name='listings' and column_name='access_settings'`
  );
  console.log("\naccess_settings DEFAULT:");
  console.log((def as Array<{ column_default: string }>)[0].column_default);

  const constraints = await q(
    `select conname from pg_constraint where conrelid='listings'::regclass and contype='c' order by conname`
  );
  console.log("\nCHECK constraints:");
  for (const r of constraints as Array<{ conname: string }>)
    console.log(`  ${r.conname}`);

  const idx = await q(
    `select indexname from pg_indexes where tablename='listings' order by indexname`
  );
  console.log("\nIndexes:");
  for (const r of idx as Array<{ indexname: string }>)
    console.log(`  ${r.indexname}`);

  const count = await q(`select count(*)::int as n from listings`);
  console.log(
    `\nlistings row count: ${(count as Array<{ n: number }>)[0].n}`
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

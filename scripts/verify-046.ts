/**
 * One-off check for mig 046 + Trust v2 recompute.
 * 1. Schema: confirms all 6 columns with types.
 * 2. Data: top users by vouch_score, plus null/non-null counts.
 */

export {};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;
const ref = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];

async function q(sql: string) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  return JSON.parse(await res.text());
}

async function main() {
  console.log("\n── 1. Column types ──");
  const cols = [
    "vouch_signal",
    "vouch_score",
    "vouch_power",
    "rating_avg",
    "rating_count",
    "last_score_computed_at",
  ];
  const types = await q(`
    SELECT column_name, data_type, numeric_precision, numeric_scale, column_default
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name IN (${cols.map((c) => `'${c}'`).join(",")})
    ORDER BY column_name;
  `);
  console.table(types);

  console.log("\n── 2. Aggregate counts (51 users expected) ──");
  const stats = await q(`
    SELECT
      COUNT(*)                                                  AS total_users,
      COUNT(vouch_signal)                                       AS has_signal,
      COUNT(vouch_score)                                        AS has_score,
      COUNT(vouch_power)                                        AS has_power,
      COUNT(rating_avg)                                         AS has_rating,
      COUNT(last_score_computed_at)                             AS has_lastrun,
      MIN(vouch_score)::TEXT || ' .. ' || MAX(vouch_score)::TEXT AS score_range,
      MIN(vouch_signal)::TEXT || ' .. ' || MAX(vouch_signal)::TEXT AS signal_range,
      MIN(vouch_power)::TEXT  || ' .. ' || MAX(vouch_power)::TEXT  AS power_range,
      MIN(rating_count)::TEXT || ' .. ' || MAX(rating_count)::TEXT AS rcount_range
    FROM users;
  `);
  console.table(stats);

  console.log("\n── 3. Top 8 by vouch_score ──");
  const top = await q(`
    SELECT
      LEFT(name, 20) AS name,
      vouch_score,
      vouch_signal,
      vouch_power,
      rating_avg,
      rating_count,
      (SELECT COUNT(*) FROM vouches v WHERE v.vouchee_id = u.id) AS inbound_vouches
    FROM users u
    ORDER BY vouch_score DESC NULLS LAST
    LIMIT 8;
  `);
  console.table(top);

  console.log("\n── 4. Bottom 5 by vouch_score (excluding 0) ──");
  const bottom = await q(`
    SELECT
      LEFT(name, 20) AS name,
      vouch_score,
      vouch_signal,
      (SELECT COUNT(*) FROM vouches v WHERE v.vouchee_id = u.id) AS inbound_vouches
    FROM users u
    WHERE vouch_score > 0
    ORDER BY vouch_score ASC
    LIMIT 5;
  `);
  console.table(bottom);

  console.log("\n── 5. Users with zero vouch_score ──");
  const zero = await q(`
    SELECT
      COUNT(*) AS users_at_zero,
      AVG(inbound) AS avg_inbound_for_zero
    FROM (
      SELECT
        u.id,
        (SELECT COUNT(*) FROM vouches v WHERE v.vouchee_id = u.id) AS inbound
      FROM users u
      WHERE vouch_score = 0
    ) sub;
  `);
  console.table(zero);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Populate avatar_url for every user with pravatar.cc photos keyed
 * by user UUID so the UI stops rendering initials-only bubbles. By
 * default this script runs in "missing-only" mode (skips any user
 * already carrying an avatar_url) so it's safe to re-run.
 *
 * Usage:
 *   # fill in only users without an avatar:
 *   npx tsx --env-file=.env.local scripts/seed-avatars.ts
 *
 *   # overwrite every user's avatar_url with a pravatar photo
 *   # (helpful when existing URLs point at broken Clerk images etc):
 *   npx tsx --env-file=.env.local scripts/seed-avatars.ts --force
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FORCE = process.argv.includes("--force");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function avatarFor(userId: string): string {
  return `https://i.pravatar.cc/300?u=${encodeURIComponent(userId)}`;
}

async function main() {
  const query = supabase.from("users").select("id, name, avatar_url");
  const { data: rows, error } = await query;

  if (error) {
    console.error("Fetch failed:", error.message);
    process.exit(1);
  }

  const users = (rows ?? []) as Array<{
    id: string;
    name: string;
    avatar_url: string | null;
  }>;

  const targets = FORCE
    ? users
    : users.filter(
        (u) => !u.avatar_url || u.avatar_url.trim().length === 0
      );

  if (targets.length === 0) {
    console.log("All users already have avatar_url set. Nothing to do.");
    console.log("(Pass --force to overwrite anyway.)");
    return;
  }

  console.log(
    `${FORCE ? "Overwriting" : "Assigning"} avatars for ${targets.length}/${users.length} users…`
  );

  let updated = 0;
  for (const u of targets) {
    const url = avatarFor(u.id);
    const { error: upErr } = await supabase
      .from("users")
      .update({ avatar_url: url })
      .eq("id", u.id);
    if (upErr) {
      console.warn(`  ✗ ${u.name} (${u.id}): ${upErr.message}`);
      continue;
    }
    updated++;
    console.log(`  ✓ ${u.name} → ${url}`);
  }

  console.log(`\nDone. Updated ${updated}/${targets.length} users.`);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});

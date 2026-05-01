import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: real, count } = await sb
    .from("users")
    .select("id, clerk_id, name, email", { count: "exact" })
    .eq("is_test_user", false);
  console.log(`is_test_user=false count: ${count}`);
  for (const u of real ?? []) console.log(JSON.stringify(u));
}
main();

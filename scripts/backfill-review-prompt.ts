/**
 * Replace legacy plain-text "stay wrapped up" review prompts with
 * the __type:review_prompt__ structured message so they render as
 * inline ReviewPromptCard blocks in the thread. Idempotent: skips
 * threads that already have a structured prompt.
 */
import { createClient } from "@supabase/supabase-js";

const REVIEW_PROMPT_PREFIX = "__type:review_prompt__";

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Plain-text copy the old cron posted. We scan messages for the
  // "stay just wrapped up" suffix since it uniquely identifies the
  // legacy prompt regardless of guest first name.
  const { data: legacy } = await sb
    .from("messages")
    .select("id, thread_id, content")
    .eq("is_system", true)
    .like("content", "%stay just wrapped up%");

  let migrated = 0;
  for (const m of legacy || []) {
    // Skip if the thread already has a structured prompt.
    const { data: already } = await sb
      .from("messages")
      .select("id")
      .eq("thread_id", m.thread_id)
      .eq("content", REVIEW_PROMPT_PREFIX)
      .maybeSingle();
    if (already) {
      console.log(`skip (already structured): thread=${m.thread_id}`);
      continue;
    }
    const { error } = await sb
      .from("messages")
      .update({ content: REVIEW_PROMPT_PREFIX })
      .eq("id", m.id);
    if (error) {
      console.error("update failed:", m.id, error.message);
      continue;
    }
    migrated += 1;
    console.log(`migrated: thread=${m.thread_id}`);
  }
  console.log(`\ndone — ${migrated} migrated`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

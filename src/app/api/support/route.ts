export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

const CATEGORIES = ["bug", "question", "feedback", "other"] as const;
type Category = (typeof CATEGORIES)[number];

interface SupportBody {
  name?: string;
  email?: string;
  category?: string;
  message?: string;
}

export async function POST(req: Request) {
  let body: SupportBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = (body.name || "").trim().slice(0, 120);
  const email = (body.email || "").trim().slice(0, 200);
  const category = (body.category || "").trim().toLowerCase() as Category;
  const message = (body.message || "").trim();

  if (!message || message.length < 5) {
    return Response.json(
      { error: "Message must be at least 5 characters" },
      { status: 400 }
    );
  }
  if (message.length > 4000) {
    return Response.json({ error: "Message too long" }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  const { userId: clerkId } = await effectiveAuth();
  const supabase = getSupabaseAdmin();

  let userRowId: string | null = null;
  if (clerkId) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .maybeSingle();
    userRowId = (data?.id as string) ?? null;
  }

  const { error } = await supabase.from("support_requests").insert({
    user_id: userRowId,
    name: name || null,
    email: email || null,
    category,
    message,
    status: "open",
  });

  if (error) {
    return Response.json({ error: "Failed to submit" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

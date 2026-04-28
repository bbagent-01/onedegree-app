export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

interface CreateBody {
  kind?: "trip_wish" | "host_offer" | "either";
  destinations?: string[];
  start_window?: string | null;
  end_window?: string | null;
  delivery?: "email" | "sms" | "both";
  status?: "active" | "paused";
}

export async function GET() {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!viewer) return Response.json({ error: "User not found" }, { status: 404 });

  const { data } = await supabase
    .from("proposal_alerts")
    .select("*")
    .eq("subscriber_id", viewer.id)
    .order("created_at", { ascending: false });

  return Response.json({ alerts: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!viewer) return Response.json({ error: "User not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as CreateBody | null;
  if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });

  const err = validate(body);
  if (err) return Response.json({ error: err }, { status: 400 });

  const destinations = (body.destinations ?? [])
    .map((d) => d.trim())
    .filter((d) => d.length > 0)
    .slice(0, 20);

  const { data, error } = await supabase
    .from("proposal_alerts")
    .insert({
      subscriber_id: viewer.id,
      kind: body.kind ?? "either",
      destinations,
      start_window: body.start_window || null,
      end_window: body.end_window || null,
      delivery: body.delivery ?? "email",
      status: body.status ?? "active",
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[alerts] insert error", error);
    return Response.json({ error: "Couldn't create alert" }, { status: 500 });
  }
  return Response.json({ id: data.id });
}

function validate(body: CreateBody): string | null {
  if (
    body.kind &&
    body.kind !== "trip_wish" &&
    body.kind !== "host_offer" &&
    body.kind !== "either"
  ) {
    return "kind must be 'trip_wish', 'host_offer', or 'either'";
  }
  if (body.delivery && !["email", "sms", "both"].includes(body.delivery)) {
    return "delivery must be 'email', 'sms', or 'both'";
  }
  if (body.status && !["active", "paused"].includes(body.status)) {
    return "status must be 'active' or 'paused'";
  }
  if (
    body.start_window &&
    body.end_window &&
    body.start_window > body.end_window
  ) {
    return "start_window must be on or before end_window";
  }
  return null;
}

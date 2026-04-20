export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * GET /api/invites/check?phone=…&email=…
 *
 * Pre-invite lookup. Tells the client whether the supplied contact
 * info already belongs to a 1° B&B member, so the /invite UI can
 * redirect the flow to "vouch for them directly" instead of creating
 * a no-op invite.
 *
 * Returns one of:
 *   { existing: false }
 *   { existing: true, self: true }                      // their own row
 *   { existing: true, user: { id, name, avatar_url } }  // someone else
 */
export async function GET(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const rawPhone = url.searchParams.get("phone")?.trim() || null;
  const rawEmail = url.searchParams.get("email")?.trim().toLowerCase() || null;

  if (!rawPhone && !rawEmail) {
    return Response.json({ existing: false });
  }

  // Normalize phone to E.164 the same way the invite POST does.
  let phoneE164: string | null = null;
  if (rawPhone) {
    const parsed = parsePhoneNumberFromString(rawPhone, "US");
    if (parsed?.isValid()) {
      phoneE164 = parsed.format("E.164");
    }
  }

  if (!phoneE164 && !rawEmail) {
    return Response.json({ existing: false });
  }

  const supabase = getSupabaseAdmin();

  // Identify caller so we can flag "self" matches.
  const { data: me } = await supabase
    .from("users")
    .select("id, phone_number, email")
    .eq("clerk_id", userId)
    .maybeSingle();

  // Build an OR filter across whichever columns were supplied.
  const orParts: string[] = [];
  if (phoneE164) orParts.push(`phone_number.eq.${phoneE164}`);
  if (rawEmail) orParts.push(`email.eq.${rawEmail}`);
  if (orParts.length === 0) return Response.json({ existing: false });

  const { data: match } = await supabase
    .from("users")
    .select("id, name, avatar_url, phone_number, email")
    .or(orParts.join(","))
    .maybeSingle();

  if (!match) {
    return Response.json({ existing: false });
  }

  const isSelf = me?.id && match.id === me.id;
  if (isSelf) {
    return Response.json({ existing: true, self: true });
  }

  return Response.json({
    existing: true,
    self: false,
    user: {
      id: match.id,
      name: match.name,
      avatar_url: match.avatar_url ?? null,
    },
  });
}

/**
 * Structured-message prefix constants and helpers.
 *
 * The conversation thread renders rich inline cards for major
 * reservation milestones (terms offered, terms accepted, payment
 * due/claimed/confirmed). Each card corresponds to a
 * system-posted row in `messages` whose `content` starts with a
 * prefix like `__type:terms_offered__` — the thread view detects
 * the prefix and swaps in the card component.
 *
 * Keeping the prefixes + helpers in this server-safe module (NOT
 * co-located with the React card components) is load-bearing:
 * edge routes and cron handlers import these constants to post
 * messages; if they were re-exported from a "use client" file,
 * bundling could strip them to undefined and a PATCH handler
 * would silently insert `content: undefined`, violating the
 * NOT NULL constraint.
 */

export const TERMS_OFFERED_PREFIX = "__type:terms_offered__";
export const TERMS_ACCEPTED_PREFIX = "__type:terms_accepted__";
/** Posted when the stay ends — the thread card prompts both sides
 *  to leave a review. One prefix, two viewers; the renderer branches
 *  on role. */
export const REVIEW_PROMPT_PREFIX = "__type:review_prompt__";

/** Payment prefixes embed the event id so the renderer can find
 *  the corresponding payment_events row without scanning the
 *  whole list. Format: `__type:payment_due:<uuid>__` */
export const PAYMENT_DUE_PREFIX = "__type:payment_due:";
export const PAYMENT_CLAIMED_PREFIX = "__type:payment_claimed:";
export const PAYMENT_CONFIRMED_PREFIX = "__type:payment_confirmed:";

/** Intro lifecycle prefixes.
 *
 *  Posted to the sender↔recipient thread when the sender submits an
 *  intro request. The recipient's thread view swaps this for the
 *  IntroRequestCard (accept / reply / decline / ignore). The sender
 *  sees a read-only pending state. */
export const INTRO_REQUEST_PREFIX = "__type:intro_request__";
/** Posted when the recipient accepts. Both sides see a confirmation
 *  with "you can both now see each other's full listings." */
export const INTRO_ACCEPTED_PREFIX = "__type:intro_accepted__";
/** Posted when the recipient declines. Sender sees a soft "not
 *  available right now" copy — no shaming, no reason exposed. */
export const INTRO_DECLINED_PREFIX = "__type:intro_declined__";
/** Posted when the recipient revokes a previously accepted intro.
 *  Sender sees "Access ended" and preview listings flip back. */
export const INTRO_REVOKED_PREFIX = "__type:intro_revoked__";

const PAYMENT_SUFFIX = "__";

/** Build a payment structured-message prefix for a given event. */
export function paymentDueMessage(eventId: string): string {
  return `${PAYMENT_DUE_PREFIX}${eventId}${PAYMENT_SUFFIX}`;
}
export function paymentClaimedMessage(eventId: string): string {
  return `${PAYMENT_CLAIMED_PREFIX}${eventId}${PAYMENT_SUFFIX}`;
}
export function paymentConfirmedMessage(eventId: string): string {
  return `${PAYMENT_CONFIRMED_PREFIX}${eventId}${PAYMENT_SUFFIX}`;
}

/**
 * Pull the event id out of a payment_* structured message. Returns
 * null if the content isn't a payment message or the suffix is
 * malformed.
 */
export function parsePaymentEventId(content: string): {
  kind: "due" | "claimed" | "confirmed";
  eventId: string;
} | null {
  for (const [prefix, kind] of [
    [PAYMENT_DUE_PREFIX, "due"],
    [PAYMENT_CLAIMED_PREFIX, "claimed"],
    [PAYMENT_CONFIRMED_PREFIX, "confirmed"],
  ] as const) {
    if (content.startsWith(prefix)) {
      const rest = content.slice(prefix.length);
      const end = rest.indexOf(PAYMENT_SUFFIX);
      if (end <= 0) return null;
      return { kind, eventId: rest.slice(0, end) };
    }
  }
  return null;
}

export function isStructuredMessage(content: string): boolean {
  return (
    content.startsWith(TERMS_OFFERED_PREFIX) ||
    content.startsWith(TERMS_ACCEPTED_PREFIX) ||
    content.startsWith(REVIEW_PROMPT_PREFIX) ||
    content.startsWith(PAYMENT_DUE_PREFIX) ||
    content.startsWith(PAYMENT_CLAIMED_PREFIX) ||
    content.startsWith(PAYMENT_CONFIRMED_PREFIX) ||
    content.startsWith(INTRO_REQUEST_PREFIX) ||
    content.startsWith(INTRO_ACCEPTED_PREFIX) ||
    content.startsWith(INTRO_DECLINED_PREFIX) ||
    content.startsWith(INTRO_REVOKED_PREFIX)
  );
}

/**
 * Friendly label for a structured message — used anywhere the raw
 * content would leak (inbox list preview, thread-view fallback,
 * any legacy surface that sees the text). The DB trigger on
 * `messages` writes the raw content into
 * message_threads.last_message_preview, so without this translator
 * users see "__type:terms_offered__" in their inbox.
 */
export function structuredMessageLabel(content: string): string | null {
  if (content.startsWith(TERMS_OFFERED_PREFIX)) return "Terms sent";
  if (content.startsWith(TERMS_ACCEPTED_PREFIX)) return "Terms accepted";
  if (content.startsWith(REVIEW_PROMPT_PREFIX)) return "Leave a review";
  if (content.startsWith(PAYMENT_DUE_PREFIX)) return "Payment due";
  if (content.startsWith(PAYMENT_CLAIMED_PREFIX)) return "Payment sent";
  if (content.startsWith(PAYMENT_CONFIRMED_PREFIX)) return "Payment confirmed";
  if (content.startsWith(INTRO_REQUEST_PREFIX)) return "Intro request";
  if (content.startsWith(INTRO_ACCEPTED_PREFIX)) return "Intro accepted";
  if (content.startsWith(INTRO_DECLINED_PREFIX)) return "Intro declined";
  if (content.startsWith(INTRO_REVOKED_PREFIX)) return "Access ended";
  return null;
}

/**
 * Render-ready preview — use anywhere you'd show a raw message
 * content but want the friendly version for structured prefixes.
 */
export function friendlyMessagePreview(
  content: string | null | undefined
): string {
  if (!content) return "";
  return structuredMessageLabel(content) ?? content;
}

/**
 * Host payment methods (Booking-flow v2 Chunk 3).
 *
 * Hosts declare *where* guests send them money off-platform. The
 * platform never touches funds — this is the list of handles a guest
 * can copy after a request is approved. The cancellation policy
 * module decides *when* money is due; this module decides *where*
 * it goes.
 *
 * Only receive-only identifiers — no bank routing numbers, no card
 * details. Each method has:
 *
 *   type     — which rail (venmo / zelle / paypal / wise /
 *              offline_other)
 *   handle   — username, email, phone, etc. depending on type
 *   note     — optional; required for offline_other (free text)
 *   enabled  — host can toggle a method off without losing the
 *              handle, useful when someone pauses a rail briefly.
 */

export type PaymentMethodType =
  | "venmo"
  | "zelle"
  | "paypal"
  | "wise"
  | "offline_other";

export interface PaymentMethod {
  type: PaymentMethodType;
  handle: string;
  note: string | null;
  enabled: boolean;
}

export interface PaymentMethodMeta {
  key: PaymentMethodType;
  label: string;
  /** Placeholder shown in the handle input. */
  handlePlaceholder: string;
  /** Short helper shown under the row. */
  helper: string;
  /**
   * Prefix used when displaying the handle ("@name" for Venmo,
   * untouched for PayPal email, etc.). Applied at render time — the
   * stored handle is always whatever the host typed.
   */
  displayPrefix: string;
}

export const PAYMENT_METHOD_META: PaymentMethodMeta[] = [
  {
    key: "venmo",
    label: "Venmo",
    handlePlaceholder: "@your-handle",
    helper: "Your Venmo username. Guests tap this to pay you directly.",
    displayPrefix: "@",
  },
  {
    key: "zelle",
    label: "Zelle",
    handlePlaceholder: "email or phone tied to Zelle",
    helper: "Email or phone number where Zelle routes the funds.",
    displayPrefix: "",
  },
  {
    key: "paypal",
    label: "PayPal",
    handlePlaceholder: "paypal.me/yourname or email",
    helper: "PayPal.me link or the email connected to your PayPal.",
    displayPrefix: "",
  },
  {
    key: "wise",
    label: "Wise",
    handlePlaceholder: "email or @wisetag",
    helper: "Use your Wise email or wisetag — ideal for international guests.",
    displayPrefix: "",
  },
  {
    key: "offline_other",
    label: "Offline / other",
    handlePlaceholder: "e.g. bank transfer on arrival",
    helper:
      "Anything not on the list above. Put instructions in the note so guests know what to do.",
    displayPrefix: "",
  },
];

export function paymentMethodLabel(type: PaymentMethodType): string {
  return PAYMENT_METHOD_META.find((m) => m.key === type)?.label ?? type;
}

export function paymentMethodMeta(type: PaymentMethodType): PaymentMethodMeta {
  return (
    PAYMENT_METHOD_META.find((m) => m.key === type) ?? PAYMENT_METHOD_META[0]
  );
}

/** Render a stored handle with its prefix ("@foo" for Venmo, etc.). */
export function displayHandle(method: PaymentMethod): string {
  if (!method.handle) return "";
  const meta = paymentMethodMeta(method.type);
  const h = method.handle.trim();
  if (!meta.displayPrefix) return h;
  return h.startsWith(meta.displayPrefix) ? h : `${meta.displayPrefix}${h}`;
}

// ── Parsing / validation ────────────────────────────────────

const VALID_TYPES: readonly PaymentMethodType[] = [
  "venmo",
  "zelle",
  "paypal",
  "wise",
  "offline_other",
];

function parseSingle(raw: unknown): PaymentMethod | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const type = o.type;
  if (typeof type !== "string" || !VALID_TYPES.includes(type as PaymentMethodType)) {
    return null;
  }
  const handle = typeof o.handle === "string" ? o.handle.trim() : "";
  // A method with no handle (and no note, for offline_other) is
  // noise — drop it so downstream code never has to check.
  const note =
    typeof o.note === "string" && o.note.trim().length > 0
      ? o.note.trim()
      : null;
  if (!handle && !(type === "offline_other" && note)) return null;
  const enabled = o.enabled === undefined ? true : Boolean(o.enabled);
  return { type: type as PaymentMethodType, handle, note, enabled };
}

/** Parse a raw JSONB array into a normalized PaymentMethod[]. */
export function parsePaymentMethods(raw: unknown): PaymentMethod[] {
  if (!Array.isArray(raw)) return [];
  const out: PaymentMethod[] = [];
  for (const item of raw) {
    const parsed = parseSingle(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

/** Enabled methods only, preserving order. */
export function enabledMethods(methods: PaymentMethod[]): PaymentMethod[] {
  return methods.filter((m) => m.enabled);
}

/** True if the host has at least one usable method. */
export function hasAnyPaymentMethod(methods: PaymentMethod[]): boolean {
  return enabledMethods(methods).length > 0;
}

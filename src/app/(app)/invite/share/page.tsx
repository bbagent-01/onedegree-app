"use client";

// Required by next-on-pages: ImpersonationMount in the (app) layout
// pulls in /nextjs/server, propagating edge requirement to descendants.
export const runtime = "edge";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  VOUCH_TYPES,
  YEARS_KNOWN_BUCKETS,
  type VouchType,
  type YearsKnownBucket,
} from "@/lib/vouch-constants";
import {
  Send,
  Shield,
  Star,
  Check,
  ChevronRight,
  Copy,
  Share2,
  AlertCircle,
  ArrowLeft,
  Phone,
  Link as LinkIcon,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const BIG_INPUT =
  "h-14 rounded-xl border-2 border-border !bg-white px-4 text-base font-medium shadow-sm focus-visible:border-brand";

type Mode = "phone" | "open_individual" | "open_group";
type Step = "mode" | "type" | "years" | "details" | "share";

interface CreatedVouch {
  id: string;
  token: string;
  mode: Mode;
  share_url: string;
  prefilled_sms_text: string;
  /** Only present for mode='phone'; absent for open modes. */
  recipient_phone?: string;
  /** True when Trustead's Twilio number successfully sent the auto-SMS
   *  for Mode A. Always false for Mode B/C (no recipient phone). */
  sms_sent?: boolean;
  /** Reason auto-send didn't fire (twilio_not_configured / opted_out /
   *  send_failed / Twilio error message). Drives the share-sheet
   *  fallback notice on the success card. */
  sms_error?: string | null;
}

type ExistingCheck =
  | { kind: "none" }
  | { kind: "self" }
  | {
      kind: "existing";
      user: { id: string; name: string; avatar_url: string | null };
    };

const MAX_CLAIMS_OPTIONS = [5, 10, 20] as const;

export default function InviteSharePage() {
  return (
    <Suspense fallback={null}>
      <InviteShareContent />
    </Suspense>
  );
}

function InviteShareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Optional prefill from /vouch search empty-state ("Invite + pre-vouch a friend"
  // CTA can pass ?phone= when the search input was a phone-shaped query).
  const phonePrefill = searchParams?.get("phone") ?? "";

  // Step 0 starts with no mode selected — sender must explicitly pick.
  // The phone-prefill query param still works because the Mode A
  // details step reads it via state, but we don't pre-select Mode A
  // for them based on it.
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<Mode | null>(null);

  const [vouchType, setVouchType] = useState<VouchType | null>(null);
  const [yearsKnown, setYearsKnown] = useState<YearsKnownBucket | null>(null);
  const [stakeAcknowledged, setStakeAcknowledged] = useState(false);

  // Mode A + B fields
  const [recipientName, setRecipientName] = useState("");
  // Mode A only
  const [recipientPhone, setRecipientPhone] = useState(phonePrefill);
  // Mode C fields
  const [groupLabel, setGroupLabel] = useState("");
  const [maxClaims, setMaxClaims] = useState<number>(20);

  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedVouch | null>(null);
  const [existing, setExisting] = useState<ExistingCheck>({ kind: "none" });
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (phonePrefill && !recipientPhone) setRecipientPhone(phonePrefill);
    // Run once on mount; ignore subsequent param changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsedPhone = recipientPhone.trim()
    ? parsePhoneNumberFromString(recipientPhone.trim(), "US")
    : null;
  const phoneValid = parsedPhone?.isPossible() ?? false;
  const phoneE164 = parsedPhone?.format("E.164") ?? "";

  const nameOK =
    recipientName.trim().length >= 2 && recipientName.trim().length <= 80;
  const groupLabelOK =
    groupLabel.trim().length >= 2 && groupLabel.trim().length <= 80;

  const canProceedDetails =
    mode === null
      ? false
      : mode === "phone"
        ? nameOK && phoneValid
        : mode === "open_individual"
          ? nameOK
          : groupLabelOK && MAX_CLAIMS_OPTIONS.includes(maxClaims as 5 | 10 | 20);

  const handleSubmit = useCallback(
    async (skipAutoSend = false) => {
    if (!vouchType || !yearsKnown || !canProceedDetails) return;
    setSubmitting(true);
    setExisting({ kind: "none" });
    try {
      const payload: Record<string, unknown> = {
        mode,
        vouchType,
        yearsKnownBucket: yearsKnown,
        ratingStake: stakeAcknowledged,
        // Mode A only — set true when sender picks "Send it myself"
        // so the server creates the row without firing Twilio. The
        // pending row still has the recipient phone, so the webhook's
        // phone-match auto-claim still works on signup.
        skipAutoSend,
      };
      if (mode === "phone") {
        payload.recipientName = recipientName.trim();
        payload.recipientPhone = phoneE164;
      } else if (mode === "open_individual") {
        payload.recipientName = recipientName.trim();
      } else if (mode === "open_group") {
        payload.groupLabel = groupLabel.trim();
        payload.maxClaims = maxClaims;
      }

      const res = await fetch("/api/pending-vouches/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 409) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
          self?: boolean;
          user?: { id: string; name: string; avatar_url: string | null };
        };
        if (err.self) {
          setExisting({ kind: "self" });
        } else if (err.user) {
          setExisting({ kind: "existing", user: err.user });
        }
        toast.error(err.error ?? "This contact is already on Trustead.");
        return;
      }
      if (res.status === 429) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
          cap_reached?: boolean;
        };
        toast.error(
          err.error ??
            "You're sending invites too fast. Wait a minute and try again."
        );
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create invite.");
      }
      const data = (await res.json()) as CreatedVouch;
      setCreated(data);
      setStep("share");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create invite.");
    } finally {
      setSubmitting(false);
    }
  }, [
    mode,
    vouchType,
    yearsKnown,
    recipientName,
    phoneE164,
    groupLabel,
    maxClaims,
    stakeAcknowledged,
    canProceedDetails,
  ]);

  // Step ordering for the indicator pills. Chooser is always step 0;
  // the rest are common across modes (the details step content varies
  // but the position is the same).
  const stepOrder: Step[] = ["mode", "type", "years", "details", "share"];

  return (
    <div className="mx-auto w-full max-w-[540px] px-4 py-8 md:px-6 md:py-12">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Send className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-serif text-2xl font-bold md:text-3xl">
          Invite + pre-vouch a friend
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Three ways to send the invite. Pick whichever fits how you know them.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2">
        {stepOrder.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 w-8 rounded-full transition-colors",
              step === s || i < stepOrder.indexOf(step)
                ? "bg-brand-300"
                : "bg-white/10"
            )}
          />
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white p-5 md:p-6">
        {step === "mode" && (
          <ModeChooser
            mode={mode}
            onPick={(m) => {
              setMode(m);
              setStep("type");
            }}
          />
        )}

        {step === "type" && (
          <div>
            <h2 className="text-base font-semibold">How do you know them?</h2>
            <div className="mt-4 space-y-3">
              {VOUCH_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setVouchType(t.value)}
                  className={cn(
                    "w-full rounded-xl border-2 p-4 text-left transition-all",
                    vouchType === t.value
                      ? "border-brand bg-brand/5 ring-1 ring-brand/20"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        t.value === "inner_circle"
                          ? "bg-amber-400/15 text-amber-200"
                          : "bg-sky-400/15 text-sky-200"
                      )}
                    >
                      {t.value === "inner_circle" ? (
                        <Star className="h-4 w-4" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{t.label}</div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    </div>
                    {vouchType === t.value && (
                      <Check className="h-4 w-4 shrink-0 text-brand" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <Button variant="ghost" size="lg" onClick={() => setStep("mode")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                size="lg"
                disabled={!vouchType}
                onClick={() => setStep("years")}
                className="gap-1"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "years" && (
          <div>
            <h2 className="text-base font-semibold">
              {mode === "open_group"
                ? "How long have you known them, on average?"
                : "How long have you known them?"}
            </h2>
            <div className="mt-4 space-y-2">
              {YEARS_KNOWN_BUCKETS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setYearsKnown(b.value)}
                  className={cn(
                    "w-full rounded-lg border px-4 py-3 text-left text-sm transition-all",
                    yearsKnown === b.value
                      ? "border-brand bg-brand/5 font-medium ring-1 ring-brand/20"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <label className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={stakeAcknowledged}
                onChange={(e) => setStakeAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-brand"
              />
              <span className="text-sm text-muted-foreground leading-relaxed">
                I understand their guest rating
                {mode === "open_group" ? "s" : ""} will affect my vouch power
                once they join.
              </span>
            </label>

            <div className="mt-5 flex items-center justify-between">
              <Button variant="ghost" size="lg" onClick={() => setStep("type")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                size="lg"
                disabled={!yearsKnown || !stakeAcknowledged}
                onClick={() => setStep("details")}
                className="gap-1"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "details" && mode === "phone" && (
          <div>
            <h2 className="text-base font-semibold">Who are you inviting?</h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="recipient-name">Their name</Label>
                <Input
                  id="recipient-name"
                  value={recipientName}
                  onChange={(e) => {
                    setRecipientName(e.target.value);
                    if (existing.kind !== "none") setExisting({ kind: "none" });
                  }}
                  placeholder="Their full name"
                  className={`mt-1.5 ${BIG_INPUT}`}
                  maxLength={80}
                />
              </div>
              <div>
                <Label htmlFor="recipient-phone">Their phone number</Label>
                <Input
                  id="recipient-phone"
                  value={recipientPhone}
                  onChange={(e) => {
                    setRecipientPhone(e.target.value);
                    if (existing.kind !== "none") setExisting({ kind: "none" });
                  }}
                  onBlur={() => {
                    if (recipientPhone.trim()) {
                      const p = parsePhoneNumberFromString(
                        recipientPhone.trim(),
                        "US"
                      );
                      if (p?.isPossible()) {
                        setRecipientPhone(p.formatNational());
                      }
                    }
                  }}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(555) 555-5555"
                  className={`mt-1.5 ${BIG_INPUT}`}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  We&apos;ll auto-vouch when they sign up with this number.{" "}
                  <span className="italic">
                    In beta, you&apos;ll be able to pick from your contacts.
                  </span>
                </p>
              </div>

              {existing.kind === "self" && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>That&apos;s your own number. You can&apos;t vouch for yourself.</p>
                </div>
              )}
              {existing.kind === "existing" && (
                <div className="flex items-start gap-3 rounded-lg border border-sky-400/30 bg-sky-400/10 p-3">
                  <Avatar className="h-8 w-8">
                    {existing.user.avatar_url && (
                      <AvatarImage
                        src={existing.user.avatar_url}
                        alt={existing.user.name}
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {existing.user.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-sm text-sky-100">
                    <p className="font-medium">
                      {existing.user.name} is already on Trustead.
                    </p>
                    <Link
                      href={`/profile/${existing.user.id}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold underline"
                    >
                      Vouch for them directly
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="ghost" size="lg" onClick={() => setStep("years")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {/* Secondary: skip Twilio, send the link from your own
                    phone via the existing share-sheet flow. The pending
                    row is still created with the recipient phone so the
                    webhook auto-claim path still applies on signup. */}
                <Button
                  variant="outline"
                  size="lg"
                  disabled={!canProceedDetails || submitting}
                  onClick={() => handleSubmit(true)}
                >
                  Send it myself
                </Button>
                {/* Primary: Trustead's Twilio number sends the SMS. */}
                <Button
                  size="lg"
                  disabled={!canProceedDetails || submitting}
                  onClick={() => handleSubmit(false)}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {submitting ? "Sending..." : "Send invite"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "details" && mode === "open_individual" && (
          <div>
            <h2 className="text-base font-semibold">Who are you inviting?</h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="recipient-name-only">Their name</Label>
                <Input
                  id="recipient-name-only"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Their full name"
                  className={`mt-1.5 ${BIG_INPUT}`}
                  maxLength={80}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Just for your dashboard so you can keep track of who got
                  which link.
                </p>
              </div>

              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                <p className="font-medium">Heads up</p>
                <p className="mt-1 text-xs">
                  This link auto-vouches the first person who signs up with
                  it. Only send it to the friend you want to vouch for. You
                  can revoke the vouch from your dashboard if the wrong
                  person ends up there.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <Button variant="ghost" size="lg" onClick={() => setStep("years")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                size="lg"
                disabled={!canProceedDetails || submitting}
                onClick={() => handleSubmit(false)}
              >
                {submitting ? "Creating..." : "Create invite link"}
              </Button>
            </div>
          </div>
        )}

        {step === "details" && mode === "open_group" && (
          <div>
            <h2 className="text-base font-semibold">Group details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="group-label">Group name</Label>
                <Input
                  id="group-label"
                  value={groupLabel}
                  onChange={(e) => setGroupLabel(e.target.value)}
                  placeholder="e.g. Tahoe ski crew"
                  className={`mt-1.5 ${BIG_INPUT}`}
                  maxLength={80}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Just for your dashboard so you can keep track of which link
                  is which.
                </p>
              </div>

              <div>
                <Label>How many people, max?</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {MAX_CLAIMS_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMaxClaims(n)}
                      className={cn(
                        "rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all",
                        maxClaims === n
                          ? "border-brand bg-brand/5 text-foreground"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  After {maxClaims} people sign up via this link, it stops
                  working.
                </p>
              </div>

              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                <p className="font-medium">Heads up</p>
                <p className="mt-1 text-xs">
                  Drop this link in a group chat. The first {maxClaims} people
                  who sign up via the link all get your vouch automatically.
                  You&apos;ll see each one in your dashboard so you can revoke
                  any if needed.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <Button variant="ghost" size="lg" onClick={() => setStep("years")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                size="lg"
                disabled={!canProceedDetails || submitting}
                onClick={() => handleSubmit(false)}
              >
                {submitting ? "Creating..." : "Create group invite"}
              </Button>
            </div>
          </div>
        )}

        {step === "share" && created && (
          <ShareStep
            created={created}
            displayName={
              created.mode === "open_group"
                ? groupLabel.trim()
                : recipientName.trim()
            }
            onSent={() => router.push("/dashboard/pending-vouches")}
            shareError={shareError}
            setShareError={setShareError}
          />
        )}
      </div>
    </div>
  );
}

function ModeChooser({
  mode,
  onPick,
}: {
  mode: Mode | null;
  /** Single click handler — selects the mode AND advances to the
   *  next step. No separate Continue button: the choice IS the action.
   *  Replaces the old onChange + onContinue split. */
  onPick: (m: Mode) => void;
}) {
  const options: {
    value: Mode;
    label: string;
    description: string;
    Icon: typeof Phone;
  }[] = [
    {
      value: "phone",
      label: "I have their phone number",
      description:
        "Vouch lands automatically when they sign up with that phone.",
      Icon: Phone,
    },
    {
      value: "open_individual",
      label: "I'll just send them a link",
      description:
        "Vouch lands when they sign up via your link. Send it to one person — first person to sign up gets it.",
      Icon: LinkIcon,
    },
    {
      value: "open_group",
      label: "Invite a group of friends with one link",
      description:
        "Drop one link in a group chat. The first N people who sign up all get vouched.",
      Icon: Users,
    },
  ];

  return (
    <div>
      <h2 className="text-base font-semibold">How do you want to invite them?</h2>
      <div className="mt-4 space-y-3">
        {options.map(({ value, label, description, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onPick(value)}
            className={cn(
              "w-full rounded-xl border-2 p-4 text-left transition-all",
              mode === value
                ? "border-brand bg-brand/5 ring-1 ring-brand/20"
                : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  mode === value
                    ? "bg-brand/10 text-brand"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{label}</div>
                {/* Description uses foreground/75 (not muted-foreground)
                    so it stays legible on the dark Trustead theme — the
                    muted variable maps too dim against the deep-green
                    background and was nearly unreadable. */}
                <p className="mt-0.5 text-xs text-foreground/75">
                  {description}
                </p>
              </div>
              {mode === value && (
                <Check className="h-4 w-4 shrink-0 text-brand" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Share-via-Messages step. The whole point of B1 is that Trustead
 * does NOT send the SMS — the sender does, from their own messaging
 * app. Three paths in priority order:
 *
 *   1. navigator.share() — modern Web Share API. Native share sheet
 *      lets the sender pick the messaging app + recipient. Works for
 *      all three modes (Mode B/C just don't pre-fill a To: number;
 *      sender picks recipients in the share sheet).
 *
 *   2. sms: scheme — fallback for when share() isn't available. Only
 *      Mode A populates the To: number; Mode B/C use a bare sms:?body=
 *      and the user picks recipients in their Messages app.
 *
 *   3. Manual "I sent it" button — final fallback for desktop / WebView.
 */
function ShareStep({
  created,
  displayName,
  onSent,
  shareError,
  setShareError,
}: {
  created: CreatedVouch;
  displayName: string;
  onSent: () => void;
  shareError: string | null;
  setShareError: (s: string | null) => void;
}) {
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    setShareError(null);
    setSharing(true);
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await (navigator as Navigator & {
          share: (data: ShareData) => Promise<void>;
        }).share({
          text: created.prefilled_sms_text,
          url: created.share_url,
        });
        return;
      }

      // sms: fallback. iOS wants `&body=`, everything else `?body=`.
      // The To: number is only present for Mode A; open modes leave
      // it blank so the sender picks recipients in Messages.
      const ua = (globalThis as { navigator?: { userAgent?: string } })
        .navigator?.userAgent ?? "";
      const isIOS =
        /iPad|iPhone|iPod/.test(ua) &&
        typeof window !== "undefined" &&
        !("MSStream" in window);
      const sep = isIOS ? "&" : "?";
      const to = created.recipient_phone ?? "";
      const href = `sms:${to}${sep}body=${encodeURIComponent(
        created.prefilled_sms_text
      )}`;
      window.location.href = href;
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === "AbortError") return;
      setShareError(
        e instanceof Error ? e.message : "Couldn't open the share sheet."
      );
    } finally {
      setSharing(false);
    }
  }, [created, setShareError]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(created.prefilled_sms_text);
      toast.success("Copied — paste into your Messages app.");
    } catch {
      toast.error("Couldn't copy. Long-press the text to copy.");
    }
  }, [created]);

  const isOpenMode = created.mode !== "phone";
  const isModeAAutoSent = created.mode === "phone" && created.sms_sent === true;
  const isModeAFallback =
    created.mode === "phone" && created.sms_sent === false;
  const headlineRecipient =
    created.mode === "open_group"
      ? `your group`
      : displayName.split(" ")[0] || "your friend";

  // Mode A + auto-send succeeded → primary state is "sent confirmed",
  // share-sheet becomes a secondary option (sender can add a personal
  // touch). Mode A + auto-send failed (Twilio not configured, opted-out
  // recipient, network error) → fall straight back to the share-sheet
  // flow with a notice. Open modes always use the share-sheet flow.
  if (isModeAAutoSent && created.recipient_phone) {
    return (
      <div>
        <div className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--tt-mint-mid)]/20 text-[var(--tt-mint)]">
            <Check className="h-5 w-5" />
          </div>
          <h2 className="mt-3 text-base font-semibold">Sent</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trustead just texted {headlineRecipient} at{" "}
            <span className="font-medium text-foreground">
              {formatNationalLite(created.recipient_phone)}
            </span>
            . They&apos;ll get a 1° connection to you when they sign up.
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Want to add a personal note?
          </div>
          <p className="mt-1.5 select-all text-sm leading-relaxed text-foreground">
            {created.prefilled_sms_text}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <Button
            size="lg"
            variant="outline"
            onClick={handleShare}
            disabled={sharing}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            {sharing ? "Opening..." : "Send a personal message yourself"}
          </Button>
          <Button
            size="lg"
            onClick={onSent}
          >
            Done
          </Button>
          {shareError && (
            <p className="text-xs text-destructive">{shareError}</p>
          )}
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/dashboard/pending-vouches"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            See all pending invites
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--tt-mint-mid)]/20 text-[var(--tt-mint)]">
          <Check className="h-5 w-5" />
        </div>
        <h2 className="mt-3 text-base font-semibold">
          {isModeAFallback ? "Couldn't auto-send" : "Link ready"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isModeAFallback
            ? `Trustead couldn't text ${headlineRecipient} automatically (${friendlySmsError(created.sms_error)}). Send the link from your own phone instead — we'll still auto-vouch when they sign up.`
            : isOpenMode
              ? `Send this to ${headlineRecipient} from your own messaging app. We'll auto-vouch when they sign up via the link.`
              : `Send this to ${headlineRecipient} from your own messaging app. We'll auto-vouch when they sign up with the phone you entered.`}
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Message
        </div>
        <p className="mt-1.5 select-all text-sm leading-relaxed text-foreground">
          {created.prefilled_sms_text}
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <Button
          size="lg"
          onClick={handleShare}
          disabled={sharing}
          className="h-12 gap-2 text-base"
        >
          <Share2 className="h-5 w-5" />
          {sharing ? "Opening..." : "Send via Messages"}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={handleCopy}
            className="flex-1 gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy text
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onSent}
            className="flex-1"
          >
            I sent it
          </Button>
        </div>
        {shareError && (
          <p className="text-xs text-destructive">{shareError}</p>
        )}
      </div>

      <div className="mt-5 text-center">
        <Link
          href="/dashboard/pending-vouches"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
          })}
        >
          See all pending invites
        </Link>
      </div>
    </div>
  );
}

/** Lightweight (XXX) XXX-XXXX format for the success card without
 *  re-parsing through libphonenumber-js client-side. Falls back to
 *  the raw E.164 if the input doesn't match the expected shape. */
function formatNationalLite(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (!m) return e164;
  return `(${m[1]}) ${m[2]}-${m[3]}`;
}

function friendlySmsError(code: string | null | undefined): string {
  if (!code) return "unknown error";
  if (code === "twilio_not_configured") return "SMS service not configured";
  if (code === "opted_out") return "they opted out of SMS";
  if (code === "send_failed") return "send failed";
  // Anything else is a Twilio-returned error message — pass through truncated.
  return code.length > 80 ? code.slice(0, 77) + "..." : code;
}

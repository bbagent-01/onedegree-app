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
} from "lucide-react";
import { toast } from "sonner";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const BIG_INPUT =
  "h-14 rounded-xl border-2 border-border !bg-white px-4 text-base font-medium shadow-sm focus-visible:border-brand";

type Step = "type" | "years" | "recipient" | "share";

interface CreatedVouch {
  id: string;
  token: string;
  share_url: string;
  prefilled_sms_text: string;
  recipient_phone: string;
}

type ExistingCheck =
  | { kind: "none" }
  | { kind: "self" }
  | {
      kind: "existing";
      user: { id: string; name: string; avatar_url: string | null };
    };

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

  const [step, setStep] = useState<Step>("type");
  const [vouchType, setVouchType] = useState<VouchType | null>(null);
  const [yearsKnown, setYearsKnown] = useState<YearsKnownBucket | null>(null);
  const [stakeAcknowledged, setStakeAcknowledged] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState(phonePrefill);
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
  const canProceedRecipient =
    recipientName.trim().length >= 2 &&
    recipientName.trim().length <= 80 &&
    phoneValid;

  const handleSubmit = useCallback(async () => {
    if (!vouchType || !yearsKnown || !canProceedRecipient) return;
    setSubmitting(true);
    setExisting({ kind: "none" });
    try {
      const res = await fetch("/api/pending-vouches/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: recipientName.trim(),
          recipientPhone: phoneE164,
          vouchType,
          yearsKnownBucket: yearsKnown,
          ratingStake: stakeAcknowledged,
        }),
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
    vouchType,
    yearsKnown,
    recipientName,
    phoneE164,
    stakeAcknowledged,
    canProceedRecipient,
  ]);

  return (
    <div className="mx-auto w-full max-w-[540px] px-4 py-8 md:px-6 md:py-12">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Send className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold md:text-3xl">
          Invite + pre-vouch a friend
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fill out the vouch like you would for someone already on Trustead.
          We&apos;ll mint a link you can text them yourself.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2">
        {(["type", "years", "recipient", "share"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 w-8 rounded-full transition-colors",
              step === s ||
                (i < (["type", "years", "recipient", "share"] as Step[]).indexOf(step))
                ? "bg-brand"
                : "bg-border"
            )}
          />
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white p-5 md:p-6">
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
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
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
            <div className="mt-5 flex justify-end">
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
              How long have you known them?
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
                I understand their guest rating will affect my vouch power once
                they join.
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
                onClick={() => setStep("recipient")}
                className="gap-1"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "recipient" && (
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
                  We&apos;ll auto-vouch when they sign up with this number.
                </p>
              </div>

              {existing.kind === "self" && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>That&apos;s your own number. You can&apos;t vouch for yourself.</p>
                </div>
              )}
              {existing.kind === "existing" && (
                <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
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
                  <div className="min-w-0 flex-1 text-sm text-blue-900">
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

            <div className="mt-5 flex items-center justify-between">
              <Button variant="ghost" size="lg" onClick={() => setStep("years")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                size="lg"
                disabled={!canProceedRecipient || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Creating..." : "Create invite link"}
              </Button>
            </div>
          </div>
        )}

        {step === "share" && created && (
          <ShareStep
            created={created}
            recipientName={recipientName.trim()}
            onSent={() => router.push("/dashboard/pending-vouches")}
            shareError={shareError}
            setShareError={setShareError}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Share-via-Messages step. The whole point of B1 is that Trustead
 * does NOT send the SMS — the sender does, from their own messaging
 * app. We try three paths in order:
 *   1. navigator.share() — modern Web Share API. Works on iOS Safari
 *      14+, Android Chrome. Opens the native share sheet (iMessage,
 *      WhatsApp, Signal, etc.). When share() resolves we don't actually
 *      know if the user picked Messages vs canceled — so we still show
 *      "I sent it" as a manual confirm.
 *   2. sms: scheme — fallback when share() isn't available. iOS uses
 *      `&body=` (yes, ampersand, not querystring), Android uses
 *      `?body=` — see Apple's URL-Scheme reference. We sniff UA.
 *   3. Manual "I sent it" button — final fallback for desktop / weird
 *      WebViews where neither path works.
 */
function ShareStep({
  created,
  recipientName,
  onSent,
  shareError,
  setShareError,
}: {
  created: CreatedVouch;
  recipientName: string;
  onSent: () => void;
  shareError: string | null;
  setShareError: (s: string | null) => void;
}) {
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    setShareError(null);
    setSharing(true);
    try {
      // Prefer Web Share API. Pass `text` (which most receivers
      // will treat as the message body) AND `url` (so apps that
      // surface a link card show one). Some iOS share targets
      // concatenate the two — that's fine, the URL is at the end
      // of the text already.
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
      // Detect iOS by UA + the lack of MSStream (rules out old IE
      // Mobile, which spoofs iPhone in some versions). The TS check
      // earlier in this try-block narrows `navigator` past the
      // share-API guard, so we read userAgent off `globalThis` to
      // sidestep the narrow.
      const ua = (globalThis as { navigator?: { userAgent?: string } })
        .navigator?.userAgent ?? "";
      const isIOS =
        /iPad|iPhone|iPod/.test(ua) &&
        typeof window !== "undefined" &&
        !("MSStream" in window);
      const sep = isIOS ? "&" : "?";
      const href = `sms:${created.recipient_phone}${sep}body=${encodeURIComponent(
        created.prefilled_sms_text
      )}`;
      window.location.href = href;
    } catch (e) {
      // AbortError fires when the user dismisses the share sheet.
      // That's not an error worth surfacing — leave the panel as is
      // so they can try again.
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

  const firstName = recipientName.split(" ")[0] || "your friend";

  return (
    <div>
      <div className="text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-5 w-5" />
        </div>
        <h2 className="mt-3 text-base font-semibold">Link ready</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send this to {firstName} from your own messaging app. We&apos;ll
          auto-vouch when they sign up with the phone you entered.
        </p>
      </div>

      {/* Show the prefilled text so the sender can see what they're
          about to send. Long-press to copy works on mobile too. */}
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

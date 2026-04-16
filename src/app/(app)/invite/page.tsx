"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  VOUCH_TYPES,
  YEARS_KNOWN_BUCKETS,
  computeVouchScore,
  type VouchType,
  type YearsKnownBucket,
} from "@/lib/vouch-constants";
import {
  UserPlus,
  Shield,
  Star,
  Check,
  ChevronRight,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const BIG_INPUT =
  "h-14 rounded-xl border-2 border-border !bg-white px-4 text-base font-medium shadow-sm focus-visible:border-brand";

type Step = "info" | "vouch" | "years" | "preview" | "done";

export default function InvitePage() {
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vouchType, setVouchType] = useState<VouchType | null>(null);
  const [yearsKnown, setYearsKnown] = useState<YearsKnownBucket | null>(null);
  const [saving, setSaving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [stakeAcknowledged, setStakeAcknowledged] = useState(false);

  const score =
    vouchType && yearsKnown ? computeVouchScore(vouchType, yearsKnown) : null;

  // Phone is now required (primary), email is optional
  const parsedPhone = phone.trim()
    ? parsePhoneNumberFromString(phone.trim(), "US")
    : null;
  const phoneValid = parsedPhone?.isValid() ?? false;
  const phoneE164 = parsedPhone?.format("E.164") ?? "";
  const phoneFormatted = parsedPhone?.formatNational() ?? phone;
  const canProceedInfo = name.trim() && phone.trim() && phoneValid;

  const handleSubmit = async () => {
    if (!vouchType || !yearsKnown || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteeName: name.trim(),
          inviteePhone: phoneE164 || undefined,
          inviteeEmail: email.trim() || undefined,
          vouchType,
          yearsKnownBucket: yearsKnown,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send invite");
      }
      const data = await res.json();
      setInviteUrl(data.inviteUrl);
      setStep("done");
      toast.success("Invitation sent!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send invite");
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      toast.success("Link copied!");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[540px] px-4 py-8 md:px-6 md:py-12">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold md:text-3xl">
          Invite someone to 1&deg; B&B
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Invite someone you trust. Your vouch is created automatically when
          they join.
        </p>
      </div>

      {/* Step indicators */}
      <div className="mt-8 flex items-center justify-center gap-2">
        {(["info", "vouch", "years", "preview"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 w-8 rounded-full transition-colors",
              step === s || (step === "done" && i < 4)
                ? "bg-brand"
                : "bg-border"
            )}
          />
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white p-5 md:p-6">
        {/* Step 1: Contact Info */}
        {step === "info" && (
          <div>
            <h2 className="text-base font-semibold">
              Who are you inviting?
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Their full name"
                  className={`mt-1.5 ${BIG_INPUT}`}
                />
              </div>
              <div>
                <Label htmlFor="phone">
                  Phone number{" "}
                  <span className="text-muted-foreground font-normal">
                    (required)
                  </span>
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => {
                    // Format on blur so typing isn't disrupted
                    if (phone.trim()) {
                      const parsed = parsePhoneNumberFromString(phone.trim(), "US");
                      if (parsed?.isValid()) {
                        setPhone(parsed.formatNational());
                      }
                    }
                  }}
                  placeholder="(555) 123-4567"
                  className={`mt-1.5 ${BIG_INPUT}`}
                  type="tel"
                />
                {phone.trim() && !phoneValid && (
                  <p className="mt-1 text-xs text-red-500">
                    Enter a valid phone number
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="email">
                  Email{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional — for email delivery)
                  </span>
                </Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={`mt-1.5 ${BIG_INPUT}`}
                  type="email"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                size="lg"
                disabled={!canProceedInfo}
                onClick={() => setStep("vouch")}
                className="gap-1"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Vouch Type */}
        {step === "vouch" && (
          <div>
            <h2 className="text-base font-semibold">
              How do you know {name.split(" ")[0]}?
            </h2>
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {t.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t.basePoints} pts base
                        </span>
                      </div>
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
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setStep("info")}
              >
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

        {/* Step 3: Years Known */}
        {step === "years" && (
          <div>
            <h2 className="text-base font-semibold">
              How long have you known {name.split(" ")[0]}?
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
                  <div className="flex items-center justify-between">
                    <span>{b.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {b.multiplier}x
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setStep("vouch")}
              >
                Back
              </Button>
              <Button
                size="lg"
                disabled={!yearsKnown}
                onClick={() => setStep("preview")}
                className="gap-1"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Preview & Send */}
        {step === "preview" && (
          <div>
            <h2 className="text-base font-semibold">Review &amp; send</h2>
            <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inviting</span>
                  <span className="font-medium">{name}</span>
                </div>
                {phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{phoneFormatted}</span>
                  </div>
                )}
                {email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{email}</span>
                  </div>
                )}
                <div className="my-2 h-px bg-border" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vouch type</span>
                  <span className="font-medium capitalize">
                    {vouchType === "inner_circle"
                      ? "Inner Circle"
                      : "Standard"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Years known</span>
                  <span className="font-medium">
                    {YEARS_KNOWN_BUCKETS.find((b) => b.value === yearsKnown)
                      ?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vouch score</span>
                  <span className="font-semibold text-brand">
                    {score} pts
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {phone && email
                ? `An invite will be sent via SMS to ${phoneFormatted} and email to ${email}.`
                : phone
                  ? `An invite will be sent via SMS to ${phoneFormatted}.`
                  : email
                    ? `An invitation email will be sent to ${email}.`
                    : null}
            </p>

            {/* Reputation stake acknowledgment */}
            <label className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={stakeAcknowledged}
                onChange={(e) => setStakeAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-brand"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I understand that {name.split(" ")[0]}&apos;s guest rating will
                affect my vouch power.
              </span>
            </label>

            <div className="mt-5 flex items-center justify-between">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setStep("years")}
              >
                Back
              </Button>
              <Button
                size="lg"
                disabled={saving || !stakeAcknowledged}
                onClick={handleSubmit}
              >
                {saving ? "Sending..." : "Send invitation"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Done */}
        {step === "done" && (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 animate-in zoom-in-50 duration-300">
              <Check className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Invitation sent!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {name} will receive an invitation to join 1&deg; B&B.
              {" "}Your vouch will be automatically applied when they sign up.
            </p>
            {inviteUrl && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Or share this link directly:
                </p>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                    {inviteUrl}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={copyUrl}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                size="lg"
                onClick={() => {
                  setStep("info");
                  setName("");
                  setPhone("");
                  setEmail("");
                  setVouchType(null);
                  setYearsKnown(null);
                  setInviteUrl(null);
                  setStakeAcknowledged(false);
                }}
              >
                <UserPlus className="h-4 w-4" />
                Invite another person
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

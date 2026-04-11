"use client";

import { useState } from "react";
import { Mail, Phone, Copy, Check, UserPlus, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VouchForm, type VouchFormData } from "@/components/vouch/VouchForm";

type ContactType = "email" | "phone";

export default function InvitePage() {
  const [step, setStep] = useState<"contact" | "vouch" | "done">("contact");
  const [contactType, setContactType] = useState<ContactType>("email");
  const [contactValue, setContactValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleContactNext() {
    if (!contactValue.trim()) {
      setError("Please enter a contact.");
      return;
    }
    setError(null);
    setStep("vouch");
  }

  async function handleVouchSubmit(data: VouchFormData) {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactType,
          contactValue: contactValue.trim(),
          vouchType: data.vouchType,
          yearsKnownBucket: data.yearsKnownBucket,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "Failed to create invite");
      }

      const { inviteUrl: url } = await res.json();
      setInviteUrl(url);
      setStep("done");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setStep("contact");
    setContactType("email");
    setContactValue("");
    setInviteUrl(null);
    setError(null);
    setCopied(false);
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
            <UserPlus className="size-5 text-primary" />
          </div>
          <h1 className="text-2xl text-foreground">
            Invite Someone
          </h1>
        </div>
        <p className="text-sm text-foreground-secondary">
          Invite a friend to One Degree BNB. You&apos;ll vouch for them as part
          of the invite — they&apos;ll join with your trust already attached.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {["Contact Info", "Vouch for Them", "Share Link"].map((label, i) => {
          const stepIndex =
            step === "contact" ? 0 : step === "vouch" ? 1 : 2;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={cn(
                    "h-px w-6",
                    i <= stepIndex ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              <div
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium",
                  i === stepIndex
                    ? "text-primary"
                    : i < stepIndex
                      ? "text-foreground-secondary"
                      : "text-foreground-tertiary"
                )}
              >
                <div
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                    i === stepIndex
                      ? "bg-primary text-white"
                      : i < stepIndex
                        ? "bg-primary-light text-primary"
                        : "bg-background-mid text-foreground-tertiary"
                  )}
                >
                  {i < stepIndex ? (
                    <Check className="size-3" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span className="hidden sm:inline">{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border bg-white p-6">
        {/* Step 1: Contact Info */}
        {step === "contact" && (
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">
                How should we reach them?
              </Label>
              <p className="text-xs text-foreground-secondary mb-4">
                They&apos;ll receive a link to join. Enter their email or phone
                number.
              </p>

              {/* Toggle */}
              <div className="flex rounded-lg border border-border p-0.5 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setContactType("email");
                    setContactValue("");
                    setError(null);
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    contactType === "email"
                      ? "bg-primary-light text-primary"
                      : "text-foreground-secondary hover:text-foreground"
                  )}
                >
                  <Mail className="size-4" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContactType("phone");
                    setContactValue("");
                    setError(null);
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    contactType === "phone"
                      ? "bg-primary-light text-primary"
                      : "text-foreground-secondary hover:text-foreground"
                  )}
                >
                  <Phone className="size-4" />
                  Phone
                </button>
              </div>

              {/* Input */}
              <Input
                type={contactType === "email" ? "email" : "tel"}
                placeholder={
                  contactType === "email"
                    ? "friend@example.com"
                    : "+1 (555) 123-4567"
                }
                value={contactValue}
                onChange={(e) => {
                  setContactValue(e.target.value);
                  setError(null);
                }}
              />
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <Button
              type="button"
              onClick={handleContactNext}
              disabled={!contactValue.trim()}
              className="w-full"
              size="lg"
            >
              Next — Vouch for Them
            </Button>
          </div>
        )}

        {/* Step 2: Vouch Form */}
        {step === "vouch" && (
          <div>
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setStep("contact")}
                className="text-xs text-foreground-secondary hover:text-foreground transition-colors"
              >
                ← Back to contact info
              </button>
              <p className="text-sm text-foreground-secondary mt-2">
                Vouching for{" "}
                <span className="font-medium text-foreground">
                  {contactValue}
                </span>
              </p>
            </div>
            <VouchForm
              error={error}
              onSubmit={handleVouchSubmit}
              submitting={submitting}
              submitLabel="Create Invite Link"
            />
          </div>
        )}

        {/* Step 3: Done — Share Link */}
        {step === "done" && inviteUrl && (
          <div className="space-y-6 text-center">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 mx-auto mb-4">
                <Link2 className="size-7 text-green-600" />
              </div>
              <h2 className="text-lg text-foreground mb-1">
                Invite Created
              </h2>
              <p className="text-sm text-foreground-secondary">
                Share this link with{" "}
                <span className="font-medium text-foreground">
                  {contactValue}
                </span>
                . It expires in 7 days.
              </p>
            </div>

            {/* Link box */}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background-mid p-3">
              <Input
                readOnly
                value={inviteUrl}
                className="flex-1 bg-transparent text-xs font-mono truncate border-none"
              />
              <Button
                type="button"
                onClick={handleCopy}
                size="sm"
                variant={copied ? "outline" : "default"}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Invite Another Person
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Phone, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const BIG_INPUT =
  "h-14 rounded-xl border-2 border-border !bg-white px-4 text-base font-medium shadow-sm focus-visible:border-brand";

type Step = "view" | "enter" | "verify";

function maskPhone(e164: string | null): string {
  if (!e164) return "Not set";
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 4) return e164;
  return `••• ••• ${digits.slice(-4)}`;
}

/**
 * Phone-change flow uses server-side Clerk Backend API calls so we
 * skip Clerk's "sensitive action" reverification prompt — not every
 * account has a usable second factor to reverify against (e.g. a
 * user whose only factor IS the phone they're replacing). The
 * server uses CLERK_SECRET_KEY and can make the change unconditionally.
 */
export default function PhoneSettingsPage() {
  const [step, setStep] = useState<Step>("view");
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentPhone, setCurrentPhone] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (d?.phone_number) setCurrentPhone(d.phone_number);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const parsed = newPhone.trim()
    ? parsePhoneNumberFromString(newPhone.trim(), "US")
    : null;
  const phoneValid = parsed?.isValid() ?? false;
  const e164 = parsed?.format("E.164") ?? "";

  const sendCode = async () => {
    if (!phoneValid) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users/phone/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164 }),
      });
      // Surface the server's actual error so we can diagnose instead
      // of hiding every failure behind "Couldn't send code".
      const text = await res.text();
      let body: { ok?: boolean; error?: string; message?: string } = {};
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
      if (!res.ok || !body.ok) {
        const detail =
          body.message ||
          body.error ||
          (text && text.length < 200 ? text : "") ||
          `HTTP ${res.status}`;
        throw new Error(detail);
      }
      setStep("verify");
      toast.success("Code sent to " + parsed!.formatNational());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send code");
    } finally {
      setSaving(false);
    }
  };

  const verifyCode = async () => {
    if (otp.length < 6) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otp, phone: e164 }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || "Couldn't verify code");
      }
      setCurrentPhone(e164);
      setNewPhone("");
      setOtp("");
      setStep("view");
      toast.success("Phone number updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't verify code");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="mx-auto w-full max-w-[540px] px-4 py-10">
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[540px] px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Settings
      </Link>
      <header className="mt-3">
        <h1 className="text-2xl font-semibold md:text-3xl">Phone number</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your phone is how friends find you when they vouch or send an intro.
          It&rsquo;s also your primary identifier on 1° B&amp;B — one account
          per number.
        </p>
      </header>

      <div className="mt-8 rounded-2xl border border-border bg-white p-5 md:p-6">
        {step === "view" && (
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              Current phone number
            </Label>
            <div className="mt-1.5 flex items-center gap-2 text-lg font-semibold">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {maskPhone(currentPhone)}
            </div>
            <div className="mt-6">
              <Button size="lg" onClick={() => setStep("enter")}>
                {currentPhone ? "Change phone number" : "Add phone number"}
              </Button>
            </div>
          </div>
        )}

        {step === "enter" && (
          <div>
            <Label htmlFor="newPhone">New phone number</Label>
            <Input
              id="newPhone"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onBlur={() => {
                if (newPhone.trim()) {
                  const p = parsePhoneNumberFromString(newPhone.trim(), "US");
                  if (p?.isValid()) setNewPhone(p.formatNational());
                }
              }}
              placeholder="(555) 123-4567"
              type="tel"
              className={`mt-1.5 ${BIG_INPUT}`}
            />
            {newPhone.trim() && !phoneValid && (
              <p className="mt-1 text-xs text-red-500">
                Enter a valid phone number
              </p>
            )}
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              We&rsquo;ll send a 6-digit code by SMS to verify. No calls, no
              marketing.
            </p>
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setNewPhone("");
                  setStep("view");
                }}
              >
                Cancel
              </Button>
              <Button
                size="lg"
                onClick={sendCode}
                disabled={!phoneValid || saving}
              >
                {saving ? "Sending…" : "Send code"}
              </Button>
            </div>
          </div>
        )}

        {step === "verify" && (
          <div>
            <Label htmlFor="otp">Enter the 6-digit code</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Sent to {parsed?.formatNational() ?? newPhone}.
            </p>
            <Input
              id="otp"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={`mt-3 ${BIG_INPUT} tracking-[0.4em] text-center`}
            />
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setOtp("");
                  setStep("enter");
                }}
              >
                Back
              </Button>
              <Button
                size="lg"
                onClick={verifyCode}
                disabled={otp.length < 6 || saving}
              >
                {saving ? (
                  "Verifying…"
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Verify &amp; save
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const XL_INPUT =
  "h-16 rounded-2xl border-2 border-border !bg-white px-5 text-xl font-semibold shadow-sm focus-visible:border-brand";

type Step = "phone" | "otp" | "email_fallback";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[520px] px-4 py-16">
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      <SignInInner />
    </Suspense>
  );
}

function SignInInner() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const params = useSearchParams();
  const redirectUrl = params.get("redirect_url") || "/browse";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [saving, setSaving] = useState(false);

  const parsed = phone.trim()
    ? parsePhoneNumberFromString(phone.trim(), "US")
    : null;
  const phoneValid = parsed?.isValid() ?? false;
  const e164 = parsed?.format("E.164") ?? "";

  const startPhone = async () => {
    if (!isLoaded || !phoneValid) return;
    setSaving(true);
    try {
      const res = await signIn.create({
        identifier: e164,
        strategy: "phone_code",
      });
      // Find the phone_code factor and prepare it
      const factor = res.supportedFirstFactors?.find(
        (f) => f.strategy === "phone_code"
      );
      if (!factor) throw new Error("Phone sign-in not available");
      await signIn.prepareFirstFactor({
        strategy: "phone_code",
        phoneNumberId: (factor as { phoneNumberId: string }).phoneNumberId,
      });
      setStep("otp");
      toast.success("Code sent to " + parsed!.formatNational());
    } catch (e) {
      toast.error(clerkError(e) || "Couldn't start sign-in");
    } finally {
      setSaving(false);
    }
  };

  const verifyOtp = async () => {
    if (!isLoaded || otp.length < 6) return;
    setSaving(true);
    try {
      const res = await signIn.attemptFirstFactor({
        strategy: "phone_code",
        code: otp,
      });
      if (res.status === "complete" && res.createdSessionId) {
        await setActive({ session: res.createdSessionId });
        router.push(redirectUrl);
        return;
      }
      toast.error("Additional verification required. Try email instead.");
      setStep("email_fallback");
    } catch (e) {
      toast.error(clerkError(e) || "Wrong code. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="mx-auto w-full max-w-[520px] px-4 py-16">
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-4 py-8 md:py-16">
      <header className="text-center">
        <h1 className="text-3xl font-bold md:text-4xl">Welcome back</h1>
        {step === "phone" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your phone number.
          </p>
        )}
      </header>

      <div className="mt-10 rounded-2xl border border-border bg-white p-6 md:p-8 shadow-sm">
        {step === "phone" && (
          <div>
            <Label htmlFor="phone" className="text-base font-semibold">
              Your phone number
            </Label>
            <div className="mt-2 relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Phone className="h-5 w-5" />
              </span>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => {
                  if (phone.trim()) {
                    const p = parsePhoneNumberFromString(phone.trim(), "US");
                    if (p?.isValid()) setPhone(p.formatNational());
                  }
                }}
                placeholder="(555) 123-4567"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                className={`${XL_INPUT} pl-14`}
              />
            </div>
            {phone.trim() && !phoneValid && (
              <p className="mt-1 text-xs text-red-500">
                Enter a valid phone number
              </p>
            )}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                We&rsquo;ll text you a 6-digit code. No passwords needed.
              </div>
            </div>
            <Button
              size="lg"
              onClick={startPhone}
              disabled={!phoneValid || saving}
              className="mt-6 h-14 w-full text-base"
            >
              {saving ? "Sending code\u2026" : "Continue with phone"}
            </Button>

            <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>or</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              onClick={() => setStep("email_fallback")}
              className="mt-4 w-full text-sm font-semibold text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Sign in with email or Google instead
            </button>
          </div>
        )}

        {step === "otp" && (
          <div>
            <Label htmlFor="otp" className="text-base font-semibold">
              Enter the 6-digit code
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Sent to {parsed?.formatNational() ?? phone}.
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
              className={`${XL_INPUT} mt-4 text-center tracking-[0.4em]`}
            />
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setOtp("");
                  setStep("phone");
                }}
              >
                Back
              </Button>
              <Button
                size="lg"
                onClick={verifyOtp}
                disabled={otp.length < 6 || saving}
                className="flex-1 h-14 text-base"
              >
                {saving ? "Verifying\u2026" : "Sign in"}
              </Button>
            </div>
          </div>
        )}

        {step === "email_fallback" && (
          <div>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              &larr; Back to phone sign-in
            </button>
            <div className="mt-4">
              <SignIn
                routing="hash"
                signUpUrl="/sign-up"
                forceRedirectUrl={redirectUrl}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-foreground hover:underline"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}

function clerkError(e: unknown): string | null {
  if (!e || typeof e !== "object") return null;
  const errs = (e as { errors?: Array<{ message?: string; longMessage?: string }> }).errors;
  const first = errs?.[0];
  return first?.longMessage || first?.message || (e instanceof Error ? e.message : null);
}

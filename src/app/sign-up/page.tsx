"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignUp } from "@clerk/nextjs/legacy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, LockKeyhole, Phone } from "lucide-react";
import { toast } from "sonner";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const BIG_INPUT =
  "h-14 rounded-xl border-2 border-border !bg-white px-4 text-base font-medium shadow-sm focus-visible:border-brand";
const XL_INPUT =
  "h-16 rounded-2xl border-2 border-border !bg-white px-5 text-xl font-semibold shadow-sm focus-visible:border-brand";

type Step =
  | "phone"
  | "otp"
  | "account"
  | "email_fallback"
  | "email_otp"
  | "email_phone"
  | "email_phone_otp";

// Suspense wrapper: useSearchParams() forces Next.js to either
// dynamically render or wrap in Suspense. The build fails otherwise
// during prerender with a "missing-suspense-with-csr-bailout" error.
export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[520px] px-4 py-16">
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      <SignUpInner />
    </Suspense>
  );
}

function SignUpInner() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const params = useSearchParams();
  const redirectUrl = params.get("redirect_url") || "/browse";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      await signUp.create({ phoneNumber: e164 });
      await signUp.preparePhoneNumberVerification();
      setStep("otp");
      toast.success("Code sent to " + parsed!.formatNational());
    } catch (e) {
      const code = clerkErrorCode(e);
      if (code === "form_identifier_exists") {
        toast.error(
          "This phone is already registered. Sign in instead."
        );
      } else {
        toast.error(clerkError(e) || "Couldn't start sign-up");
      }
    } finally {
      setSaving(false);
    }
  };

  const verifyPhone = async () => {
    if (!isLoaded || otp.length < 6) return;
    setSaving(true);
    try {
      const res = await signUp.attemptPhoneNumberVerification({ code: otp });
      // After phone verification, Clerk may still require email +
      // password before the signup is complete. Route to account
      // step regardless; if Clerk says we're already complete,
      // setActive immediately.
      if (res.status === "complete" && res.createdSessionId) {
        await setActive({ session: res.createdSessionId });
        router.push(redirectUrl);
        return;
      }
      setStep("account");
    } catch (e) {
      toast.error(clerkError(e) || "Wrong code. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const completeAccount = async () => {
    if (!isLoaded) return;
    if (!firstName.trim() || !password || password.length < 8) return;
    setSaving(true);
    try {
      const res = await signUp.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim() || undefined,
        password,
      });
      if (res.status === "complete" && res.createdSessionId) {
        await setActive({ session: res.createdSessionId });
        router.push(redirectUrl);
        return;
      }
      // Email verification still required?
      if (res.unverifiedFields.includes("email_address")) {
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        // For alpha we skip the email verification step — the user is
        // already in via phone. We'll prompt for email verification on
        // first login when ready. For now, treat as done.
      }
      // If Clerk still hasn't flipped to complete, try once more.
      const after = await signUp.update({});
      if (after.status === "complete" && after.createdSessionId) {
        await setActive({ session: after.createdSessionId });
        router.push(redirectUrl);
      } else {
        toast.error(
          "Email verification pending. Check your inbox, then return here."
        );
      }
    } catch (e) {
      toast.error(clerkError(e) || "Couldn't create account");
    } finally {
      setSaving(false);
    }
  };

  const [googleLoading, setGoogleLoading] = useState(false);
  const signUpWithGoogle = async () => {
    if (!isLoaded || googleLoading) return;
    setGoogleLoading(true);
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: redirectUrl,
      });
      // If authenticateWithRedirect succeeds the page navigates
      // before this line runs — no need to unset the loading flag.
    } catch (e) {
      setGoogleLoading(false);
      toast.error(clerkError(e) || "Couldn't start Google sign-up");
    }
  };

  // Route the signup to whichever step is next based on what Clerk
  // says is still missing. Called after every successful verify /
  // update so the UI stays in sync with Clerk's state.
  const advanceSignUp = async (
    res: NonNullable<ReturnType<typeof useSignUp>["signUp"]>
  ) => {
    if (res.status === "complete" && res.createdSessionId && setActive) {
      await setActive({ session: res.createdSessionId });
      router.push(redirectUrl);
      return;
    }
    const missing = (res.missingFields as string[]) ?? [];
    if (missing.includes("phone_number")) {
      setOtp("");
      setStep("email_phone");
      return;
    }
    toast.error(
      "Missing: " + (missing.join(", ") || "unknown field") +
        ". Contact support if this persists."
    );
  };

  const startEmailSignup = async () => {
    if (!isLoaded) return;
    if (!email.trim() || password.length < 8) return;
    setSaving(true);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setStep("email_otp");
      toast.success("Verification code sent to " + email.trim());
    } catch (e) {
      const code = clerkErrorCode(e);
      if (code === "form_identifier_exists") {
        toast.error(
          "This email is already registered. Sign in instead."
        );
      } else {
        toast.error(clerkError(e) || "Couldn't start sign-up");
      }
    } finally {
      setSaving(false);
    }
  };

  const verifyEmail = async () => {
    if (!isLoaded || otp.length < 6) return;
    setSaving(true);
    try {
      const res = await signUp.attemptEmailAddressVerification({ code: otp });
      await advanceSignUp(res);
    } catch (e) {
      const code = clerkErrorCode(e);
      // Email is already verified on this signUp (e.g. user retried
      // after a successful verify). Read Clerk's current state and
      // route to whatever's still missing.
      if (
        code === "verification_already_verified" ||
        code === "verification_expired"
      ) {
        await advanceSignUp(signUp);
      } else {
        toast.error(clerkError(e) || "Wrong code. Try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Final step of the email-fallback path: add phone + verify it so
  // the signUp can flip to complete.
  const submitEmailPhone = async () => {
    if (!isLoaded || !phoneValid) return;
    setSaving(true);
    try {
      await signUp.update({ phoneNumber: e164 });
      await signUp.preparePhoneNumberVerification();
      setStep("email_phone_otp");
      toast.success("Code sent to " + parsed!.formatNational());
    } catch (e) {
      const code = clerkErrorCode(e);
      if (code === "form_identifier_exists") {
        toast.error(
          "This phone is already registered. Sign in instead."
        );
      } else {
        toast.error(clerkError(e) || "Couldn't add phone");
      }
    } finally {
      setSaving(false);
    }
  };

  const verifyEmailPhoneOtp = async () => {
    if (!isLoaded || otp.length < 6) return;
    setSaving(true);
    try {
      const res = await signUp.attemptPhoneNumberVerification({ code: otp });
      await advanceSignUp(res);
    } catch (e) {
      const code = clerkErrorCode(e);
      if (
        code === "verification_already_verified" ||
        code === "verification_expired"
      ) {
        await advanceSignUp(signUp);
      } else {
        toast.error(clerkError(e) || "Wrong code. Try again.");
      }
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
        <h1 className="text-3xl font-bold md:text-4xl">Create your account</h1>
        {step === "phone" && (
          <p className="mt-2 text-sm text-muted-foreground">
            1&deg; B&amp;B is invite-only and phone-first. One account per
            number.
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
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted-foreground">
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
                Enter a valid US phone number
              </p>
            )}

            {/* Privacy promise */}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <strong className="block">
                  Your phone is your identity on 1&deg; B&amp;B.
                </strong>
                <span>
                  We&rsquo;ll never share or sell it, or send marketing
                  texts (unless you opt in).
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                size="lg"
                onClick={startPhone}
                disabled={!phoneValid || saving}
                className="w-full h-14 text-base"
              >
                {saving ? "Sending code\u2026" : "Continue with phone"}
              </Button>
            </div>

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
              Sign up with email or Google instead
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
                onClick={verifyPhone}
                disabled={otp.length < 6 || saving}
                className="flex-1 h-14 text-base"
              >
                {saving ? "Verifying\u2026" : "Verify code"}
              </Button>
            </div>
          </div>
        )}

        {step === "account" && (
          <div>
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                Phone verified! Finish setting up your account.
              </div>
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={signUpWithGoogle}
              disabled={googleLoading}
              className="mt-5 h-14 w-full text-base"
            >
              <span className="inline-flex items-center gap-2">
                {googleLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-foreground" />
                ) : (
                  <GoogleIcon className="h-4 w-4" />
                )}
                {googleLoading
                  ? "Opening Google\u2026"
                  : "Continue with Google"}
              </span>
            </Button>
            <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>or add email &amp; password</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="first">First name</Label>
                <Input
                  id="first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`mt-1 ${BIG_INPUT}`}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <Label htmlFor="last">Last name</Label>
                <Input
                  id="last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={`mt-1 ${BIG_INPUT}`}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="mt-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                className={`mt-1 ${BIG_INPUT}`}
              />
            </div>
            <div className="mt-3">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                type="password"
                autoComplete="new-password"
                className={`mt-1 ${BIG_INPUT}`}
              />
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <LockKeyhole className="h-3.5 w-3.5" />
              Passwords are hashed and never stored in plain text.
            </div>
            <Button
              size="lg"
              onClick={completeAccount}
              disabled={
                saving ||
                !firstName.trim() ||
                password.length < 8
              }
              className="mt-5 h-14 w-full text-base"
            >
              {saving ? "Creating account\u2026" : "Finish sign up"}
            </Button>
          </div>
        )}

        {step === "email_fallback" && (
          <div>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              &larr; Back to phone sign-up
            </button>
            <Button
              variant="outline"
              size="lg"
              onClick={signUpWithGoogle}
              className="mt-4 h-14 w-full text-base"
            >
              <span className="inline-flex items-center gap-2">
                <GoogleIcon className="h-4 w-4" />
                Continue with Google
              </span>
            </Button>
            <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>or email and password</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="first-e">First name</Label>
                <Input
                  id="first-e"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`mt-1 ${BIG_INPUT}`}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <Label htmlFor="last-e">Last name</Label>
                <Input
                  id="last-e"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={`mt-1 ${BIG_INPUT}`}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="mt-3">
              <Label htmlFor="email-e">Email</Label>
              <Input
                id="email-e"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                className={`mt-1 ${BIG_INPUT}`}
              />
            </div>
            <div className="mt-3">
              <Label htmlFor="password-e">Password</Label>
              <Input
                id="password-e"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                type="password"
                autoComplete="new-password"
                className={`mt-1 ${BIG_INPUT}`}
              />
            </div>
            <Button
              size="lg"
              onClick={startEmailSignup}
              disabled={
                saving ||
                !email.trim() ||
                password.length < 8
              }
              className="mt-5 h-14 w-full text-base"
            >
              {saving ? "Sending code\u2026" : "Continue"}
            </Button>
          </div>
        )}

        {step === "email_otp" && (
          <div>
            <Label htmlFor="email-otp" className="text-base font-semibold">
              Enter the 6-digit code
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Sent to {email}.
            </p>
            <Input
              id="email-otp"
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
                  setStep("email_fallback");
                }}
              >
                Back
              </Button>
              <Button
                size="lg"
                onClick={verifyEmail}
                disabled={otp.length < 6 || saving}
                className="flex-1 h-14 text-base"
              >
                {saving ? "Verifying\u2026" : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* Clerk requires a phone number on this instance, so the
            email fallback path ends with a phone collection step.
            Also catches the case where a user clicked a stale
            "Finish sign up" after email was already verified. */}
        {step === "email_phone" && (
          <div>
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                Almost done &mdash; add your phone number to finish
                signing up. One account per number.
              </div>
            </div>
            <div className="mt-5">
              <Label htmlFor="phone-ep" className="text-base font-semibold">
                Your phone number
              </Label>
              <div className="mt-2 relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Phone className="h-5 w-5" />
                </span>
                <Input
                  id="phone-ep"
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
                  Enter a valid US phone number
                </p>
              )}
            </div>
            <Button
              size="lg"
              onClick={submitEmailPhone}
              disabled={!phoneValid || saving}
              className="mt-5 h-14 w-full text-base"
            >
              {saving ? "Sending code\u2026" : "Send code"}
            </Button>
          </div>
        )}

        {step === "email_phone_otp" && (
          <div>
            <Label htmlFor="ep-otp" className="text-base font-semibold">
              Enter the 6-digit code
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Sent to {parsed?.formatNational() ?? phone}.
            </p>
            <Input
              id="ep-otp"
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
                  setStep("email_phone");
                }}
              >
                Back
              </Button>
              <Button
                size="lg"
                onClick={verifyEmailPhoneOtp}
                disabled={otp.length < 6 || saving}
                className="flex-1 h-14 text-base"
              >
                {saving ? "Verifying\u2026" : "Finish sign up"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-foreground hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}

/**
 * Pull a human-readable message out of a Clerk error object, which is
 * `{ errors: [{ message, longMessage, code }] }` in v7.
 */
function clerkError(e: unknown): string | null {
  if (!e || typeof e !== "object") return null;
  const errs = (e as { errors?: Array<{ message?: string; longMessage?: string }> }).errors;
  const first = errs?.[0];
  return first?.longMessage || first?.message || (e instanceof Error ? e.message : null);
}

function clerkErrorCode(e: unknown): string | null {
  if (!e || typeof e !== "object") return null;
  const errs = (e as { errors?: Array<{ code?: string }> }).errors;
  return errs?.[0]?.code ?? null;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.5 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.9a5.1 5.1 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.6 3.3-7.9z" fill="#4285F4" />
      <path d="M12 23c3 0 5.5-1 7.3-2.8l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z" fill="#34A853" />
      <path d="M5.8 14.1a6.7 6.7 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8l3.6-2.8z" fill="#FBBC04" />
      <path d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z" fill="#EA4335" />
    </svg>
  );
}

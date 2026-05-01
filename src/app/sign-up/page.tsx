"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSignUp } from "@clerk/nextjs/legacy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, LockKeyhole, Phone, Cake } from "lucide-react";
import { toast } from "sonner";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { computeAge } from "@/lib/age";

const BIG_INPUT =
  "h-14 rounded-xl border-2 border-border !bg-white px-4 text-base font-medium shadow-sm focus-visible:border-brand";
const XL_INPUT =
  "h-16 rounded-2xl border-2 border-border !bg-white px-5 text-xl font-semibold shadow-sm focus-visible:border-brand";

type Step =
  | "dob"
  | "phone"
  | "otp"
  | "account"
  | "email_fallback"
  | "email_otp"
  | "email_phone"
  | "email_phone_otp";

type BlockedReason = "under13" | "under18";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

// See sign-in/page.tsx for the rationale on the timeout + hard nav.
// In short: setActive can hang on Clerk dev cross-origin, and a
// router.push to /browse races the cookie write — server renders
// /browse signed-out, user has to refresh manually. This pattern
// caps the wait and forces a full request so the cookie always
// rides along on the post-signup landing.
const SETACTIVE_TIMEOUT_MS = 1500;

function SignUpInner() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const params = useSearchParams();
  const redirectUrl = params.get("redirect_url") || "/browse";

  const completeSignUpAndRedirect = async (sessionId: string) => {
    // useSignUp returns setActive as part of a discriminated union
    // narrowed by isLoaded — outside an isLoaded check (e.g. inside a
    // helper closure) TS sees setActive as possibly undefined. Guard
    // here so TS narrows for the actual call below; in practice
    // setActive is always defined by the time we get here because all
    // call sites gate on `signUp.status === "complete"` which requires
    // useSignUp to have loaded.
    if (!setActive) return;
    await Promise.race([
      setActive({ session: sessionId }),
      new Promise<void>((resolve) =>
        setTimeout(resolve, SETACTIVE_TIMEOUT_MS)
      ),
    ]).catch(() => {
      /* see comment above completeSignInAndRedirect */
    });
    window.location.assign(redirectUrl);
  };

  const [step, setStep] = useState<Step>("dob");
  const [dobMonth, setDobMonth] = useState<string>("");
  const [dobYear, setDobYear] = useState<string>("");
  const [blocked, setBlocked] = useState<BlockedReason | null>(null);
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

  const dobYearNum = Number(dobYear);
  const dobMonthNum = Number(dobMonth);
  const dobFilled = Boolean(dobYear) && Boolean(dobMonth);
  const dobMetadata =
    dobFilled && dobYearNum > 1900 && dobMonthNum >= 1 && dobMonthNum <= 12
      ? { dob_year: dobYearNum, dob_month: dobMonthNum }
      : null;

  // Legal pack §04.7: signup is gated on a client-side age check. The
  // webhook re-runs the check server-side (belt-and-suspenders) and
  // deletes any Clerk user that slipped through without a qualifying
  // age, so the data model stays consistent even if a determined
  // attacker bypasses the client gate.
  const proceedFromDob = () => {
    if (!dobMetadata) {
      toast.error("Pick a month and year to continue");
      return;
    }
    const age = computeAge(dobYearNum, dobMonthNum);
    if (age < 13) {
      setBlocked("under13");
      return;
    }
    if (age < 18) {
      setBlocked("under18");
      return;
    }
    setStep("phone");
  };

  const startPhone = async () => {
    if (!isLoaded) return;
    if (!dobMetadata) {
      toast.error("Add your month + year of birth first");
      setStep("dob");
      return;
    }
    if (!phone.trim()) {
      toast.error("Enter your phone number");
      return;
    }
    if (!phoneValid) {
      toast.error("That phone number doesn't look right");
      return;
    }
    setSaving(true);
    try {
      await signUp.create({
        phoneNumber: e164,
        unsafeMetadata: dobMetadata,
      });
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
    if (!isLoaded) return;
    if (otp.length < 6) {
      toast.error("Enter the 6-digit code we texted you");
      return;
    }
    setSaving(true);
    try {
      const res = await signUp.attemptPhoneNumberVerification({ code: otp });
      // After phone verification, Clerk may still require email +
      // password before the signup is complete. Route to account
      // step regardless; if Clerk says we're already complete,
      // setActive immediately.
      if (res.status === "complete" && res.createdSessionId) {
        await completeSignUpAndRedirect(res.createdSessionId);
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
    if (!firstName.trim()) {
      toast.error("Add your first name");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("Password needs at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await signUp.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim() || undefined,
        password,
      });
      if (res.status === "complete" && res.createdSessionId) {
        await completeSignUpAndRedirect(res.createdSessionId);
        return;
      }
      // Email verification required — Clerk's prod instance enforces
      // verify_at_sign_up. Send the code and route the user to the
      // existing email_otp step to enter it.
      if (res.unverifiedFields.includes("email_address")) {
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        setOtp("");
        setStep("email_otp");
        toast.success("Verification code sent to " + email.trim());
        return;
      }
      // No verification needed but Clerk still hasn't flipped to
      // complete — retry update once before surfacing an error.
      const after = await signUp.update({});
      if (after.status === "complete" && after.createdSessionId) {
        await completeSignUpAndRedirect(after.createdSessionId);
      } else {
        toast.error(
          "Couldn't finish sign-up. Refresh and try again."
        );
      }
    } catch (e) {
      toast.error(clerkError(e) || "Couldn't create account");
    } finally {
      setSaving(false);
    }
  };

  // Google SSO on sign-up — surfaced ONLY on the email_fallback
  // step so the phone-first path stays uncluttered. Users who pick
  // Google will still be asked for a phone number by Clerk before
  // their account is complete (our missing-fields router sends them
  // to the phone step).
  const [googleLoading, setGoogleLoading] = useState(false);
  const signUpWithGoogle = () => {
    if (!isLoaded || googleLoading || !dobMetadata) return;
    setGoogleLoading(true);
    // rAF so React commits the spinner state before Clerk's
    // authenticateWithRedirect fires. Without it, the redirect can
    // start inside the same task and the spinner never paints.
    // DOB survives the OAuth bounce via unsafeMetadata so the Clerk
    // webhook can re-run the age check after the provider returns.
    requestAnimationFrame(() => {
      signUp
        .authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: redirectUrl,
          unsafeMetadata: dobMetadata,
        })
        .catch((e: unknown) => {
          setGoogleLoading(false);
          toast.error(clerkError(e) || "Couldn't start Google sign-up");
        });
    });
  };

  // Route the signup to whichever step is next based on what Clerk
  // says is still missing. Called after every successful verify /
  // update so the UI stays in sync with Clerk's state.
  const advanceSignUp = async (
    res: NonNullable<ReturnType<typeof useSignUp>["signUp"]>
  ) => {
    if (res.status === "complete" && res.createdSessionId) {
      await completeSignUpAndRedirect(res.createdSessionId);
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
    if (!dobMetadata) {
      toast.error("Add your month + year of birth first");
      setStep("dob");
      return;
    }
    if (!email.trim()) {
      toast.error("Enter your email address");
      return;
    }
    if (password.length < 8) {
      toast.error("Password needs at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        unsafeMetadata: dobMetadata,
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
    if (!isLoaded) return;
    if (otp.length < 6) {
      toast.error("Enter the 6-digit code we emailed you");
      return;
    }
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

  // Skip the phone step — "Verify later". The user gets an active
  // session with no phone, their Supabase row has phone_number=null,
  // and the profile UI surfaces a red "Unverified" badge until they
  // return and add a number.
  //
  // TODO (post-S6): Clerk's instance still has phone marked required
  // in the dashboard, which means `setActive` will reject the pending
  // signUp. This Skip button works ONLY after the Clerk config is
  // updated to "phone required at verification, optional at signup".
  // In the meantime this will surface a toast + leave the user on
  // the phone step so they can't get stuck. The future fix is either
  // relaxing the Clerk instance config OR creating a custom
  // backend-session endpoint that can bypass Clerk's missing_fields
  // gate and hand back a session token.
  const skipPhone = async () => {
    if (!isLoaded || saving) return;
    setSaving(true);
    try {
      if (signUp.status === "complete" && signUp.createdSessionId) {
        await completeSignUpAndRedirect(signUp.createdSessionId);
        return;
      }
      // Try to force-complete the signUp without phone. If Clerk's
      // instance config still requires phone_number this will throw
      // and we show a toast asking the user to enter a number.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = (await (signUp as any).update({
        unsafeMetadata: { phone_skipped: true },
      })) as typeof signUp;
      if (updated.status === "complete" && updated.createdSessionId) {
        await completeSignUpAndRedirect(updated.createdSessionId);
      } else {
        toast.error(
          "Phone is still required right now. Add a number to continue — we'll make skip available soon."
        );
      }
    } catch (e) {
      toast.error(
        clerkError(e) ||
          "Phone is still required right now. Add a number to continue."
      );
    } finally {
      setSaving(false);
    }
  };

  // Final step of the email-fallback path: add phone + verify it so
  // the signUp can flip to complete.
  const submitEmailPhone = async () => {
    if (!isLoaded) return;
    if (!phone.trim()) {
      toast.error("Enter your phone number");
      return;
    }
    if (!phoneValid) {
      toast.error("That phone number doesn't look right");
      return;
    }
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
    if (!isLoaded) return;
    if (otp.length < 6) {
      toast.error("Enter the 6-digit code we texted you");
      return;
    }
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

  if (blocked) {
    return <AgeBlocked reason={blocked} />;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-4 py-8 md:py-16">
      <Link
        href="/"
        aria-label="Trustead home"
        className="mb-8 inline-flex justify-center self-center"
      >
        <iframe
          src="/assets/logo-animation/trustead-logo-animation-white.html"
          className="h-12 w-44 border-0"
          tabIndex={-1}
          title="Trustead"
        />
      </Link>
      <header className="text-center">
        <h1 className="font-serif text-3xl font-bold md:text-4xl">Create your account</h1>
        {step === "dob" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Before we start, we need to confirm you&rsquo;re old enough to use
            Trustead.
          </p>
        )}
        {step === "phone" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Trustead is invite-only and phone-first. One account per
            number.
          </p>
        )}
      </header>

      <div className="mt-10 rounded-2xl border border-border bg-white p-6 md:p-8 shadow-sm">
        {step === "dob" && (
          <div>
            <Label className="text-base font-semibold">Date of birth</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              You must be 18 or older to use Trustead. We use your date
              of birth solely to verify your age.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="dob-month" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Month
                </Label>
                <select
                  id="dob-month"
                  value={dobMonth}
                  onChange={(e) => setDobMonth(e.target.value)}
                  className={`${BIG_INPUT} mt-1 appearance-none`}
                >
                  <option value="">Select month</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="dob-year" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Year
                </Label>
                <select
                  id="dob-year"
                  value={dobYear}
                  onChange={(e) => setDobYear(e.target.value)}
                  className={`${BIG_INPUT} mt-1 appearance-none`}
                >
                  <option value="">Select year</option>
                  {yearOptions().map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
              <Cake className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Day is not required and not stored.</span>
            </div>
            <Button
              size="lg"
              onClick={proceedFromDob}
              className="mt-6 h-14 w-full text-base"
            >
              Continue
            </Button>
            <SignInWrap />
          </div>
        )}

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
            <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <strong className="block text-base">
                  Your phone is your identity on Trustead.
                </strong>
                <span className="text-sm leading-snug">
                  We&rsquo;ll never share or sell it, or send marketing
                  texts (unless you opt in).
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                size="lg"
                onClick={startPhone}
                disabled={saving}
                className="w-full h-14 text-base"
              >
                {saving ? "Sending code\u2026" : "Continue with phone"}
              </Button>
              <SignInWrap />
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
                disabled={saving}
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
            <div className="mt-5 grid grid-cols-2 gap-2">
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
              disabled={saving}
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
            <p className="mt-4 text-sm text-muted-foreground">
              You can sign up now, but you&rsquo;ll need a phone number to
              verify your account on the next step.
            </p>
            <Button
              variant="outline"
              size="lg"
              onClick={signUpWithGoogle}
              disabled={googleLoading}
              className="mt-4 h-14 w-full text-base"
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
              disabled={saving}
              className="mt-5 h-14 w-full text-base"
            >
              {saving ? "Sending code\u2026" : "Continue"}
            </Button>
            <SignInWrap />
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
                disabled={saving}
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
            <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <strong className="block text-base">
                  Your phone is your identity on Trustead.
                </strong>
                <span className="text-sm leading-snug">
                  We&rsquo;ll never share or sell it, or send marketing
                  texts (unless you opt in). One account per number.
                </span>
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
              disabled={saving}
              className="mt-5 h-14 w-full text-base"
            >
              {saving ? "Sending code\u2026" : "Send code"}
            </Button>
            <button
              type="button"
              onClick={skipPhone}
              disabled={saving}
              className="mt-3 w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground underline underline-offset-4 disabled:opacity-60"
            >
              Skip for now &mdash; I&rsquo;ll verify my phone later
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Skipping means your profile shows an &ldquo;Unverified&rdquo;
              badge until you add a number from your account settings.
            </p>
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
                disabled={saving}
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
 * Year dropdown covers roughly 13 to 120 years old so the gate still
 * works for realistic ages without pre-filtering under-13 users. The
 * age-check runs AFTER they pick — so a determined 10-year-old can
 * still pick 2015 and land on the COPPA block message.
 */
function yearOptions(): number[] {
  const now = new Date().getFullYear();
  const earliest = now - 120;
  const years: number[] = [];
  for (let y = now; y >= earliest; y--) years.push(y);
  return years;
}

/**
 * Legal pack §04.7 hard-block. Rendered when the client-side age check
 * fails (under 13 for COPPA; under 18 for the general age gate).
 * Deliberately has no retry affordance — the user must reload the
 * page or leave the tab. That matches the "no retry coaching" rule:
 * we never hint at the age that would let them through.
 */
function AgeBlocked({ reason }: { reason: BlockedReason }) {
  const [copy, heading] =
    reason === "under13"
      ? [
          "Trustead is not available to children under 13. We will not collect further information from you.",
          "We can\u2019t create an account for you",
        ]
      : [
          "We\u2019re sorry \u2014 Trustead is only available to people 18 and older.",
          "We can\u2019t create an account for you",
        ];
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full rounded-2xl border border-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">{heading}</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {copy}
        </p>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        If you believe this is a mistake, close this tab and reach out to
        support from another device.
      </p>
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

/**
 * Sign-in-wrap legal consent (Alpha Legal Pack v2 §04.1). Rendered under
 * the primary submit button on each signup entry point so account
 * creation is bound to the Terms + Privacy without a separate checkbox.
 */
function SignInWrap() {
  return (
    <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground">
      By creating an account, I confirm that I am at least 18 years old and I
      agree to Trustead&rsquo;s{" "}
      <Link
        href="/terms"
        className="font-semibold text-foreground underline underline-offset-2 hover:text-brand"
      >
        Terms of Service
      </Link>
      , including its binding arbitration and class-action waiver, and I
      acknowledge the{" "}
      <Link
        href="/privacy"
        className="font-semibold text-foreground underline underline-offset-2 hover:text-brand"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
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


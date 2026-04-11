"use client";

import { SignUpButton } from "@clerk/nextjs";
import { AlertCircle, Shield } from "lucide-react";

interface JoinClientProps {
  status: "valid" | "invalid" | "claimed" | "expired";
  token: string;
  inviterName?: string;
  inviterAvatar?: string | null;
}

export function JoinClient({
  status,
  token,
  inviterName,
  inviterAvatar,
}: JoinClientProps) {
  if (status !== "valid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 mx-auto mb-4">
            <AlertCircle className="size-7 text-destructive" />
          </div>
          <h1 className="text-xl text-foreground mb-2">
            {status === "invalid" && "Invalid Invite Link"}
            {status === "claimed" && "Already Used"}
            {status === "expired" && "Invite Expired"}
          </h1>
          <p className="text-sm text-foreground-secondary">
            {status === "invalid" &&
              "This invite link isn't valid. Ask your contact to send a new one."}
            {status === "claimed" &&
              "This invite has already been used. If you need a new one, ask the person who invited you."}
            {status === "expired" &&
              "This invite link has expired. Ask your contact to send a new one."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center">
        {/* Logo */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-top to-primary-bot mx-auto mb-6">
          <span className="font-mono text-lg font-bold text-white">1°</span>
        </div>

        {/* Inviter info */}
        <div className="mb-6">
          {inviterAvatar && (
            <img
              src={inviterAvatar}
              alt=""
              className="size-16 rounded-full mx-auto mb-3 border-2 border-border"
            />
          )}
          <h1 className="text-xl text-foreground mb-2">
            {inviterName} invited you to One Degree BNB
          </h1>
          <p className="text-sm text-foreground-secondary leading-relaxed">
            One Degree is a private home-sharing network where every member is
            vouched for by someone in the community. You&apos;re joining because
            someone trusts you.
          </p>
        </div>

        {/* How it works */}
        <div className="rounded-xl bg-background-mid border border-border p-4 mb-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="size-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              How it works
            </span>
          </div>
          <ul className="space-y-2 text-xs text-foreground-secondary">
            <li className="flex gap-2">
              <span className="text-primary font-medium">1.</span>
              Create your account with a verified phone number
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-medium">2.</span>
              Your inviter&apos;s vouch is automatically applied
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-medium">3.</span>
              Browse trusted listings and connect with hosts
            </li>
          </ul>
        </div>

        {/* Sign Up button */}
        <SignUpButton
          mode="modal"
          forceRedirectUrl={`/join/${token}/claim`}
        >
          <button className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
            Sign Up to Join
          </button>
        </SignUpButton>

        <p className="text-xs text-foreground-tertiary mt-4">
          Already a member?{" "}
          <a
            href={`/join/${token}/claim`}
            className="text-primary hover:underline"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

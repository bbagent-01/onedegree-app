import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Shield } from "lucide-react";

interface SignUpPageProps {
  searchParams: Promise<{ invite_token?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { invite_token } = await searchParams;
  const signupMode = process.env.SIGNUP_MODE || "invite-only";

  // In invite-only mode, block direct signup without an invite token
  if (signupMode === "invite-only" && !invite_token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-top to-primary-bot mx-auto mb-6">
            <span className="font-mono text-lg font-bold text-white">1°</span>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light mx-auto mb-4">
            <Shield className="size-7 text-primary" />
          </div>
          <h1 className="text-xl text-foreground mb-2">
            One Degree is Invite-Only
          </h1>
          <p className="text-sm text-foreground-secondary leading-relaxed mb-6">
            To join One Degree BNB, you need an invite from an existing member.
            Every member is vouched for by someone they know — that&apos;s how we
            keep the community trusted.
          </p>
          <div className="rounded-xl bg-background-mid border border-border p-4 text-left">
            <p className="text-sm font-medium text-foreground mb-2">
              How to get an invite:
            </p>
            <ul className="space-y-1.5 text-xs text-foreground-secondary">
              <li>Ask a friend who&apos;s already a member</li>
              <li>They&apos;ll send you a personal invite link</li>
              <li>Click the link to sign up and join</li>
            </ul>
          </div>
          <p className="text-xs text-foreground-tertiary mt-6">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Open mode or has invite token — show Clerk signup
  const redirectUrl = invite_token
    ? `/join/${invite_token}/claim`
    : "/listings";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignUp
        forceRedirectUrl={redirectUrl}
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "rounded-2xl border border-border shadow-lg",
          },
        }}
      />
    </div>
  );
}

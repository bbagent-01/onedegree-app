// Signed-out landing rendered at `/` when no Clerk session exists.
// Three primary affordances: get an invite (the invite-only model
// is real product behavior), sign in, sign up. Lives inside the
// SidebarShell so the chrome stays consistent if the viewer
// stumbles in mid-session — but the centered card carries the
// content. The "how Trustead works" entry point is folded into
// the invite-link copy until a public marketing page exists.

import Link from "next/link";
import { TrusteadLogo } from "@/components/layout/trustead-logo";

export function SignedOutLanding() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12 md:min-h-screen md:py-16">
      <div className="w-full max-w-[480px] rounded-2xl border border-border bg-card/40 p-8 text-center shadow-sm md:p-10">
        <div className="mx-auto flex w-full justify-center text-foreground">
          <TrusteadLogo className="brand-logo h-8 w-auto" />
        </div>
        <h1 className="mt-6 font-serif text-2xl text-foreground md:text-3xl">
          Stay with friends&#8209;of&#8209;friends
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Trustead is an invite-only network for renting your home — and
          staying in someone else&apos;s — through people you both know.
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <Link
            href="/sign-up"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign up
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background/60 px-5 text-sm font-medium text-foreground transition-colors hover:bg-background/80"
          >
            Sign in
          </Link>
          <Link
            href="/join"
            className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How Trustead works
          </Link>
        </div>
      </div>
    </div>
  );
}

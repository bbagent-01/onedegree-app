export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserButton } from "@clerk/nextjs";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center gap-8 bg-background overflow-hidden">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-emerald-500/[0.04] blur-3xl" />

      <div className="relative text-center space-y-3">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <span className="font-mono text-xl font-bold text-primary-foreground">1</span>
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          One Degree
        </h1>
        <p className="text-lg text-muted-foreground">
          Private home rentals through trusted connections
        </p>
      </div>

      <div className="relative">
        {!userId ? (
          <SignInButton mode="modal">
            <button className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20">
              Sign In
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </SignInButton>
        ) : (
          <div className="flex items-center gap-4">
            <UserButton />
            <p className="text-sm text-muted-foreground">You&apos;re signed in!</p>
          </div>
        )}
      </div>

      {/* Bottom border accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
    </main>
  );
}

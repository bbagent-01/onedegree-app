export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserButton } from "@clerk/nextjs";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center gap-8 bg-background overflow-hidden">
      {/* Subtle purple radial glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.14), transparent 65%)' }} />

      <div className="relative text-center space-y-3">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-top to-primary-bot shadow-lg shadow-purple-500/20">
          <span className="font-mono text-xl font-bold text-white">1</span>
        </div>
        <h1 className="font-display text-5xl text-foreground">
          One Degree
        </h1>
        <p className="text-lg text-foreground-secondary">
          Private home rentals through trusted connections
        </p>
      </div>

      <div className="relative">
        {!userId ? (
          <SignInButton mode="modal">
            <button className="group inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-primary border-[1.5px] border-primary-border shadow-md shadow-purple-500/10 transition-all hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5">
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
            <p className="text-sm text-foreground-secondary">You&apos;re signed in!</p>
          </div>
        )}
      </div>
    </main>
  );
}

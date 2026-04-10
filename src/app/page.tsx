export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserButton } from "@clerk/nextjs";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center gap-8 bg-background overflow-hidden">
      {/* Subtle purple radial glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.14), transparent 65%)' }} />

      {/* Top nav */}
      <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-top to-primary-bot shadow-md shadow-purple-500/15">
            <span className="font-mono text-sm font-bold text-white">1</span>
          </div>
          <span className="font-display text-lg text-foreground">One Degree</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="/design" className="text-sm font-medium text-foreground-secondary hover:text-primary transition-colors">Design System</a>
          <a href="/dashboard" className="text-sm font-medium text-foreground-secondary hover:text-primary transition-colors">Dashboard</a>
          {!userId ? (
            <SignInButton mode="modal">
              <button className="rounded-full bg-gradient-to-r from-primary-top to-primary-bot px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-purple-500/15 transition-all hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5">
                Sign In
              </button>
            </SignInButton>
          ) : (
            <UserButton />
          )}
        </div>
      </nav>

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

      <div className="relative flex items-center gap-4">
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
          <a href="/dashboard" className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-top to-primary-bot px-6 py-3 text-sm font-semibold text-white shadow-md shadow-purple-500/15 transition-all hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5">
            Go to Dashboard
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        )}
      </div>
    </main>
  );
}

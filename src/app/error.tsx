"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the full error in dev + capture in prod logs so we can
    // diagnose crashes that survived the route's own error handling.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-surface-alt">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-4">
          <Link
            href="/browse"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            1&deg; B&amp;B
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-subtle">
            500
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Something went wrong
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            An unexpected error occurred. Our team has been notified. You can
            try again, or head back home.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-semibold text-background shadow-sm transition-colors hover:bg-foreground/90"
            >
              Try again
            </button>
            <Link
              href="/browse"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-foreground/30"
            >
              Back home
            </Link>
          </div>

          {error.digest && (
            <p className="mt-10 font-mono text-[11px] uppercase tracking-wider text-subtle">
              Error id: {error.digest}
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Need help? Email{" "}
            <a
              href="mailto:hello@staytrustead.com"
              className="font-semibold text-foreground underline underline-offset-2 hover:text-brand"
            >
              hello@staytrustead.com
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

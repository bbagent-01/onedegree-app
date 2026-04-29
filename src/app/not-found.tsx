import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found · Trustead",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-alt">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-4">
          <Link
            href="/browse"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Trustead
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-subtle">
            404
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Page not found
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            We couldn&rsquo;t find the page you were looking for. It may have
            moved, or the link might be broken.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/browse"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-semibold text-background shadow-sm transition-colors hover:bg-foreground/90"
            >
              Back home
            </Link>
            <Link
              href="/browse"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-foreground/30"
            >
              Browse listings
            </Link>
          </div>

          <p className="mt-10 text-xs text-muted-foreground">
            Need help? Email{" "}
            <a
              href="mailto:hello@trustead.app"
              className="font-semibold text-foreground underline underline-offset-2 hover:text-brand"
            >
              hello@trustead.app
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

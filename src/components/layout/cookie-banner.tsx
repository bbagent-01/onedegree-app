"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent-v1";

/**
 * Non-blocking alpha cookie notice. Not a full GDPR manager — we're not
 * collecting EU users during beta (see Privacy Policy §5). Suppressed on
 * the legal pages themselves so the overlay doesn't cover the content
 * someone is trying to read.
 */
const SUPPRESS_ON = new Set(["/terms", "/privacy", "/legal-status"]);

export function CookieBanner() {
  const pathname = usePathname() || "";
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setDismissed(stored === "true");
    } catch {
      // localStorage unavailable (private mode on some browsers) —
      // treat as dismissed so we don't nag on every page.
      setDismissed(true);
    }
  }, []);

  if (dismissed === null || dismissed) return null;
  if (SUPPRESS_ON.has(pathname)) return null;

  const accept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6 sm:pb-6"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-background/95 p-4 shadow-modal backdrop-blur sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <p className="flex-1 text-sm leading-relaxed text-foreground">
          We use cookies to keep you signed in, remember preferences, and
          measure Platform usage. We do not use third-party advertising
          cookies. By continuing to use Trustead, you agree to our use of
          cookies.{" "}
          <Link
            href="/privacy"
            className="font-semibold underline underline-offset-2 hover:text-brand"
          >
            Learn more
          </Link>
        </p>
        <button
          type="button"
          onClick={accept}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-semibold text-background shadow-sm transition-colors hover:bg-foreground/90"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

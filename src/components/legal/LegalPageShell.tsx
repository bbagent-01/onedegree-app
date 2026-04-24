"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface LegalTocItem {
  /** Target element id, without the leading # */
  id: string;
  /** Short label shown in the TOC */
  label: string;
}

interface LegalPageShellProps {
  title: string;
  /** Effective date — displayed verbatim (e.g. "April 25, 2026"). */
  effectiveDate: string;
  /** Last-updated date — displayed verbatim. */
  lastUpdated: string;
  /** Optional sticky TOC entries. If omitted, no TOC column renders. */
  toc?: LegalTocItem[];
  children: React.ReactNode;
}

/**
 * Shell for public legal pages (/terms, /privacy, /legal-status).
 * - 780px max-width content column
 * - Alpha banner + page title block
 * - Optional sticky right-column TOC on desktop (JS scroll, not anchor href)
 */
export function LegalPageShell({
  title,
  effectiveDate,
  lastUpdated,
  toc,
  children,
}: LegalPageShellProps) {
  const hasToc = (toc?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-surface-alt">
      {/* Minimal top bar so legal pages aren't chromeless when visited
          directly, without pulling in the full app shell. */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-4">
          <Link
            href="/browse"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            1&deg; B&amp;B
          </Link>
          <Link
            href="/browse"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to app
          </Link>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto w-full px-4 py-10 lg:py-14",
          hasToc ? "max-w-[1200px]" : "max-w-[780px]"
        )}
      >
        <div
          className={cn(
            hasToc &&
              "lg:grid lg:grid-cols-[minmax(0,780px)_minmax(0,240px)] lg:gap-10"
          )}
        >
          <article className="w-full max-w-[780px]">
            <AlphaBanner />

            <header className="mt-8">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {title}
              </h1>
              <p className="mt-3 font-mono text-xs uppercase tracking-wider text-subtle">
                Effective: {effectiveDate} · Last updated: {lastUpdated}
              </p>
            </header>

            <div className="legal-prose mt-8">{children}</div>

            {/* Bottom spacer so the last TOC section can always scroll
                flush to the top of the viewport. Without it the page
                runs out of scrollable height before §N reaches the
                80px rootMargin zone, so IntersectionObserver never
                promotes the last section to active and the scroll-to
                anchor lands short. Only rendered when a TOC is present
                (non-TOC pages don't need the headroom). */}
            {hasToc && <div aria-hidden="true" className="min-h-[60vh]" />}

            <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
              <p>
                Questions? Email{" "}
                <a
                  href="mailto:hello@staytrustead.com"
                  className="font-semibold text-foreground underline underline-offset-2 hover:text-brand"
                >
                  hello@staytrustead.com
                </a>
                . Loren Polster LLC DBA Trustead · NY DOS ID 5908355 · 367 St
                Marks Ave #1087, Brooklyn, NY 11238.
              </p>
            </footer>
          </article>

          {hasToc && <StickyToc items={toc!} />}
        </div>
      </div>
    </div>
  );
}

function AlphaBanner() {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning-100 px-4 py-3 text-sm text-amber-900">
      <strong className="font-semibold">Alpha draft</strong> — effective April
      25, 2026. These terms apply during our free beta. Contact{" "}
      <a
        href="mailto:hello@staytrustead.com"
        className="font-semibold underline underline-offset-2"
      >
        hello@staytrustead.com
      </a>{" "}
      with questions.
    </div>
  );
}

function StickyToc({ items }: { items: LegalTocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Observe sections to highlight the active TOC entry as the reader scrolls.
  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        visible.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
        );
        setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 72;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveId(id);
  };

  return (
    <aside className="hidden lg:block" aria-label="Table of contents">
      <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-subtle">
          On this page
        </p>
        <ul className="mt-3 space-y-1.5 border-l border-border pl-3 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "block w-full cursor-pointer text-left text-muted-foreground transition-colors hover:text-foreground",
                  activeId === item.id &&
                    "font-semibold text-foreground"
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

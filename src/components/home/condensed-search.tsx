"use client";

// Condensed search row — ports the locked home-v4 search pill into
// the live home page. Visually mirrors the locked design (Travel /
// Host segmented pill on the left + Where / When / Who tri-pill in
// the middle + Filters button on the right). Functionally:
//   - Travel: typing in "Where" or hitting search routes to
//     /browse?location=…&from=…&to=…&guests=… so the existing
//     /browse query handles the actual search. No new endpoint.
//   - Host: visually present (preserves the locked toggle) but
//     non-functional — there is no host-side search query in the
//     live app yet. Tooltip flags this so reviewers don't expect
//     it to work.
//
// When/Who deliberately delegate to /browse instead of mounting
// inline date and guest popovers — that path already has the
// rich popovers, and home-v4's primary affordance is the Where
// input.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

export function CondensedSearch() {
  const router = useRouter();
  const [mode, setMode] = useState<"travel" | "host">("travel");
  const [where, setWhere] = useState("");

  const submit = () => {
    if (mode !== "travel") return;
    const params = new URLSearchParams();
    if (where.trim()) params.set("location", where.trim());
    const qs = params.toString();
    router.push(qs ? `/browse?${qs}` : "/browse");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="mx-auto mt-8 flex w-full max-w-[1280px] flex-wrap items-center justify-center gap-3">
      <div className="flex h-[68px] shrink-0 items-center gap-1 rounded-full border border-border bg-card/40 p-2">
        <button
          type="button"
          onClick={() => setMode("travel")}
          className={
            mode === "travel"
              ? "inline-flex h-[52px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground"
              : "inline-flex h-[52px] items-center rounded-full px-5 text-sm font-medium text-foreground/80 hover:bg-card/60 hover:text-foreground"
          }
          aria-pressed={mode === "travel"}
        >
          Travel
        </button>
        <button
          type="button"
          onClick={() => setMode("host")}
          title="Host search coming soon"
          className={
            mode === "host"
              ? "inline-flex h-[52px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground"
              : "inline-flex h-[52px] items-center rounded-full px-5 text-sm font-medium text-foreground/80 hover:bg-card/60 hover:text-foreground"
          }
          aria-pressed={mode === "host"}
        >
          Host
        </button>
      </div>

      <div className="flex h-[68px] min-w-0 max-w-[820px] flex-1 items-stretch rounded-full border border-border bg-card/40">
        <div className="flex min-w-0 flex-1 flex-col justify-center pl-6 pr-4 text-left">
          <label
            htmlFor="home-search-where"
            className="text-[11px] font-bold leading-tight text-foreground"
          >
            Where
          </label>
          <input
            id="home-search-where"
            type="text"
            placeholder={
              mode === "travel" ? "Search destinations" : "Coming soon"
            }
            value={where}
            disabled={mode !== "travel"}
            onChange={(e) => setWhere(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent text-sm leading-tight text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
        </div>

        <span className="w-px self-stretch bg-border" aria-hidden />

        <button
          type="button"
          onClick={() => router.push("/browse")}
          className="flex shrink-0 flex-col justify-center px-6 text-left transition-colors hover:bg-card/60"
          aria-label="Pick dates on browse"
        >
          <span className="text-[11px] font-bold leading-tight text-foreground">
            When
          </span>
          <span className="text-sm leading-tight text-muted-foreground">
            Any week
          </span>
        </button>

        <span className="w-px self-stretch bg-border" aria-hidden />

        <div className="flex shrink-0 items-center pl-6 pr-2">
          <button
            type="button"
            onClick={() => router.push("/browse")}
            className="mr-3 text-left transition-colors hover:opacity-80"
            aria-label="Pick guests on browse"
          >
            <span className="block text-[11px] font-bold leading-tight text-foreground">
              Who
            </span>
            <span className="block text-sm leading-tight text-muted-foreground">
              Add guests
            </span>
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={mode !== "travel"}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-brand text-brand-foreground transition-colors hover:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/browse")}
        className="inline-flex h-[68px] shrink-0 items-center gap-2 rounded-full border border-border bg-card/40 px-6 text-sm font-medium text-foreground hover:bg-card/60"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </button>
    </div>
  );
}

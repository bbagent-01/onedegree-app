"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Search, Send, Phone, Link2 } from "lucide-react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserRow {
  id: string;
  name: string;
  avatar_url: string | null;
  last_messaged_at?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  proposalTitle: string;
  kindLabel: "Trip Wish" | "Host Offer";
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  const sec = Math.max(0, Math.round(diffMs / 1000));
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(d / 365)}y ago`;
}

export function ShareToFriendModal({
  open,
  onOpenChange,
  proposalId,
  proposalTitle,
  kindLabel,
}: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recents, setRecents] = useState<UserRow[]>([]);
  const [results, setResults] = useState<UserRow[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [openingThread, setOpeningThread] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state on close so a re-open starts clean (no stale results
  // from a previous proposal).
  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setResults([]);
      setOpeningThread(null);
    }
  }, [open]);

  // Load recent contacts on open. The default list is "people you've
  // DM'd" sorted by recency — the spec's primary ranking signal.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingRecents(true);
    fetch("/api/dm/recent-contacts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: UserRow[]) => {
        if (!cancelled) setRecents(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setRecents([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Debounce the search input so we don't hammer the API on every
  // keystroke. 200ms feels responsive without firing on partial-word
  // typing.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoadingSearch(true);
    fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: UserRow[]) => {
        if (!cancelled) setResults(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSearch(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  // Show recents when search is empty; show results when typing.
  // Filter recents in-place for sub-2-char queries so the user can
  // narrow down without waiting for the API.
  const list = useMemo<UserRow[]>(() => {
    if (debouncedQuery.length >= 2) return results;
    if (query.trim().length === 0) return recents;
    const needle = query.trim().toLowerCase();
    return recents.filter((u) => u.name.toLowerCase().includes(needle));
  }, [debouncedQuery, query, recents, results]);

  // Phone-invite fallback: when the search looks like a phone number
  // and we got zero matches, offer to invite that number.
  const phoneFallback = useMemo(() => {
    if (debouncedQuery.length < 4) return null;
    if (results.length > 0) return null;
    const parsed = parsePhoneNumberFromString(debouncedQuery, "US");
    if (!parsed?.isValid()) return null;
    return {
      e164: parsed.format("E.164"),
      display: parsed.formatNational(),
    };
  }, [debouncedQuery, results]);

  const proposalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/proposals/${proposalId}`
      : `/proposals/${proposalId}`;

  const buildPrefill = () =>
    `Check out this ${kindLabel}: ${proposalTitle}. Might be a good fit for you. ${proposalUrl}`;

  const pickRecipient = async (user: UserRow) => {
    if (openingThread) return;
    setOpeningThread(user.id);
    try {
      const res = await fetch("/api/dm/open-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Intentionally NOT passing proposalId — the recipient is not
        // the proposal author, so origin_proposal_id (which drives the
        // Send-terms bridge) doesn't apply. This is a plain DM that
        // happens to contain a proposal link.
        body: JSON.stringify({ otherUserId: user.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        threadId?: string;
        error?: string;
      };
      if (!res.ok || !data.threadId) {
        toast.error(data.error || "Couldn't open conversation");
        setOpeningThread(null);
        return;
      }
      const url = `/inbox/${data.threadId}?prefill=${encodeURIComponent(
        buildPrefill()
      )}`;
      onOpenChange(false);
      router.push(url);
    } catch {
      toast.error("Network error");
      setOpeningThread(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(proposalUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const content = (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or phone"
          className="h-12 w-full rounded-xl border-2 border-border !bg-white pl-10 pr-4 text-sm font-medium shadow-sm placeholder:text-muted-foreground/60 focus:border-brand focus:outline-none"
        />
      </div>

      <div className="-mx-1 max-h-[360px] overflow-y-auto">
        {(loadingRecents && list.length === 0) || loadingSearch ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingSearch ? "Searching…" : "Loading…"}
          </div>
        ) : list.length === 0 && !phoneFallback ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            {debouncedQuery.length >= 2
              ? `No people matched "${debouncedQuery}".`
              : "You haven't messaged anyone yet. Search by name above to share."}
          </div>
        ) : (
          <ul className="space-y-1">
            {list.map((user) => {
              const rel = relativeTime(user.last_messaged_at);
              const busy = openingThread === user.id;
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => pickRecipient(user)}
                    disabled={!!openingThread}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50 disabled:opacity-60"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      {user.avatar_url && (
                        <AvatarImage src={user.avatar_url} alt={user.name} />
                      )}
                      <AvatarFallback>{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {user.name}
                      </div>
                      {rel && (
                        <div className="truncate text-xs text-muted-foreground">
                          messaged {rel}
                        </div>
                      )}
                    </div>
                    {busy ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                      <Send className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {phoneFallback && (
          <Link
            href={`/invite?phone=${encodeURIComponent(phoneFallback.e164)}`}
            onClick={() => onOpenChange(false)}
            className="mt-2 flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-3 text-left transition-colors hover:bg-muted/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Phone className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                Invite {phoneFallback.display} to Trustead
              </div>
              <div className="truncate text-xs text-muted-foreground">
                They&rsquo;ll see this {kindLabel.toLowerCase()} once they join.
              </div>
            </div>
            <Send className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        )}
      </div>

      <div className="-mx-4 -mb-4 flex items-center justify-between rounded-b-xl border-t bg-muted/40 px-4 py-3">
        <span className="text-xs text-muted-foreground">
          Or share the link directly
        </span>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold hover:bg-muted"
        >
          <Link2 className="h-3.5 w-3.5" />
          Copy link
        </button>
      </div>
    </div>
  );

  const title = "Share with a friend";
  const subtitle = `Send "${proposalTitle}" to someone who might be interested.`;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-5">
        <SheetHeader className="p-0 pb-3">
          <SheetTitle>{title}</SheetTitle>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}

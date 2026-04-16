"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VouchModal } from "@/components/trust/vouch-modal";
import { Search, Shield, UserCheck, Users, UserPlus } from "lucide-react";

const BIG_INPUT =
  "h-14 rounded-xl border-2 border-border !bg-white px-4 text-base font-medium shadow-sm focus-visible:border-brand";

interface SearchResult {
  id: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  already_vouched: boolean;
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

export default function VouchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Vouch modal state
  const [vouchTarget, setVouchTarget] = useState<SearchResult | null>(null);
  const [vouchOpen, setVouchOpen] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // silently fail
    } finally {
      setSearching(false);
      setHasSearched(true);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, doSearch]);

  const handleVouchClick = (user: SearchResult) => {
    setVouchTarget(user);
    setVouchOpen(true);
  };

  const handleVouchSaved = () => {
    if (vouchTarget) {
      setResults((prev) =>
        prev.map((r) =>
          r.id === vouchTarget.id ? { ...r, already_vouched: true } : r
        )
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-8 md:px-6 md:py-12">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Shield className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold md:text-3xl">
          Vouch for someone
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Search by name or email. If they&rsquo;re not on 1&deg; B&B yet, you
          can invite them.
        </p>
      </div>

      <div className="relative mt-8">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className={`${BIG_INPUT} pl-11`}
        />
      </div>

      {/* Results */}
      <div className="mt-4">
        {searching && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        )}

        {!searching && hasSearched && results.length === 0 && (
          <div className="py-10 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No members found for &ldquo;{query}&rdquo;
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              They might not be on 1&deg; B&B yet. Invite them to join!
            </p>
            <Link href="/invite">
              <Button size="lg" className="mt-4 gap-1.5">
                <UserPlus className="h-4 w-4" />
                Invite them to 1&deg; B&B
              </Button>
            </Link>
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="divide-y divide-border rounded-xl border border-border bg-white">
            {results.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <Link href={`/profile/${user.id}`}>
                  <Avatar className="h-10 w-10 ring-2 ring-transparent hover:ring-brand/30 transition-all cursor-pointer">
                    {user.avatar_url && (
                      <AvatarImage src={user.avatar_url} alt={user.name} />
                    )}
                    <AvatarFallback className="text-xs">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${user.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {user.name}
                  </Link>
                  {(user.phone_number || user.email) && (
                    <div className="truncate text-xs text-muted-foreground">
                      {user.phone_number && user.email
                        ? `${user.phone_number} · ${user.email}`
                        : user.phone_number || user.email}
                    </div>
                  )}
                </div>
                {user.already_vouched ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVouchClick(user)}
                    className="shrink-0"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Update vouch
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleVouchClick(user)}
                    className="shrink-0"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Vouch
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Always show invite link at the bottom when there are results too */}
        {!searching && hasSearched && results.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Don&rsquo;t see who you&rsquo;re looking for?
            </p>
            <Link
              href="/invite"
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite them to join
            </Link>
          </div>
        )}
      </div>

      {/* Vouch modal */}
      {vouchTarget && (
        <VouchModal
          open={vouchOpen}
          onOpenChange={setVouchOpen}
          target={{
            id: vouchTarget.id,
            name: vouchTarget.name,
            avatar_url: vouchTarget.avatar_url,
          }}
          existingVouch={vouchTarget.already_vouched ? undefined : null}
          onVouchSaved={handleVouchSaved}
          onVouchRemoved={() => {
            if (vouchTarget) {
              setResults((prev) =>
                prev.map((r) =>
                  r.id === vouchTarget.id
                    ? { ...r, already_vouched: false }
                    : r
                )
              );
            }
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, UserCheck, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VouchModal } from "@/components/vouch/VouchModal";

interface UserRow {
  id: string;
  clerk_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  already_vouched: boolean;
}

export default function VouchPage() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [modalTarget, setModalTarget] = useState<UserRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Search users via API route
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setUsers([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search-as-you-type (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) {
      setUsers([]);
      setHasSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, doSearch]);

  // After a successful vouch, refresh search results to update vouched state
  function handleVouchSuccess(targetName: string, points: number) {
    setModalTarget(null);
    setToast(`You vouched for ${targetName} · ${points} pts`);
    // Refresh results
    doSearch(search);
  }

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="font-sans text-2xl font-semibold text-foreground mb-1">
            Vouch for Someone
          </h1>
          <p className="text-foreground-secondary text-sm">
            Search for a member to vouch for them. Temporary test page — will be
            integrated into profiles in CC-6d.
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full rounded-lg border border-border bg-white pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-foreground-tertiary" />
            )}
          </div>
        </div>

        {/* Results */}
        {users.length > 0 && (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={u.name}
                      className="size-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-9 rounded-full bg-primary-light flex items-center justify-center text-primary font-medium text-sm">
                      {u.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {u.name}
                    </p>
                    <p className="text-xs text-foreground-tertiary">{u.email}</p>
                  </div>
                </div>
                {u.already_vouched ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModalTarget(u)}
                  >
                    <Pencil className="size-3.5 mr-1" />
                    Update
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setModalTarget(u)}>
                    <UserCheck className="size-3.5 mr-1" />
                    Vouch
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {users.length === 0 && hasSearched && !searching && (
          <p className="text-sm text-foreground-tertiary text-center py-8">
            No members found for &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {/* Modal */}
      {modalTarget && (
        <VouchModal
          targetUserId={modalTarget.id}
          targetName={modalTarget.name}
          onClose={() => setModalTarget(null)}
          onSuccess={(points) =>
            handleVouchSuccess(modalTarget.name, points)
          }
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-3 shadow-lg">
            <UserCheck className="size-4 text-trust-solid" />
            <span className="text-sm font-medium text-foreground">{toast}</span>
          </div>
        </div>
      )}
    </main>
  );
}

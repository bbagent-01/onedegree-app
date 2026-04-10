"use client";

import { useState, useEffect } from "react";
import { Search, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VouchModal } from "@/components/vouch/VouchModal";

interface UserRow {
  id: string;
  clerk_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export default function VouchPage() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [modalTarget, setModalTarget] = useState<UserRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Search users via API route
  async function handleSearch() {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setSearching(false);
    }
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
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Vouch for Someone
          </h1>
          <p className="text-foreground-secondary text-sm">
            Search for a member to vouch for them. Temporary test page — will be
            integrated into profiles in CC-6d.
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by name…"
              className="w-full rounded-lg border border-border bg-white pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <Button onClick={handleSearch} disabled={searching || !search.trim()}>
            {searching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
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
                <Button
                  size="sm"
                  onClick={() => setModalTarget(u)}
                >
                  <UserCheck className="size-3.5 mr-1" />
                  Vouch
                </Button>
              </div>
            ))}
          </div>
        )}

        {users.length === 0 && search && !searching && (
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
          onSuccess={(points) => {
            setModalTarget(null);
            setToast(`You vouched for ${modalTarget.name} · ${points} pts`);
          }}
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

// REMOVE BEFORE BETA — see CC-Dev1 recap. All files in
// src/lib/impersonation/, src/components/admin/Impersonation*.tsx, and
// src/app/api/admin/impersonate/ delete together. Env vars IMPERSONATION_*
// and the impersonation_log table + is_test_user column must also be removed.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserRound, Search, X, Loader2, Plus } from "lucide-react";

interface TestUserRow {
  id: string;
  name: string;
  avatar_url: string | null;
  phone_last4: string | null;
  one_degree_score: number;
  tags: string[];
}

interface Props {
  realUserName: string;
  currentName: string;
  isImpersonating: boolean;
}

/**
 * Floating switcher pill + modal. Only mounted on the server when
 * gates pass, so the bundle shipped to non-admins never includes
 * this code.
 */
export function ImpersonationSwitcher({
  realUserName,
  currentName,
  isImpersonating,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<TestUserRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [spawnName, setSpawnName] = useState("");
  const [spawning, setSpawning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/impersonate/list", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`list failed: ${res.status}`);
      const json = (await res.json()) as { users: TestUserRow[] };
      setUsers(json.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !users) {
      void loadUsers();
    }
  }, [open, users, loadUsers]);

  const tags = useMemo(() => {
    const s = new Set<string>();
    (users ?? []).forEach((u) => u.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [users]);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (activeTag && !u.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        (u.phone_last4 ?? "").includes(q) ||
        String(u.one_degree_score).includes(q)
      );
    });
  }, [users, query, activeTag]);

  const pickUser = useCallback(async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/impersonate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `start failed: ${res.status}`);
      }
      // Full reload picks up new identity everywhere (navbar, browse,
      // server components). Simpler than threading revalidation
      // through every surface.
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setBusyId(null);
    }
  }, []);

  const stopImpersonation = useCallback(async () => {
    setBusyId("__stop__");
    setError(null);
    try {
      const res = await fetch("/api/admin/impersonate/stop", {
        method: "POST",
      });
      if (!res.ok) throw new Error(`stop failed: ${res.status}`);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setBusyId(null);
    }
  }, []);

  const spawn = useCallback(async () => {
    const name = spawnName.trim();
    if (!name) return;
    setSpawning(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/impersonate/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `spawn failed: ${res.status}`);
      }
      setSpawnName("");
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSpawning(false);
    }
  }, [spawnName, loadUsers]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-4 right-4 z-[80] flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition ${
          isImpersonating
            ? "bg-purple-600 text-white hover:bg-purple-700"
            : "bg-white text-zinc-900 ring-1 ring-zinc-300 hover:ring-zinc-400"
        }`}
        aria-label="Open impersonation switcher"
      >
        <UserRound className="h-4 w-4" />
        <span className="max-w-[180px] truncate">
          {isImpersonating
            ? `Impersonating: ${currentName}`
            : `Real: ${realUserName}`}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Impersonation switcher
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Signed in as {realUserName}. Alpha dev tool only.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isImpersonating && (
              <div className="border-b border-zinc-200 bg-purple-50 px-5 py-3">
                <button
                  type="button"
                  onClick={stopImpersonation}
                  disabled={busyId === "__stop__"}
                  className="w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
                >
                  {busyId === "__stop__"
                    ? "Returning…"
                    : `← Return to real user (${realUserName})`}
                </button>
              </div>
            )}

            <div className="border-b border-zinc-200 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, phone last-4, or score…"
                  className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-sm focus:border-zinc-500 focus:outline-none"
                />
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTag(null)}
                    className={`rounded-full px-2.5 py-0.5 text-xs ${
                      activeTag === null
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    All
                  </button>
                  {tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveTag(t === activeTag ? null : t)}
                      className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${
                        activeTag === t
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-2 py-2">
              {loading && (
                <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading test users…
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="py-8 text-center text-sm text-zinc-500">
                  No test users match this filter.
                </div>
              )}
              {!loading &&
                filtered.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => pickUser(u.id)}
                    disabled={busyId === u.id}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-50 disabled:opacity-60"
                  >
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.avatar_url}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-700">
                        {u.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-zinc-900">
                        {u.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>1° {Math.round(u.one_degree_score)}</span>
                        {u.phone_last4 && <span>····{u.phone_last4}</span>}
                        {u.tags.length > 0 && (
                          <span className="capitalize">{u.tags.join(" · ")}</span>
                        )}
                      </div>
                    </div>
                    {busyId === u.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                    )}
                  </button>
                ))}
            </div>

            <div className="border-t border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Spawn new test user
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={spawnName}
                  onChange={(e) => setSpawnName(e.target.value)}
                  placeholder="Name (e.g. Test A)"
                  className="h-10 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm focus:border-zinc-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={spawn}
                  disabled={spawning || !spawnName.trim()}
                  className="inline-flex h-10 items-center gap-1 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {spawning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Spawn
                </button>
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                Auto-assigns a +15555550XXX test phone. DB-only user — never
                reachable via sign-in.
              </p>
            </div>

            {error && (
              <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

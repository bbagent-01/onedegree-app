"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Loader2,
  Pause,
  Play,
  Plus,
  Trash2,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AlertRow {
  id: string;
  kind: "trip_wish" | "host_offer" | "either";
  destinations: string[];
  start_window: string | null;
  end_window: string | null;
  delivery: "email" | "sms" | "both";
  status: "active" | "paused";
  created_at: string;
  last_notified_at: string | null;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 45) return "just now";
  if (diffSec < 90) return "1 minute ago";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffMin < 90) return "1 hour ago";
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hours ago`;
  if (diffHr < 36) return "yesterday";
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffDay < 14) return "1 week ago";
  if (diffDay < 30) return `${Math.round(diffDay / 7)} weeks ago`;
  if (diffDay < 60) return "1 month ago";
  if (diffDay < 365) return `${Math.round(diffDay / 30)} months ago`;
  return new Date(iso).toLocaleDateString();
}

interface Props {
  initialAlerts: AlertRow[];
  prefillKind?: "trip_wish" | "host_offer" | "either";
  prefillDestinations?: string[];
}

const fieldCls =
  "h-12 rounded-lg border-2 border-border !bg-white px-3 text-sm font-medium shadow-sm focus:border-foreground/60 focus:outline-none";

export function AlertsManager({
  initialAlerts,
  prefillKind,
  prefillDestinations,
}: Props) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertRow[]>(initialAlerts);
  const [showCreate, setShowCreate] = useState(
    Boolean(prefillKind || (prefillDestinations?.length ?? 0) > 0)
  );

  const [kind, setKind] = useState<"trip_wish" | "host_offer" | "either">(
    prefillKind ?? "either"
  );
  const [destinations, setDestinations] = useState<string[]>(
    prefillDestinations ?? []
  );
  const [destInput, setDestInput] = useState("");
  const [startWindow, setStartWindow] = useState("");
  const [endWindow, setEndWindow] = useState("");
  const [delivery, setDelivery] = useState<"email" | "sms" | "both">("email");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AlertRow | null>(null);

  const addDest = (raw: string) => {
    const v = raw.trim();
    if (!v || destinations.includes(v) || destinations.length >= 20) return;
    setDestinations([...destinations, v]);
    setDestInput("");
  };

  const create = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const payload = {
        kind,
        destinations,
        start_window: startWindow || null,
        end_window: endWindow || null,
        delivery,
      };
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (!res.ok || !data.id) {
        toast.error(data.error || "Couldn't create alert");
        return;
      }
      // Optimistically prepend the new alert so the list updates without
      // waiting on a re-fetch. router.refresh() runs in parallel so
      // server-derived fields (created_at) can replace our local stub.
      const optimistic: AlertRow = {
        id: data.id,
        kind: payload.kind,
        destinations: payload.destinations,
        start_window: payload.start_window,
        end_window: payload.end_window,
        delivery: payload.delivery,
        status: "active",
        created_at: new Date().toISOString(),
        last_notified_at: null,
      };
      setAlerts((prev) => [optimistic, ...prev]);
      toast.success("Alert created");
      setShowCreate(false);
      setDestinations([]);
      setDestInput("");
      setStartWindow("");
      setEndWindow("");
      router.refresh();
    } finally {
      setCreating(false);
    }
  };

  const togglePause = async (a: AlertRow) => {
    if (busyId) return;
    setBusyId(a.id);
    try {
      const next = a.status === "active" ? "paused" : "active";
      const res = await fetch(`/api/alerts/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        toast.error("Couldn't update");
        return;
      }
      setAlerts((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, status: next } : x))
      );
    } finally {
      setBusyId(null);
    }
  };

  const requestDelete = (a: AlertRow) => {
    if (busyId) return;
    setConfirmDelete(a);
  };

  const confirmDeleteNow = async () => {
    const a = confirmDelete;
    if (!a) return;
    setBusyId(a.id);
    try {
      const res = await fetch(`/api/alerts/${a.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Couldn't delete");
        return;
      }
      setAlerts((prev) => prev.filter((x) => x.id !== a.id));
      setConfirmDelete(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {!showCreate ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90"
        >
          <Plus className="h-4 w-4" />
          Create alert
        </button>
      ) : (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-base font-semibold">New alert</div>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <Field label="What to watch">
              <div className="flex flex-wrap gap-2">
                <Chip
                  active={kind === "either"}
                  label="Both"
                  onClick={() => setKind("either")}
                />
                <Chip
                  active={kind === "trip_wish"}
                  label="Trip Wishes"
                  onClick={() => setKind("trip_wish")}
                />
                <Chip
                  active={kind === "host_offer"}
                  label="Host Offers"
                  onClick={() => setKind("host_offer")}
                />
              </div>
            </Field>

            <Field label="Destinations" hint="Up to 20. Partial matches count.">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className={`${fieldCls} flex-1`}
                    value={destInput}
                    onChange={(e) => setDestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addDest(destInput);
                      }
                    }}
                    placeholder="e.g. Paris, anywhere warm"
                  />
                  <button
                    type="button"
                    onClick={() => addDest(destInput)}
                    className="inline-flex h-12 items-center gap-1 rounded-lg border-2 border-border bg-white px-3 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                    disabled={
                      !destInput.trim() || destinations.length >= 20
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
                {destinations.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {destinations.map((d) => (
                      <li
                        key={d}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium"
                      >
                        {d}
                        <button
                          type="button"
                          onClick={() =>
                            setDestinations(
                              destinations.filter((x) => x !== d)
                            )
                          }
                          aria-label={`Remove ${d}`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Window start (optional)">
                <input
                  type="date"
                  className={`${fieldCls} w-full`}
                  value={startWindow}
                  onChange={(e) => setStartWindow(e.target.value)}
                />
              </Field>
              <Field label="Window end (optional)">
                <input
                  type="date"
                  className={`${fieldCls} w-full`}
                  value={endWindow}
                  onChange={(e) => setEndWindow(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Delivery">
              <div className="flex flex-wrap gap-2">
                <Chip
                  active={delivery === "email"}
                  label="Email"
                  onClick={() => setDelivery("email")}
                />
                <Chip
                  active={delivery === "sms"}
                  label="SMS"
                  onClick={() => setDelivery("sms")}
                />
                <Chip
                  active={delivery === "both"}
                  label="Both"
                  onClick={() => setDelivery("both")}
                />
              </div>
            </Field>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={create}
                disabled={creating}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-60"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Save alert
              </button>
            </div>
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center">
          <BellRing className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No alerts yet. Create one to get notified about new proposals
            in your network.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {a.kind === "either"
                      ? "Both"
                      : a.kind === "trip_wish"
                        ? "Trip Wishes"
                        : "Host Offers"}
                  </span>
                  <span
                    className={
                      a.status === "active"
                        ? "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900"
                        : "inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-800"
                    }
                  >
                    {a.status === "active" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Pause className="h-3 w-3" />
                    )}
                    {a.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    via {a.delivery}
                  </span>
                </div>
                <div className="mt-2 text-sm text-foreground">
                  {a.destinations.length > 0
                    ? a.destinations.join(" · ")
                    : "Anywhere"}
                </div>
                {(a.start_window || a.end_window) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {a.start_window ?? "…"} – {a.end_window ?? "…"}
                  </div>
                )}
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {a.last_notified_at ? (
                    <>
                      Last notified{" "}
                      <span title={a.last_notified_at}>
                        {formatRelative(a.last_notified_at)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground/70">
                      Last notified: Never
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => togglePause(a)}
                  disabled={busyId === a.id}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-white px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60"
                >
                  {a.status === "active" ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Resume
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(a)}
                  disabled={busyId === a.id}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this alert?</DialogTitle>
            <DialogDescription>
              You won&apos;t be notified about new proposals that match
              {confirmDelete && confirmDelete.destinations.length > 0
                ? ` "${confirmDelete.destinations.join(", ")}"`
                : " these criteria"}{" "}
              again. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              disabled={busyId !== null}
              className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteNow}
              disabled={busyId !== null}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
            >
              {busyId !== null && <Loader2 className="h-4 w-4 animate-spin" />}
              <Trash2 className="h-4 w-4" />
              Delete alert
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex h-9 items-center rounded-full bg-foreground px-3 text-xs font-semibold text-background"
          : "inline-flex h-9 items-center rounded-full border border-border bg-white px-3 text-xs font-medium hover:bg-muted"
      }
    >
      {label}
    </button>
  );
}

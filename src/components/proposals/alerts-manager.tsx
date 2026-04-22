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
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          destinations,
          start_window: startWindow || null,
          end_window: endWindow || null,
          delivery,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error || "Couldn't create alert");
        return;
      }
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

  const del = async (a: AlertRow) => {
    if (busyId) return;
    if (!confirm("Delete this alert?")) return;
    setBusyId(a.id);
    try {
      const res = await fetch(`/api/alerts/${a.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Couldn't delete");
        return;
      }
      setAlerts((prev) => prev.filter((x) => x.id !== a.id));
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
                {a.last_notified_at && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Last notified{" "}
                    {new Date(a.last_notified_at).toLocaleDateString()}
                  </div>
                )}
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
                  onClick={() => del(a)}
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

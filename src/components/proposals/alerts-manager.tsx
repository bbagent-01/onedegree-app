"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

/**
 * /alerts CRUD surface. Kept intentionally minimal — plain inputs + a
 * flat list — because every client-bundled kB moves the whole Cloudflare
 * Worker closer to the 3 MiB cap. Fancier UI (animated chips, calendars)
 * can come back once bundle headroom allows.
 */
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
  const [destText, setDestText] = useState(
    (prefillDestinations ?? []).join(", ")
  );
  const [startWindow, setStartWindow] = useState("");
  const [endWindow, setEndWindow] = useState("");
  const [delivery, setDelivery] = useState<"email" | "sms" | "both">("email");
  const [busy, setBusy] = useState(false);

  const splitDests = (s: string) =>
    s
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean)
      .slice(0, 20);

  const create = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          destinations: splitDests(destText),
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
      setDestText("");
      setStartWindow("");
      setEndWindow("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, patchBody: Partial<AlertRow>) => {
    const res = await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });
    if (!res.ok) toast.error("Couldn't update");
    return res.ok;
  };

  const del = async (id: string) => {
    if (!confirm("Delete this alert?")) return;
    const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Couldn't delete");
      return;
    }
    setAlerts((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="mt-6 space-y-6">
      {!showCreate ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90"
        >
          + Create alert
        </button>
      ) : (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-base font-semibold">New alert</div>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What to watch
              </span>
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as "trip_wish" | "host_offer" | "either")
                }
                className={`${fieldCls} w-full`}
              >
                <option value="either">Both Trip Wishes & Host Offers</option>
                <option value="trip_wish">Trip Wishes only</option>
                <option value="host_offer">Host Offers only</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Destinations (comma-separated, up to 20)
              </span>
              <input
                className={`${fieldCls} w-full`}
                value={destText}
                onChange={(e) => setDestText(e.target.value)}
                placeholder="Paris, anywhere warm, Lisbon"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Window start (optional)
                </span>
                <input
                  type="date"
                  className={`${fieldCls} w-full`}
                  value={startWindow}
                  onChange={(e) => setStartWindow(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Window end (optional)
                </span>
                <input
                  type="date"
                  className={`${fieldCls} w-full`}
                  value={endWindow}
                  onChange={(e) => setEndWindow(e.target.value)}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Delivery
              </span>
              <select
                value={delivery}
                onChange={(e) =>
                  setDelivery(e.target.value as "email" | "sms" | "both")
                }
                className={`${fieldCls} w-full`}
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="both">Both</option>
              </select>
            </label>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={create}
                disabled={busy}
                className="inline-flex h-11 items-center rounded-lg bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save alert"}
              </button>
            </div>
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-muted-foreground">
          No alerts yet. Create one to get notified about new proposals
          in your network.
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-muted/50 px-2 py-0.5 font-semibold uppercase tracking-wide">
                    {a.kind === "either"
                      ? "Both"
                      : a.kind === "trip_wish"
                        ? "Trip Wishes"
                        : "Host Offers"}
                  </span>
                  <span
                    className={
                      a.status === "active"
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 font-semibold uppercase tracking-wide text-emerald-900"
                        : "rounded-full bg-zinc-200 px-2 py-0.5 font-semibold uppercase tracking-wide text-zinc-800"
                    }
                  >
                    {a.status}
                  </span>
                  <span className="text-muted-foreground">
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
                  onClick={async () => {
                    const next =
                      a.status === "active" ? "paused" : "active";
                    if (await patch(a.id, { status: next })) {
                      setAlerts((prev) =>
                        prev.map((x) =>
                          x.id === a.id ? { ...x, status: next } : x
                        )
                      );
                    }
                  }}
                  className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3 text-xs font-semibold hover:bg-muted"
                >
                  {a.status === "active" ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  onClick={() => del(a.id)}
                  className="inline-flex h-9 items-center rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
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

"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Prefs = {
  booking_request: boolean;
  booking_confirmed: boolean;
  booking_declined: boolean;
  new_message: boolean;
  review_reminder: boolean;
};

const ITEMS: { key: keyof Prefs; title: string; description: string }[] = [
  {
    key: "booking_request",
    title: "New booking request",
    description: "When a guest requests to book your listing.",
  },
  {
    key: "booking_confirmed",
    title: "Booking confirmed",
    description: "When a host accepts your reservation request.",
  },
  {
    key: "booking_declined",
    title: "Booking declined",
    description: "When a host can't host your stay.",
  },
  {
    key: "new_message",
    title: "New messages",
    description: "When someone sends you a message about a stay.",
  },
  {
    key: "review_reminder",
    title: "Review reminders",
    description: "After a stay ends, a nudge to leave a review.",
  },
];

interface Props {
  initialPrefs: Prefs;
}

export function NotificationsForm({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const toggle = async (key: keyof Prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSavingKey(key);
    try {
      const res = await fetch("/api/users/email-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs: { [key]: next[key] } }),
      });
      if (!res.ok) {
        // Roll back
        setPrefs((p) => ({ ...p, [key]: !next[key] }));
        toast.error("Couldn't save");
        return;
      }
      toast.success("Saved");
    } catch {
      setPrefs((p) => ({ ...p, [key]: !next[key] }));
      toast.error("Network error");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-white">
      {ITEMS.map((item) => {
        const enabled = prefs[item.key];
        return (
          <div
            key={item.key}
            className="flex items-center justify-between gap-4 p-4 md:p-5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-semibold">{item.title}</div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle(item.key)}
              disabled={savingKey === item.key}
              role="switch"
              aria-checked={enabled}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                enabled ? "bg-brand" : "bg-zinc-300",
                savingKey === item.key && "opacity-60"
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                  enabled ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}

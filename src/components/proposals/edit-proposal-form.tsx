"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { ProposalRow } from "@/lib/proposals-data";

const fieldCls =
  "h-14 rounded-xl border-2 border-border !bg-white px-4 font-medium shadow-sm focus:border-foreground/60 focus:outline-none";
const textareaCls =
  "min-h-[140px] w-full resize-none rounded-xl border-2 border-border !bg-white px-4 py-3 text-sm font-medium shadow-sm focus:border-foreground/60 focus:outline-none";

/**
 * Minimal edit UI — the fields an author is most likely to tweak after
 * posting: title, description, destinations, flexible_month (trip only),
 * hook details (offer only). kind and listing_id are pinned at create
 * time so the inheritance chain stays consistent; change those by
 * closing + reposting.
 */
export function EditProposalForm({ initial }: { initial: ProposalRow }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [destinations, setDestinations] = useState<string[]>(
    initial.destinations ?? []
  );
  const [destinationInput, setDestinationInput] = useState("");
  const [flexibleMonth, setFlexibleMonth] = useState(
    initial.flexible_month ?? ""
  );
  const [hookDetails, setHookDetails] = useState(initial.hook_details ?? "");
  const [saving, setSaving] = useState(false);

  const titleLen = title.trim().length;
  const descLen = description.trim().length;
  const descTooShort = descLen < 20;
  const canSave =
    !saving && titleLen >= 1 && titleLen <= 120 && !descTooShort;

  const addDestination = (raw: string) => {
    const v = raw.trim();
    if (!v || destinations.includes(v) || destinations.length >= 10) return;
    setDestinations([...destinations, v]);
    setDestinationInput("");
  };

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/proposals/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          destinations,
          flexible_month: flexibleMonth.trim() || null,
          hook_details:
            initial.hook_type !== "none" ? hookDetails.trim() : null,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error || "Update failed");
        return;
      }
      toast.success("Saved");
      router.push(`/proposals/${initial.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 space-y-5">
      <Field label="Title" hint={`${titleLen}/120`}>
        <input
          className={`${fieldCls} w-full text-sm`}
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <Field
        label="Description"
        hint={
          descTooShort
            ? `At least 20 characters (${descLen}/20)`
            : `${descLen}/1000`
        }
      >
        <textarea
          className={`${textareaCls} text-sm`}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <Field label="Destinations">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className={`${fieldCls} flex-1 text-sm`}
              value={destinationInput}
              onChange={(e) => setDestinationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDestination(destinationInput);
                }
              }}
              placeholder="Add a destination"
            />
            <button
              type="button"
              onClick={() => addDestination(destinationInput)}
              className="inline-flex h-14 items-center gap-1 rounded-xl border-2 border-border bg-white px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50"
              disabled={
                !destinationInput.trim() || destinations.length >= 10
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
                      setDestinations(destinations.filter((x) => x !== d))
                    }
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${d}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>

      {initial.kind === "trip_wish" && (
        <Field label="Flexible month">
          <input
            className={`${fieldCls} w-full text-sm`}
            value={flexibleMonth}
            onChange={(e) => setFlexibleMonth(e.target.value)}
            placeholder="e.g. June 2026"
          />
        </Field>
      )}

      {initial.kind === "host_offer" && initial.hook_type !== "none" && (
        <Field label={`${initial.hook_type === "discount" ? "Discount" : "Trade"} details`}>
          <input
            className={`${fieldCls} w-full text-sm`}
            value={hookDetails}
            onChange={(e) => setHookDetails(e.target.value)}
          />
        </Field>
      )}

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={submit}
          disabled={!canSave}
          className="inline-flex h-12 items-center gap-2 rounded-lg bg-foreground px-6 text-sm font-semibold text-background shadow-md hover:bg-foreground/90 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
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

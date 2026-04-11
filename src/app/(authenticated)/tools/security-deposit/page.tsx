"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Check, AlertCircle } from "lucide-react";

export default function SecurityDepositPage() {
  const [listingId, setListingId] = useState("");
  const [amount, setAmount] = useState("");
  const [terms, setTerms] = useState({
    paymentMethod: "",
    refundConditions: "",
    timeline: "",
    additionalTerms: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!listingId) {
      setError("Please enter a listing ID.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/tools/security-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          amount: amount ? Number(amount) : null,
          terms,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-foreground flex items-center gap-2">
          <Shield className="size-6 text-primary" />
          Security Deposit
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Set deposit terms and create an agreement template for your guests.
        </p>
      </div>

      <div>
        <Label className="mb-1.5 block">Listing ID</Label>
        <Input
          placeholder="Paste your listing ID"
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-xs">Deposit Amount ($)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Payment Method</Label>
          <Input
            value={terms.paymentMethod}
            onChange={(e) => setTerms({ ...terms, paymentMethod: e.target.value })}
            placeholder="Venmo, Zelle, or other"
          />
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs">Refund Conditions</Label>
        <Textarea
          value={terms.refundConditions}
          onChange={(e) => setTerms({ ...terms, refundConditions: e.target.value })}
          placeholder="Full refund within 48 hours of checkout if no damage..."
          rows={3}
        />
      </div>

      <div>
        <Label className="mb-1.5 block text-xs">Timeline</Label>
        <Input
          value={terms.timeline}
          onChange={(e) => setTerms({ ...terms, timeline: e.target.value })}
          placeholder="Deposit due 3 days before check-in, refund within 48 hours of checkout"
        />
      </div>

      <div>
        <Label className="mb-1.5 block text-xs">Additional Terms</Label>
        <Textarea
          value={terms.additionalTerms}
          onChange={(e) => setTerms({ ...terms, additionalTerms: e.target.value })}
          rows={2}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || !listingId}>
          {saving ? "Saving..." : "Save Deposit Terms"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-trust-solid">
            <Check className="size-4" />
            Saved
          </span>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <p className="text-sm text-foreground-tertiary">
          Digital signatures and automated refund tracking — coming in Phase 3.
        </p>
      </div>
    </div>
  );
}

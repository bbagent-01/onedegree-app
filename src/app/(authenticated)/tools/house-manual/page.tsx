"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Check, AlertCircle } from "lucide-react";

const SECTIONS = [
  { key: "wifi", label: "WiFi", placeholder: "Network name and password" },
  { key: "keyAccess", label: "Key / Lockbox", placeholder: "How to get in — lockbox code, doorman, etc." },
  { key: "appliances", label: "Appliance Notes", placeholder: "Anything unusual about the washer, thermostat, etc." },
  { key: "neighborhood", label: "Neighborhood Tips", placeholder: "Coffee shops, groceries, restaurants nearby" },
  { key: "emergency", label: "Emergency Contacts", placeholder: "Building super, nearest hospital, your phone number" },
  { key: "checkout", label: "Checkout Instructions", placeholder: "What to do when leaving — trash, keys, etc." },
];

export default function HouseManualPage() {
  const [selectedListing, setSelectedListing] = useState<string>("");
  const [content, setContent] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing manual when listing changes
  useEffect(() => {
    if (!selectedListing) return;
    async function loadManual() {
      try {
        const res = await fetch(`/api/tools/house-manual?listingId=${selectedListing}`);
        if (!res.ok) return;
        const { manual } = await res.json();
        if (manual?.content) {
          setContent(manual.content);
        } else {
          setContent({});
        }
      } catch {
        // ignore
      }
    }
    loadManual();
  }, [selectedListing]);

  async function handleSave() {
    if (!selectedListing) {
      setError("Please select a listing first.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/tools/house-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: selectedListing, content }),
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
          <BookOpen className="size-6 text-primary" />
          House Manual
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Create a digital guide for your guests with everything they need to know.
        </p>
      </div>

      {/* Listing selector */}
      <div>
        <Label className="mb-1.5 block">Select a listing</Label>
        <Input
          placeholder="Paste your listing ID here (from the URL)"
          value={selectedListing}
          onChange={(e) => setSelectedListing(e.target.value)}
        />
        <p className="text-[10px] text-foreground-tertiary mt-1">
          Copy the listing ID from the URL when viewing your listing.
        </p>
      </div>

      {/* Manual sections */}
      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <Card key={section.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{section.label}</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 pt-0">
              <Textarea
                value={content[section.key] || ""}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev,
                    [section.key]: e.target.value,
                  }))
                }
                placeholder={section.placeholder}
                rows={3}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || !selectedListing}>
          {saving ? "Saving..." : "Save Manual"}
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
          Sharing with guests after booking confirmation — coming in Phase 3.
        </p>
      </div>
    </div>
  );
}

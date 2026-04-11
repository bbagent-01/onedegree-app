"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Check, AlertCircle } from "lucide-react";

export default function RentalAgreementPage() {
  const [listingId, setListingId] = useState("");
  const [content, setContent] = useState({
    propertyAddress: "",
    hostName: "",
    guestName: "",
    checkIn: "",
    checkOut: "",
    pricePerNight: "",
    totalPrice: "",
    houseRules: "",
    cancellationPolicy: "",
    additionalTerms: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  async function handleSave() {
    if (!listingId) {
      setError("Please enter a listing ID.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/tools/rental-agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, content }),
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
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <FileText className="size-6 text-primary" />
          Rental Agreement
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Create a simple rental agreement pre-filled from your listing details.
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
          <Label className="mb-1.5 block text-xs">Property Address</Label>
          <Input
            value={content.propertyAddress}
            onChange={(e) => setContent({ ...content, propertyAddress: e.target.value })}
            placeholder="123 Main St, Brooklyn, NY"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Host Name</Label>
          <Input
            value={content.hostName}
            onChange={(e) => setContent({ ...content, hostName: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Guest Name</Label>
          <Input
            value={content.guestName}
            onChange={(e) => setContent({ ...content, guestName: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Price per Night ($)</Label>
          <Input
            type="number"
            value={content.pricePerNight}
            onChange={(e) => setContent({ ...content, pricePerNight: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Check-in Date</Label>
          <Input
            type="date"
            value={content.checkIn}
            onChange={(e) => setContent({ ...content, checkIn: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Check-out Date</Label>
          <Input
            type="date"
            value={content.checkOut}
            onChange={(e) => setContent({ ...content, checkOut: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs">House Rules</Label>
        <Textarea
          value={content.houseRules}
          onChange={(e) => setContent({ ...content, houseRules: e.target.value })}
          placeholder="No smoking, quiet hours after 10pm, etc."
          rows={3}
        />
      </div>

      <div>
        <Label className="mb-1.5 block text-xs">Cancellation Policy</Label>
        <Textarea
          value={content.cancellationPolicy}
          onChange={(e) => setContent({ ...content, cancellationPolicy: e.target.value })}
          placeholder="Full refund if cancelled 7+ days before check-in..."
          rows={2}
        />
      </div>

      <div>
        <Label className="mb-1.5 block text-xs">Additional Terms</Label>
        <Textarea
          value={content.additionalTerms}
          onChange={(e) => setContent({ ...content, additionalTerms: e.target.value })}
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
          {saving ? "Saving..." : "Save Agreement"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? "Hide Preview" : "Generate Preview"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-trust-solid">
            <Check className="size-4" />
            Saved
          </span>
        )}
      </div>

      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Agreement Preview</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <div className="rounded-lg bg-background-mid p-4 text-sm text-foreground-secondary space-y-2 font-mono text-xs leading-relaxed">
              <p className="font-semibold text-foreground">RENTAL AGREEMENT</p>
              <p>
                This agreement is between {content.hostName || "[Host]"} (&ldquo;Host&rdquo;)
                and {content.guestName || "[Guest]"} (&ldquo;Guest&rdquo;) for the property
                at {content.propertyAddress || "[Address]"}.
              </p>
              <p>
                Check-in: {content.checkIn || "[Date]"} · Check-out: {content.checkOut || "[Date]"}
              </p>
              <p>
                Rate: ${content.pricePerNight || "—"}/night
              </p>
              {content.houseRules && (
                <p>House Rules: {content.houseRules}</p>
              )}
              {content.cancellationPolicy && (
                <p>Cancellation: {content.cancellationPolicy}</p>
              )}
              {content.additionalTerms && (
                <p>Additional: {content.additionalTerms}</p>
              )}
              <p className="text-foreground-tertiary italic">
                AI-generated PDF — coming in Phase 3.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

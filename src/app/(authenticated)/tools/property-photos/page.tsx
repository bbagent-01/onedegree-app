"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload } from "lucide-react";

export default function PropertyPhotosPage() {
  const [listingId, setListingId] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-foreground flex items-center gap-2">
          <Camera className="size-6 text-primary" />
          Before & After Photos
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Document property condition at check-in and check-out with timestamped photos.
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Check-in Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
              <Upload className="size-8 text-foreground-tertiary mx-auto mb-2" />
              <p className="text-sm text-foreground-secondary">
                Upload check-in photos
              </p>
              <p className="text-[10px] text-foreground-tertiary mt-1">
                Photos will be timestamped automatically
              </p>
              <Button variant="outline" size="sm" className="mt-3" disabled>
                Upload Photos
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Check-out Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
              <Upload className="size-8 text-foreground-tertiary mx-auto mb-2" />
              <p className="text-sm text-foreground-secondary">
                Upload check-out photos
              </p>
              <p className="text-[10px] text-foreground-tertiary mt-1">
                Photos will be timestamped automatically
              </p>
              <Button variant="outline" size="sm" className="mt-3" disabled>
                Upload Photos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <p className="text-sm text-foreground-tertiary">
          Photo upload, comparison view, and dispute evidence — coming in Phase 3.
        </p>
      </div>
    </div>
  );
}

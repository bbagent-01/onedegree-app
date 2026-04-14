"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { iconForAmenity } from "@/lib/amenity-icons";

export function AmenitiesSection({ amenities }: { amenities: string[] }) {
  const [open, setOpen] = useState(false);
  const visible = amenities.slice(0, 10);

  if (amenities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        The host hasn&apos;t listed any amenities yet.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visible.map((a) => {
          const Icon = iconForAmenity(a);
          return (
            <div key={a} className="flex items-center gap-4">
              <Icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
              <span className="text-base">{a}</span>
            </div>
          );
        })}
      </div>

      {amenities.length > 10 && (
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="mt-6 h-12 rounded-lg border-foreground/30 font-semibold"
        >
          Show all {amenities.length} amenities
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What this place offers</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-4">
              {amenities.map((a) => {
                const Icon = iconForAmenity(a);
                return (
                  <div
                    key={a}
                    className="flex items-center gap-4 border-b border-border/60 pb-4 last:border-0"
                  >
                    <Icon
                      className="h-6 w-6 text-foreground"
                      strokeWidth={1.5}
                    />
                    <span className="text-base">{a}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

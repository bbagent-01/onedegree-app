"use client";

import dynamic from "next/dynamic";

// Leaflet must be client-only — it touches `window` on import.
const LocationMap = dynamic(
  () => import("./location-map").then((m) => m.LocationMap),
  { ssr: false }
);

export function LocationMapClient(props: {
  lat: number;
  lng: number;
  areaName: string;
}) {
  // `isolate` contains Leaflet's internal panes (z-index 200–800) inside a
  // local stacking context so they can't float above sticky headers/bars.
  return (
    <div className="relative isolate z-0">
      <LocationMap {...props} />
    </div>
  );
}

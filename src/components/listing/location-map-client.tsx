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
  return <LocationMap {...props} />;
}

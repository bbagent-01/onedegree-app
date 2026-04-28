"use client";

import { useEffect, useState } from "react";
import { LocationMap } from "./location-map";

// Leaflet touches `window`, but `LocationMap` already gates its leaflet
// import behind `useEffect`, so the module is SSR-safe. We previously used
// `next/dynamic({ ssr: false })` here, but that triggers a
// @cloudflare/next-on-pages async-chunk-splitting bug
// (`ReferenceError: async__chunk_NNNNN is not defined`). Mounting after
// hydration with a state flag avoids it without needing next/dynamic.
export function LocationMapClient(props: {
  lat: number;
  lng: number;
  areaName: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // `isolate` contains Leaflet's internal panes (z-index 200–800) inside a
  // local stacking context so they can't float above sticky headers/bars.
  return (
    <div className="relative isolate z-0">
      {mounted ? <LocationMap {...props} /> : null}
    </div>
  );
}

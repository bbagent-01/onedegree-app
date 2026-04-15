"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Small interactive map preview used in the hosting edit form so the host
 * can verify the pinned address. Supports live prop updates (re-centers
 * without remounting) when lat/lng change.
 *
 * Kept local to /hosting to avoid pulling in the guest-facing
 * `LocationMap` component (which has additional guest copy + the
 * approximate-location circle styling).
 */
export function LocationPreview({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          zoomControl: true,
          scrollWheelZoom: false,
        }).setView([lat, lng], 15);

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            maxZoom: 19,
            subdomains: ["a", "b", "c", "d"],
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          }
        ).addTo(map);

        const marker = L.marker([lat, lng]).addTo(map);
        mapRef.current = map;
        markerRef.current = marker;
      } else {
        mapRef.current.setView([lat, lng], 15);
        markerRef.current?.setLatLng([lat, lng]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lat, lng, mounted]);

  // Full teardown on unmount.
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[280px] w-full overflow-hidden rounded-xl border border-border/60"
    />
  );
}

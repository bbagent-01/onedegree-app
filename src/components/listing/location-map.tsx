"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  lat: number;
  lng: number;
  areaName: string;
}

export function LocationMap({ lat, lng, areaName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([lat, lng], 13);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          subdomains: ["a", "b", "c", "d"],
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(map);

      // Approximate-location circle (Airbnb hides exact address pre-booking).
      // Purple at 1.5× the old 500 m radius so the neighborhood feels more
      // believable as a "general area" hint than a pin.
      L.circle([lat, lng], {
        radius: 750,
        color: "#7C3AED",
        fillColor: "#7C3AED",
        fillOpacity: 0.18,
        weight: 2,
      }).addTo(map);

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng]);

  return (
    <div>
      <div
        ref={containerRef}
        className="h-[380px] w-full overflow-hidden rounded-xl border border-border/60"
      />
      <p className="mt-4 text-sm text-muted-foreground">
        Exact location shared with guests after booking. {areaName} is a
        walkable neighborhood with easy access to local shops, cafes, and
        transit.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
  Circle as LeafletCircle,
} from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Small interactive map preview used in the hosting edit form so the host
 * can verify the pinned address.
 *
 * Features:
 *   - Draggable marker. On drag-end, calls `onChange(lat, lng)` so the
 *     parent form can store the adjusted coordinates.
 *   - 500m approximate-location circle matching the guest-facing
 *     `LocationMap` — shows the host exactly what guests will see before
 *     they book (neighborhood blur, not exact address).
 *   - Live prop updates (re-centers / moves marker) without remounting
 *     the Leaflet instance.
 *
 * NB: Leaflet's default marker icons break when bundled (the CSS
 * references ./images/marker-icon.png which webpack rewrites). We pin
 * them to unpkg so the marker actually renders.
 */
export function LocationPreview({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange?: (lat: number, lng: number) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const circleRef = useRef<LeafletCircle | null>(null);
  // Keep the latest onChange in a ref so the dragend handler stays live
  // without having to reattach on every render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      // Custom Trustead-green pin (--tt-degree-3) as an inline-SVG
      // divIcon. Was the legacy purple #734796 from the old Attio
      // theme — replaced with the deep trust-degree green so the
      // map marker matches the brand. Stays inline-SVG to avoid
      // both the broken Leaflet default-icon bundler paths and any
      // external fetch.
      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
          <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z"
                fill="#1f7553" stroke="#ffffff" stroke-width="2"/>
          <circle cx="15" cy="15" r="5" fill="#ffffff"/>
        </svg>`;
      const brandIcon = L.divIcon({
        className: "",
        html: pinSvg,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        tooltipAnchor: [0, -36],
      });

      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          zoomControl: true,
          scrollWheelZoom: false,
        }).setView([lat, lng], 14);

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            maxZoom: 19,
            subdomains: ["a", "b", "c", "d"],
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          }
        ).addTo(map);

        // Approximate-radius circle — matches guest-facing LocationMap.
        const circle = L.circle([lat, lng], {
          radius: 750,
          color: "#1f7553",
          fillColor: "#1f7553",
          fillOpacity: 0.18,
          weight: 2,
        }).addTo(map);

        const marker = L.marker([lat, lng], {
          draggable: true,
          icon: brandIcon,
        }).addTo(map);
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          circle.setLatLng(p);
          onChangeRef.current?.(p.lat, p.lng);
        });
        marker
          .bindTooltip("Drag to adjust", {
            permanent: false,
            direction: "top",
            offset: [0, -36],
          })
          .openTooltip();

        mapRef.current = map;
        markerRef.current = marker;
        circleRef.current = circle;
      } else {
        mapRef.current.setView([lat, lng], mapRef.current.getZoom());
        markerRef.current?.setLatLng([lat, lng]);
        circleRef.current?.setLatLng([lat, lng]);
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
        circleRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[320px] w-full overflow-hidden rounded-xl border border-border/60"
    />
  );
}

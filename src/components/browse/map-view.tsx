"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type { BrowseListing } from "@/lib/browse-data";
import "leaflet/dist/leaflet.css";

interface Props {
  listings: BrowseListing[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function MapView({ listings, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  // Init map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([40.7128, -74.006], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  const listingsKey = useMemo(
    () => listings.map((l) => l.id).join("|"),
    [listings]
  );

  // Rebuild markers whenever listings change.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // Remove stale markers.
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    if (listings.length === 0) return;

    const bounds = L.latLngBounds([]);

    listings.forEach((l) => {
      const price = l.price_min ?? l.price_max ?? 0;
      const isSelected = selectedId === l.id;

      const icon = L.divIcon({
        className: "",
        html: `<div class="map-pin ${
          isSelected ? "map-pin-selected" : ""
        }">$${price}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([l.latitude, l.longitude], { icon }).addTo(map);
      marker.on("click", () => onSelect(l.id));
      markersRef.current.set(l.id, marker);
      bounds.extend([l.latitude, l.longitude]);
    });

    if (listings.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (listings.length === 1) {
      map.setView([listings[0].latitude, listings[0].longitude], 14);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingsKey]);

  // Update only the selected state when selectedId changes (no map re-fit).
  useEffect(() => {
    const L = leafletRef.current;
    if (!L) return;

    markersRef.current.forEach((marker, id) => {
      const listing = listings.find((l) => l.id === id);
      if (!listing) return;
      const price = listing.price_min ?? listing.price_max ?? 0;
      const isSelected = selectedId === id;
      marker.setIcon(
        L.divIcon({
          className: "",
          html: `<div class="map-pin ${
            isSelected ? "map-pin-selected" : ""
          }">$${price}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        })
      );
      if (isSelected) {
        marker.setZIndexOffset(1000);
      } else {
        marker.setZIndexOffset(0);
      }
    });
  }, [selectedId, listings]);

  return <div ref={containerRef} className="h-full w-full" />;
}

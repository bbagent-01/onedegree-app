"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type { BrowseListing } from "@/lib/browse-data";
import "leaflet/dist/leaflet.css";

interface Props {
  listings: BrowseListing[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const PLACEHOLDER =
  "https://placehold.co/600x400/e2e8f0/475569?text=No+photo";

function popupHtml(l: BrowseListing): string {
  const photos = l.photos.length
    ? l.photos.map((p) => p.public_url)
    : [PLACEHOLDER];
  const price = l.price_min ?? l.price_max ?? 0;
  const rating = l.avg_listing_rating;
  const ratingLine = rating
    ? `<span class="pp-rating">★ ${rating.toFixed(2)} <span class="pp-dim">(${l.listing_review_count})</span></span>`
    : "";
  const title = escapeHtml(l.title);
  const area = escapeHtml(l.area_name);
  const propType =
    l.property_type.charAt(0).toUpperCase() + l.property_type.slice(1);

  const slides = photos
    .map(
      (src, i) =>
        `<div class="pp-slide${
          i === 0 ? " pp-slide-active" : ""
        }" style="background-image:url('${escapeAttr(src)}')"></div>`
    )
    .join("");

  const dots = photos
    .map(
      (_, i) =>
        `<span class="pp-dot${i === 0 ? " pp-dot-active" : ""}"></span>`
    )
    .join("");

  const nav =
    photos.length > 1
      ? `
        <button class="pp-nav pp-prev" data-pp-action="prev" aria-label="Previous photo">‹</button>
        <button class="pp-nav pp-next" data-pp-action="next" aria-label="Next photo">›</button>
        <div class="pp-dots">${dots}</div>
      `
      : "";

  return `
    <div class="pp-card" data-pp-count="${photos.length}">
      <div class="pp-imgs">
        ${slides}
        ${nav}
      </div>
      <a class="pp-link" href="/listings/${l.id}">
        <div class="pp-body">
          <div class="pp-row">
            <span class="pp-title">${title}</span>
            ${ratingLine}
          </div>
          <div class="pp-sub">${area} · ${propType}</div>
          <div class="pp-price"><strong>$${price}</strong> <span class="pp-dim">night</span></div>
        </div>
      </a>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Document-level click delegation for the popup photo carousel.
 * Listens in the capture phase so it runs before Leaflet's own
 * click handlers can intercept the event.
 */
function handleCarouselClick(ev: Event) {
  const target = ev.target as HTMLElement | null;
  if (!target) return;
  const btn = target.closest<HTMLElement>("[data-pp-action]");
  if (!btn) return;
  ev.preventDefault();
  ev.stopPropagation();
  const card = btn.closest<HTMLElement>(".pp-card");
  if (!card) return;
  const count = parseInt(card.dataset.ppCount || "1", 10);
  if (count <= 1) return;
  const slides = card.querySelectorAll<HTMLElement>(".pp-slide");
  const dots = card.querySelectorAll<HTMLElement>(".pp-dot");
  let idx = Array.from(slides).findIndex((el) =>
    el.classList.contains("pp-slide-active")
  );
  if (idx < 0) idx = 0;
  const delta = btn.dataset.ppAction === "next" ? 1 : -1;
  idx = (idx + delta + count) % count;
  slides.forEach((el, i) => el.classList.toggle("pp-slide-active", i === idx));
  dots.forEach((el, i) => el.classList.toggle("pp-dot-active", i === idx));
}

export function MapView({ listings, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());

  // Init map exactly once.
  useEffect(() => {
    let cancelled = false;
    let localMap: LeafletMap | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;

      localMap = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([40.7128, -74.006], 12);

      // CartoDB Positron — clean, muted base map (Airbnb-like look).
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          subdomains: ["a", "b", "c", "d"],
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(localMap);

      setMap(localMap);
    })();

    // Document-level delegation for popup carousel nav.
    // Capture phase so we win against Leaflet's own handlers.
    document.addEventListener("click", handleCarouselClick, true);

    return () => {
      cancelled = true;
      if (localMap) {
        localMap.remove();
      }
      markersRef.current.clear();
      document.removeEventListener("click", handleCarouselClick, true);
    };
  }, []);

  const listingsKey = useMemo(
    () => listings.map((l) => l.id).join("|"),
    [listings]
  );

  // (Re)build markers whenever map is ready or listings change.
  useEffect(() => {
    const L = leafletRef.current;
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

      const marker = L.marker([l.latitude, l.longitude], {
        icon,
        riseOnHover: true,
      }).addTo(map);

      marker.bindPopup(popupHtml(l), {
        className: "listing-popup",
        maxWidth: 260,
        minWidth: 260,
        closeButton: true,
        autoPan: true,
        offset: [0, -6],
      });

      marker.on("click", () => {
        onSelect(l.id);
        marker.openPopup();
      });

      markersRef.current.set(l.id, marker);
      bounds.extend([l.latitude, l.longitude]);
    });

    if (listings.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (listings.length === 1) {
      map.setView([listings[0].latitude, listings[0].longitude], 14);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, listingsKey]);

  // Only update visual state (no map re-fit) when selectedId changes.
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
      marker.setZIndexOffset(isSelected ? 1000 : 0);
    });
  }, [selectedId, listings]);

  return <div ref={containerRef} className="h-full w-full" />;
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Lock,
  Star,
  CalendarDays,
  MapPin,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ContactRequestForm } from "@/components/contact-request-form";
import { CalendarManager } from "@/components/calendar/calendar-manager";
import type { ListingWithAccess, ListingPhoto } from "@/lib/listing-data";
import type { BookedStay, CalendarSettings } from "@/components/calendar/types";

const AMENITY_LABELS: Record<string, string> = {
  wifi: "WiFi",
  ac: "AC",
  washer_dryer: "Washer/Dryer",
  kitchen: "Kitchen",
  parking: "Parking",
  pets_ok: "Pets OK",
  pool: "Pool",
  gym: "Gym",
  backyard: "Backyard",
  hot_tub: "Hot Tub",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment",
  house: "House",
  room: "Room",
  other: "Other",
};

function PhotoGallery({ photos }: { photos: ListingPhoto[] }) {
  const [current, setCurrent] = useState(0);
  if (photos.length === 0) return null;

  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-background-mid">
      <img
        src={photos[current].public_url}
        alt={`Photo ${current + 1}`}
        className="h-full w-full object-cover"
      />
      {photos.length > 1 && (
        <>
          <button
            onClick={() =>
              setCurrent((c) => (c - 1 + photos.length) % photos.length)
            }
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % photos.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "size-2 rounded-full transition-all",
                  i === current ? "bg-white" : "bg-white/40"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LockedBanner({
  viewerScore,
  requiredScore,
}: {
  viewerScore: number;
  requiredScore: number;
}) {
  const needsMore = requiredScore > 0 ? requiredScore - viewerScore : 0;
  return (
    <div className="rounded-xl border border-primary-border bg-primary-light p-5">
      <div className="flex items-start gap-3">
        <Lock className="size-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Preview Only
          </p>
          <p className="text-sm text-foreground-secondary mt-1">
            {needsMore > 0 ? (
              <>
                You need{" "}
                <span className="font-semibold text-primary">{needsMore}</span>{" "}
                more trust points to see this listing. Your current score vs.
                this host is{" "}
                <span className="font-mono font-semibold">{viewerScore}</span>{" "}
                (threshold: {requiredScore}).
              </>
            ) : (
              <>
                Get vouched by someone connected to this host to unlock full
                details.
              </>
            )}{" "}
            Ask a member on the{" "}
            <Link href="/vouch" className="text-primary underline">
              Vouch page
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function HostCard({
  host,
}: {
  host: NonNullable<ListingWithAccess["host"]>;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="flex items-center gap-3 mb-4">
        {host.avatar_url ? (
          <img
            src={host.avatar_url}
            alt={host.name}
            className="size-12 rounded-full object-cover"
          />
        ) : (
          <div className="size-12 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold">
            {host.name.charAt(0)}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">{host.name}</p>
          <p className="text-xs text-foreground-secondary">Host</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="font-mono text-lg font-semibold text-foreground">
            {host.host_rating?.toFixed(1) ?? "—"}
          </p>
          <p className="text-[10px] text-foreground-secondary">Host Rating</p>
        </div>
        <div>
          <p className="font-mono text-lg font-semibold text-foreground">
            {host.vouch_power?.toFixed(1) ?? "—"}
          </p>
          <p className="text-[10px] text-foreground-secondary">Vouch Power</p>
        </div>
        <div>
          <p className="font-mono text-lg font-semibold text-foreground">
            {host.host_review_count}
          </p>
          <p className="text-[10px] text-foreground-secondary">Reviews</p>
        </div>
      </div>
    </div>
  );
}

export function ListingDetailClient({
  listing,
  viewerId,
  viewerScore = 0,
  requiredScore = 0,
  bookedStays = [],
  calendarSettings,
}: {
  listing: ListingWithAccess;
  viewerId?: string;
  viewerScore?: number;
  requiredScore?: number;
  bookedStays?: BookedStay[];
  calendarSettings?: CalendarSettings;
}) {
  const { access } = listing;
  const [toast, setToast] = useState<string | null>(null);

  // Preview photos for preview-only layer, all photos for full
  const visiblePhotos = access.canSeeFull
    ? listing.photos
    : listing.photos.filter((p) => p.is_preview);

  const isOwnListing = viewerId === listing.host_id;

  const priceLabel =
    listing.price_min && listing.price_max
      ? `$${listing.price_min}–$${listing.price_max}`
      : listing.price_min
        ? `From $${listing.price_min}`
        : listing.price_max
          ? `Up to $${listing.price_max}`
          : null;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-8">
        {/* Back link */}
        <Link
          href="/listings"
          className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to listings
        </Link>

        {/* Photo gallery */}
        <PhotoGallery photos={visiblePhotos} />

        <div className="mt-6 space-y-6">
          {/* Title row */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full border border-border bg-white px-2.5 py-0.5 text-xs font-medium text-foreground-secondary">
                {PROPERTY_TYPE_LABELS[listing.property_type] || listing.property_type}
              </span>
            </div>
            <h1 className="text-3xl text-foreground">{listing.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-foreground-secondary">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {listing.area_name}
              </span>
              {priceLabel && (
                <span className="flex items-center gap-1">
                  <DollarSign className="size-3.5" />
                  {priceLabel} / night
                </span>
              )}
            </div>
          </div>

          {/* Availability (shown in both preview and full) */}
          {(listing.availability_start || listing.availability_flexible) && (
            <section className="flex items-center gap-2 text-sm text-foreground-secondary">
              <CalendarDays className="size-4" />
              {listing.availability_flexible ? (
                <span>Flexible dates</span>
              ) : (
                <span>
                  {new Date(listing.availability_start!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  {" — "}
                  {listing.availability_end
                    ? new Date(listing.availability_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                    : "Open-ended"}
                </span>
              )}
            </section>
          )}

          {/* Locked banner */}
          {!access.canSeeFull && (
            <LockedBanner
              viewerScore={viewerScore}
              requiredScore={requiredScore}
            />
          )}

          {/* ── Full listing content ── */}
          {access.canSeeFull && (
            <>
              {/* Description */}
              {listing.description && (
                <section>
                  <h2 className="text-xl text-foreground mb-2">About this space</h2>
                  <p className="text-sm text-foreground-secondary whitespace-pre-wrap">
                    {listing.description}
                  </p>
                </section>
              )}

              {/* Amenities */}
              {listing.amenities.length > 0 && (
                <section>
                  <h2 className="text-xl text-foreground mb-2">Amenities</h2>
                  <div className="flex flex-wrap gap-2">
                    {listing.amenities.map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-foreground-secondary"
                      >
                        {AMENITY_LABELS[a] ?? a}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* House Rules */}
              {listing.house_rules && (
                <section>
                  <h2 className="text-xl text-foreground mb-2">House Rules</h2>
                  <p className="text-sm text-foreground-secondary whitespace-pre-wrap">
                    {listing.house_rules}
                  </p>
                </section>
              )}

              {/* Calendar — owner sees edit mode, guests see readonly */}
              {isOwnListing ? (
                <CalendarManager
                  listingId={listing.id}
                  mode="edit"
                  initialSettings={calendarSettings}
                  bookedStays={bookedStays}
                />
              ) : (
                <CalendarManager
                  listingId={listing.id}
                  mode="readonly"
                  initialSettings={calendarSettings}
                  bookedStays={bookedStays}
                />
              )}

              {/* Host card */}
              {listing.host && <HostCard host={listing.host} />}

              {/* Request to Book */}
              {!isOwnListing && (
                <ContactRequestForm
                  listingId={listing.id}
                  listingTitle={listing.title}
                  hostName={listing.host?.name || "the host"}
                  onSuccess={() => {
                    setToast("Request sent!");
                    setTimeout(() => setToast(null), 3000);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-3 shadow-lg">
            <Star className="size-4 text-trust-building" />
            <span className="text-sm font-medium text-foreground">{toast}</span>
          </div>
        </div>
      )}
    </main>
  );
}

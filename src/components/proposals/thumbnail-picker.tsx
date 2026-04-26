"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Trip Wish thumbnail picker. Auto-fetches an Unsplash photo when the
 * destination changes (debounced — no fetch fires while the user is
 * still typing), shows a preview with attribution, and offers three
 * follow-ups: change to one of N alternatives, upload a custom photo,
 * or open Unsplash in a new tab to browse manually.
 *
 * The "auto" vs "picked" distinction is preserved on the value because
 * Unsplash's guidelines treat the displayed photo and the photographer
 * credit as a unit — switching photos requires switching the credit too.
 */

export type ThumbnailSource =
  | "unsplash_auto"
  | "unsplash_picked"
  | "user_upload"
  | null;

/**
 * Full attribution blob persisted alongside the proposal. Includes the
 * pieces required by Unsplash's production-tier guidelines:
 *   - photographer_name + photographer_url → rendered credit + link
 *   - unsplash_url                         → "on Unsplash" link target
 *   - download_location                    → endpoint we ping when the
 *                                            photo is "used" (proposal
 *                                            create/update). Server-side.
 *   - photo_id                             → useful for support/debug
 *
 * Null when the photo isn't from Unsplash (user upload) or the picker
 * is empty.
 */
export interface ThumbnailAttribution {
  photographer_name: string;
  photographer_url: string;
  unsplash_url: string;
  download_location: string;
  photo_id: string;
}

export interface ThumbnailValue {
  url: string | null;
  source: ThumbnailSource;
  attribution: ThumbnailAttribution | null;
}

interface UnsplashPhoto {
  id: string;
  url: string;
  thumb_url: string;
  photographer_name: string;
  photographer_url: string;
  unsplash_url: string;
  download_location: string;
  alt: string;
}

interface Props {
  destination: string;
  value: ThumbnailValue;
  onChange: (next: ThumbnailValue) => void;
}

const DEBOUNCE_MS = 600;

export function ThumbnailPicker({ destination, value, onChange }: Props) {
  const [autoFetched, setAutoFetched] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [alternatives, setAlternatives] = useState<UnsplashPhoto[]>([]);
  const [showGrid, setShowGrid] = useState(false);
  const [gridLoading, setGridLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Tracks the destination we've already auto-fetched against, so a
  // user editing the destination triggers a re-fetch but a re-render
  // (e.g. typing in another field) doesn't.
  const lastAutoQuery = useRef<string | null>(null);

  // Debounced auto-fetch when destination changes. Only fires when the
  // user has not yet set a thumbnail manually (uploaded / picked from
  // grid) — auto-overwriting a chosen photo would surprise them.
  useEffect(() => {
    const dest = destination.trim();
    if (!dest) {
      lastAutoQuery.current = null;
      return;
    }
    if (
      value.source === "user_upload" ||
      value.source === "unsplash_picked"
    ) {
      return;
    }
    if (lastAutoQuery.current === dest.toLowerCase()) return;

    const handle = setTimeout(async () => {
      setAutoLoading(true);
      try {
        const res = await fetch(
          `/api/unsplash/search?q=${encodeURIComponent(dest)}`
        );
        if (!res.ok) {
          setAutoLoading(false);
          return;
        }
        const data = (await res.json()) as { photos: UnsplashPhoto[] };
        const first = data.photos[0];
        lastAutoQuery.current = dest.toLowerCase();
        setAutoFetched(true);
        if (first) {
          onChange({
            url: first.url,
            source: "unsplash_auto",
            attribution: {
              photographer_name: first.photographer_name,
              photographer_url: first.photographer_url,
              unsplash_url: first.unsplash_url,
              download_location: first.download_location,
              photo_id: first.id,
            },
          });
          setAlternatives(data.photos);
        } else {
          // No matches — clear any stale auto pick so the placeholder
          // shows. Don't clobber a user upload (guarded above).
          onChange({ url: null, source: null, attribution: null });
        }
      } finally {
        setAutoLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, value.source]);

  const fetchAlternatives = async () => {
    if (!destination.trim()) return;
    setGridLoading(true);
    try {
      if (alternatives.length === 0) {
        const res = await fetch(
          `/api/unsplash/search?q=${encodeURIComponent(destination.trim())}`
        );
        const data = (await res.json()) as { photos: UnsplashPhoto[] };
        setAlternatives(data.photos);
      }
      setShowGrid(true);
    } finally {
      setGridLoading(false);
    }
  };

  const pick = (p: UnsplashPhoto) => {
    onChange({
      url: p.url,
      source: "unsplash_picked",
      attribution: {
        photographer_name: p.photographer_name,
        photographer_url: p.photographer_url,
        unsplash_url: p.unsplash_url,
        download_location: p.download_location,
        photo_id: p.id,
      },
    });
    setShowGrid(false);
  };

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        toast.error("Upload failed");
        return;
      }
      const data = (await res.json()) as { public_url: string };
      onChange({
        url: data.public_url,
        source: "user_upload",
        attribution: null,
      });
      setShowGrid(false);
    } finally {
      setUploading(false);
    }
  };

  const clear = () => {
    onChange({ url: null, source: null, attribution: null });
    setAlternatives([]);
    setShowGrid(false);
    lastAutoQuery.current = null;
  };

  const externalSearchUrl = destination.trim()
    ? `https://unsplash.com/s/photos/${encodeURIComponent(destination.trim())}`
    : "https://unsplash.com";

  return (
    <div className="space-y-3">
      <div
        className="relative h-44 w-full overflow-hidden rounded-xl border-2 border-border bg-muted"
        data-testid="thumbnail-preview"
      >
        {value.url ? (
          <>
            {/* Background image + sky-blue overlay matching the in-feed
                treatment so the preview WYSIWYGs the final card. */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${value.url})` }}
              role="img"
              aria-label={`Thumbnail for ${destination || "trip wish"}`}
            />
            <div
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(56, 139, 253, 0.22)" }}
            />
            {value.attribution && (
              // Production-tier compliant credit: "Photo by {linked
              // photographer} on {linked Unsplash}". Both links carry
              // the required ?utm_source=trustead&utm_medium=referral
              // query and target="_blank". Same content as the
              // rendered card so the picker stays WYSIWYG.
              <div className="absolute bottom-1.5 right-2 text-[11px] font-medium text-white/85">
                Photo by{" "}
                <a
                  href={`${value.attribution.photographer_url}?utm_source=trustead&utm_medium=referral`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:underline"
                >
                  {value.attribution.photographer_name}
                </a>{" "}
                on{" "}
                <a
                  href="https://unsplash.com/?utm_source=trustead&utm_medium=referral"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:underline"
                >
                  Unsplash
                </a>
              </div>
            )}
            <button
              type="button"
              onClick={clear}
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
              aria-label="Remove thumbnail"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            {autoLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Looking for a photo of {destination || "your destination"}…
              </span>
            ) : destination.trim() ? (
              autoFetched
                ? "No photo found — upload your own below."
                : "Add a destination above to fetch a photo."
            ) : (
              "Add a destination above to fetch a photo."
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={fetchAlternatives}
          disabled={!destination.trim() || gridLoading}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50"
        >
          {gridLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Change photo
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          Upload your own
        </button>
        <a
          href={externalSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold hover:bg-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Search Unsplash
        </a>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {showGrid && (
        <div className="rounded-xl border border-border bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pick a different photo
            </div>
            <button
              type="button"
              onClick={() => setShowGrid(false)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          {alternatives.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No alternatives found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {alternatives.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border hover:border-foreground"
                >
                  <img
                    src={p.thumb_url}
                    alt={p.alt}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <span className="absolute bottom-0 right-0 bg-black/50 px-1.5 py-0.5 text-[9px] font-medium text-white">
                    {p.photographer_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

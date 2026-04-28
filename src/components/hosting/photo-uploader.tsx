"use client";

import { useCallback, useRef, useState } from "react";
import {
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PhotoFilterDialog, type FilterResult } from "./photo-filter-dialog";
import type { FilterPreset, FilterSettings } from "@/lib/photo-filter/types";
import {
  applyFilterToSavedPhoto,
  removeFilterFromSavedPhoto,
  storagePathFromUrl,
  uploadBlob,
} from "@/lib/photo-filter/storage";

export interface UploadedPhoto {
  id?: string; // present for already-saved photos
  public_url: string;
  storage_path?: string;
  /** Single-select: the hero/thumbnail image for this listing. */
  is_cover: boolean;
  /** Multi-select: whether this photo appears in anonymous preview. */
  is_preview: boolean;
  sort_order: number;
  // CC-C10a filter fields. `original_url` is set when a filter has been
  // applied and we need to preserve the source for later re-filtering.
  original_url?: string | null;
  filter_preset?: FilterPreset | null;
  filter_settings?: FilterSettings | null;
}

interface Props {
  photos: UploadedPhoto[];
  onChange: (next: UploadedPhoto[]) => void;
  max?: number;
}

export function PhotoUploader({ photos, onChange, max = 20 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // CC-C10a filter dialog state. `pendingFiles` is a FIFO queue: the
  // dialog opens for the head file and, when the host saves or skips,
  // we pop and open the next. `editingIdx` is set (instead of a file
  // queue) when the host clicks "Edit filter" on an already-uploaded
  // photo — same dialog, different source + save path.
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const onFilesPicked = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      if (photos.length + list.length > max) {
        toast.error(`Max ${max} photos per listing.`);
        return;
      }
      setPendingFiles((q) => [...q, ...list]);
    },
    [photos, max]
  );

  // Commit a newly-filtered or unfiltered file to the photo list. Called
  // when the filter dialog returns for the head item in `pendingFiles`.
  const commitNewFile = useCallback(
    async (file: File, result: FilterResult) => {
      setUploading(true);
      try {
        // Always upload the original (it's what we'd use if the filter
        // is ever reset). For the unfiltered path, that IS the display.
        const originalUpload = await uploadBlob(file, file.name);
        let displayUpload = originalUpload;
        let originalUrl: string | null = null;
        if (result.filteredBlob) {
          const filteredUpload = await uploadBlob(
            result.filteredBlob,
            `${file.name.replace(/\.[^.]+$/, "")}_filtered.jpg`
          );
          displayUpload = filteredUpload;
          originalUrl = originalUpload.public_url;
        }
        const next = [
          ...photos,
          {
            public_url: displayUpload.public_url,
            storage_path: displayUpload.storage_path,
            is_cover: false,
            is_preview: false,
            sort_order: photos.length,
            original_url: originalUrl,
            filter_preset: result.preset ?? null,
            filter_settings: result.settings ?? null,
          },
        ];
        if (!next.some((p) => p.is_cover)) next[0].is_cover = true;
        onChange(next.map((p, i) => ({ ...p, sort_order: i })));
      } catch (e) {
        console.error(e);
        toast.error(`Failed to upload ${file.name}`);
      } finally {
        setUploading(false);
      }
    },
    [photos, onChange]
  );

  const onDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) {
      onFilesPicked(e.dataTransfer.files);
    }
  };

  const remove = (idx: number) => {
    const next = photos
      .filter((_, i) => i !== idx)
      .map((p, i) => ({ ...p, sort_order: i }));
    // Keep at least one cover (first photo if none).
    if (!next.some((p) => p.is_cover) && next.length > 0) {
      next[0].is_cover = true;
    }
    // Preview photos are optional — no forced backfill.
    onChange(next);
  };

  // Single-select: make photo idx the cover, unset all others.
  const setCover = (idx: number) => {
    onChange(photos.map((p, i) => ({ ...p, is_cover: i === idx })));
  };

  // Multi-select: toggle whether photo idx is in the preview.
  // Zero preview photos is valid — the cover photo is shown blurred.
  const togglePreview = (idx: number) => {
    const next = photos.map((p, i) =>
      i === idx ? { ...p, is_preview: !p.is_preview } : p
    );
    onChange(next);
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next.map((p, i) => ({ ...p, sort_order: i })));
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDropFiles}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          dragOver
            ? "border-brand bg-brand/5"
            : "border-border bg-muted/20 hover:bg-muted/40"
        )}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="mt-3 text-sm font-medium text-foreground">
          Drag and drop photos or click to upload
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPG or PNG &mdash; minimum 3 photos, up to {max}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onFilesPicked(e.target.files);
            // Reset so picking the same file twice still fires onChange.
            e.target.value = "";
          }}
        />
      </div>

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p, i) => (
            <div
              key={p.public_url}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIdx !== null) reorder(dragIdx, i);
                setDragIdx(null);
              }}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted",
                dragIdx === i && "opacity-50"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.public_url}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />

              {/* Drag handle */}
              <div className="absolute left-1.5 top-1.5 rounded bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100">
                <GripVertical className="h-3.5 w-3.5" />
              </div>

              {/* Cover star (single-select) */}
              <button
                type="button"
                onClick={() => setCover(i)}
                className={cn(
                  "absolute right-10 top-1.5 rounded-full p-1.5 shadow-sm transition-colors",
                  p.is_cover
                    ? "bg-amber-400 text-white"
                    : "bg-white/90 text-zinc-700 opacity-0 hover:bg-white group-hover:opacity-100"
                )}
                title={p.is_cover ? "Cover photo" : "Set as cover"}
                aria-label={p.is_cover ? "Cover photo" : "Set as cover"}
              >
                <Star
                  className={cn("h-4 w-4", p.is_cover && "fill-current")}
                />
              </button>

              {/* Preview eye (multi-select) */}
              <button
                type="button"
                onClick={() => togglePreview(i)}
                className={cn(
                  "absolute right-1.5 top-1.5 rounded-full p-1.5 shadow-sm transition-colors",
                  p.is_preview
                    ? "bg-brand text-white"
                    : "bg-white/90 text-zinc-700 opacity-0 hover:bg-white group-hover:opacity-100"
                )}
                title={p.is_preview ? "In preview — click to hide" : "Include in preview"}
                aria-label={p.is_preview ? "In preview" : "Include in preview"}
              >
                {p.is_preview ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>

              {/* Edit filter (CC-C10a) — only available for saved photos
                  where the dialog can hit the server-side endpoint. */}
              {p.id && (
                <button
                  type="button"
                  onClick={() => setEditingIdx(i)}
                  className={cn(
                    "absolute bottom-1.5 right-10 rounded-full p-1.5 shadow-sm transition-colors",
                    p.filter_preset
                      ? "bg-foreground text-white"
                      : "bg-white/90 text-zinc-700 opacity-0 hover:bg-white group-hover:opacity-100"
                  )}
                  title={p.filter_preset ? "Edit filter" : "Add filter"}
                  aria-label={p.filter_preset ? "Edit filter" : "Add filter"}
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              )}

              {/* Remove */}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute bottom-1.5 right-1.5 rounded-full bg-white/90 p-1.5 text-zinc-700 opacity-0 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                title="Remove"
                aria-label="Remove photo"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* Badges */}
              <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                {p.is_cover && (
                  <div className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                    Cover
                  </div>
                )}
                {p.is_preview && (
                  <div className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                    Preview
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs text-muted-foreground">
        {photos.length} of {max} photos &middot;{" "}
        {photos.filter((p) => p.is_preview).length} in preview
        {photos.length < 3 && (
          <span className="ml-2 text-amber-600">
            &middot; {3 - photos.length} more required
          </span>
        )}
      </div>
      {photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Cover
            &mdash; main thumbnail (pick one)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-brand" /> Preview &mdash; shown to
            anyone before they unlock the listing (optional; if none are
            selected, the cover photo is shown blurred)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-foreground" /> Filter
            &mdash; brighten + balance on upload. The original is always kept.
          </span>
        </div>
      )}

      {/* New-upload filter dialog — opens for the head of the queue. */}
      {pendingFiles.length > 0 && (
        <PhotoFilterDialog
          open
          source={{ kind: "file", file: pendingFiles[0] }}
          initialPreset="natural"
          onCancel={() => {
            setPendingFiles((q) => q.slice(1));
          }}
          onSave={async (result) => {
            const file = pendingFiles[0];
            setPendingFiles((q) => q.slice(1));
            await commitNewFile(file, result);
          }}
        />
      )}

      {/* Re-edit dialog for already-saved photos. */}
      {editingIdx !== null && photos[editingIdx] && (
        <PhotoFilterDialog
          open
          source={{
            kind: "url",
            // Always filter from the pristine original when one exists,
            // otherwise this is the first filter application so the
            // current display IS the original.
            url:
              photos[editingIdx].original_url ||
              photos[editingIdx].public_url,
          }}
          initialPreset={photos[editingIdx].filter_preset ?? "natural"}
          initialSettings={photos[editingIdx].filter_settings ?? undefined}
          allowReset={!!photos[editingIdx].filter_preset}
          onCancel={() => setEditingIdx(null)}
          onSave={async (result) => {
            const idx = editingIdx;
            const target = photos[idx];
            if (!target?.id) {
              setEditingIdx(null);
              return;
            }
            try {
              if (result.filteredBlob && result.preset && result.settings) {
                // Apply or replace a filter.
                const originalPublicUrl =
                  target.original_url || target.public_url;
                const filteredUpload = await uploadBlob(
                  result.filteredBlob,
                  "filtered.jpg"
                );
                await applyFilterToSavedPhoto({
                  photoId: target.id,
                  filtered_public_url: filteredUpload.public_url,
                  filtered_storage_path: filteredUpload.storage_path,
                  original_public_url: originalPublicUrl,
                  filter_preset: result.preset,
                  filter_settings: result.settings,
                  // Only delete the old filtered blob — never the original.
                  replace_storage_path:
                    target.original_url && target.storage_path
                      ? target.storage_path
                      : null,
                });
                const next = photos.map((p, i) =>
                  i === idx
                    ? {
                        ...p,
                        public_url: filteredUpload.public_url,
                        storage_path: filteredUpload.storage_path,
                        original_url: originalPublicUrl,
                        filter_preset: result.preset,
                        filter_settings: result.settings,
                      }
                    : p
                );
                onChange(next);
                toast.success("Filter saved");
              } else {
                // Remove filter — restore original.
                await removeFilterFromSavedPhoto(target.id);
                const restoredUrl =
                  target.original_url || target.public_url;
                const next = photos.map((p, i) =>
                  i === idx
                    ? {
                        ...p,
                        public_url: restoredUrl,
                        storage_path:
                          storagePathFromUrl(restoredUrl) ?? p.storage_path,
                        original_url: null,
                        filter_preset: null,
                        filter_settings: null,
                      }
                    : p
                );
                onChange(next);
                toast.success("Filter removed");
              }
            } catch (e) {
              console.error(e);
              toast.error("Couldn't save the filter");
            } finally {
              setEditingIdx(null);
            }
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, Star, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface UploadedPhoto {
  id?: string; // present for already-saved photos
  public_url: string;
  storage_path?: string;
  is_preview: boolean;
  sort_order: number;
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

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      if (photos.length + list.length > max) {
        toast.error(`Max ${max} photos per listing.`);
        return;
      }
      setUploading(true);
      const added: UploadedPhoto[] = [];
      for (const file of list) {
        const fd = new FormData();
        fd.append("file", file);
        try {
          const res = await fetch("/api/photos/upload", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) throw new Error(await res.text());
          const data = (await res.json()) as {
            public_url: string;
            storage_path: string;
          };
          added.push({
            public_url: data.public_url,
            storage_path: data.storage_path,
            is_preview: false,
            sort_order: photos.length + added.length,
          });
        } catch (e) {
          console.error(e);
          toast.error(`Failed to upload ${file.name}`);
        }
      }
      // If no cover yet, mark the first newly uploaded photo as cover.
      const next = [...photos, ...added];
      if (!next.some((p) => p.is_preview) && next.length > 0) {
        next[0].is_preview = true;
      }
      onChange(next.map((p, i) => ({ ...p, sort_order: i })));
      setUploading(false);
    },
    [photos, onChange, max]
  );

  const onDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const remove = (idx: number) => {
    const next = photos
      .filter((_, i) => i !== idx)
      .map((p, i) => ({ ...p, sort_order: i }));
    if (!next.some((p) => p.is_preview) && next.length > 0) {
      next[0].is_preview = true;
    }
    onChange(next);
  };

  // Toggle whether a photo is included in the preview. Multi-select.
  // The first preview photo (by sort_order) also acts as the cover.
  const togglePreview = (idx: number) => {
    const next = photos.map((p, i) =>
      i === idx ? { ...p, is_preview: !p.is_preview } : p
    );
    // Always ensure at least one photo is marked as preview (the cover).
    if (!next.some((p) => p.is_preview) && next.length > 0) {
      next[0].is_preview = true;
    }
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
          JPG or PNG — minimum 3 photos, up to {max}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
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
              <div className="absolute left-1.5 top-1.5 rounded bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100">
                <GripVertical className="h-3.5 w-3.5" />
              </div>
              <button
                type="button"
                onClick={() => togglePreview(i)}
                className={cn(
                  "absolute right-1.5 top-1.5 rounded-full p-1.5 shadow-sm transition-colors",
                  p.is_preview
                    ? "bg-brand text-white"
                    : "bg-white/90 text-zinc-700 opacity-0 hover:bg-white group-hover:opacity-100"
                )}
                title={p.is_preview ? "Included in preview — click to remove" : "Include in preview"}
              >
                <Star
                  className={cn("h-4 w-4", p.is_preview && "fill-current")}
                />
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute bottom-1.5 right-1.5 rounded-full bg-white/90 p-1.5 text-zinc-700 opacity-0 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {p.is_preview && (
                <div className="absolute bottom-1.5 left-1.5 rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  Preview
                </div>
              )}
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
        <p className="mt-2 text-xs text-muted-foreground">
          Tap the star to include a photo in your preview. 2&ndash;3 preview
          photos are shown to anyone before they&apos;ve unlocked your full
          listing. The first preview photo is used as the cover.
        </p>
      )}
    </div>
  );
}

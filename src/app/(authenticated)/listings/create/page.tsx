"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Building2,
  DoorOpen,
  HelpCircle,
  Upload,
  X,
  Eye,
  Loader2,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment", icon: Building2 },
  { value: "house", label: "House", icon: Home },
  { value: "room", label: "Room", icon: DoorOpen },
  { value: "other", label: "Other", icon: HelpCircle },
] as const;

const AMENITIES = [
  "wifi",
  "ac",
  "washer_dryer",
  "kitchen",
  "parking",
  "pets_ok",
  "pool",
  "gym",
  "backyard",
  "hot_tub",
] as const;

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

const VISIBILITY_OPTIONS = [
  { value: "anyone", label: "Anyone" },
  { value: "vouched", label: "Vouched members" },
  { value: "trusted", label: "Trusted (score)" },
  { value: "inner_circle", label: "Inner Circle" },
  { value: "specific", label: "Specific people" },
] as const;

interface PhotoState {
  file: File;
  previewUrl: string;
  isPreview: boolean;
  uploading: boolean;
  uploaded: boolean;
  publicUrl?: string;
  storagePath?: string;
}

export default function CreateListingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [propertyType, setPropertyType] = useState("");
  const [title, setTitle] = useState("");
  const [areaName, setAreaName] = useState("");
  const [description, setDescription] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [houseRules, setHouseRules] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [previewVisibility, setPreviewVisibility] = useState("anyone");
  const [fullVisibility, setFullVisibility] = useState("vouched");
  const [previewMinTrustScore, setPreviewMinTrustScore] = useState("50");
  const [fullMinTrustScore, setFullMinTrustScore] = useState("50");
  const [specificUserIds, setSpecificUserIds] = useState("");

  // Photos
  const [photos, setPhotos] = useState<PhotoState[]>([]);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAmenity(a: string) {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const newPhotos: PhotoState[] = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isPreview: photos.length === 0 && files.indexOf(file) === 0,
      uploading: false,
      uploaded: false,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    e.target.value = "";
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[idx].previewUrl);
      updated.splice(idx, 1);
      return updated;
    });
  }

  function togglePhotoPreview(idx: number) {
    setPhotos((prev) => {
      const updated = [...prev];
      const previewCount = updated.filter((p) => p.isPreview).length;
      if (updated[idx].isPreview) {
        updated[idx] = { ...updated[idx], isPreview: false };
      } else if (previewCount < 3) {
        updated[idx] = { ...updated[idx], isPreview: true };
      }
      return updated;
    });
  }

  async function uploadPhotos(): Promise<
    { public_url: string; storage_path: string; is_preview: boolean; sort_order: number }[]
  > {
    const uploaded: { public_url: string; storage_path: string; is_preview: boolean; sort_order: number }[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (photo.uploaded && photo.publicUrl && photo.storagePath) {
        uploaded.push({
          public_url: photo.publicUrl,
          storage_path: photo.storagePath,
          is_preview: photo.isPreview,
          sort_order: i,
        });
        continue;
      }

      setPhotos((prev) => {
        const u = [...prev];
        u[i] = { ...u[i], uploading: true };
        return u;
      });

      const formData = new FormData();
      formData.append("file", photo.file);

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const { public_url, storage_path } = await res.json();

      setPhotos((prev) => {
        const u = [...prev];
        u[i] = {
          ...u[i],
          uploading: false,
          uploaded: true,
          publicUrl: public_url,
          storagePath: storage_path,
        };
        return u;
      });

      uploaded.push({
        public_url,
        storage_path,
        is_preview: photo.isPreview,
        sort_order: i,
      });
    }

    return uploaded;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!propertyType) return setError("Select a property type.");
    if (!title.trim()) return setError("Title is required.");
    if (!areaName.trim()) return setError("Area name is required.");
    if (photos.length === 0) return setError("Add at least one photo.");
    if (!photos.some((p) => p.isPreview))
      return setError("Mark at least one photo as a preview photo.");

    setSubmitting(true);

    try {
      const uploadedPhotos = await uploadPhotos();

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_type: propertyType,
          title,
          area_name: areaName,
          description: description || null,
          price_min: priceMin ? parseInt(priceMin) : null,
          price_max: priceMax ? parseInt(priceMax) : null,
          house_rules: houseRules || null,
          amenities,
          preview_visibility: previewVisibility,
          full_visibility: fullVisibility,
          min_trust_score: Math.max(
            previewVisibility === "trusted" ? parseInt(previewMinTrustScore) || 0 : 0,
            fullVisibility === "trusted" ? parseInt(fullMinTrustScore) || 0 : 0
          ),
          specific_user_ids:
            specificUserIds
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          photos: uploadedPhotos,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create listing");
      }

      const { id } = await res.json();
      router.push(`/listings/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="font-sans text-2xl font-semibold text-foreground mb-1">
            Create a Listing
          </h1>
          <p className="text-foreground-secondary text-sm">
            Share your space with trusted members of the network.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Property Type */}
          <section>
            <Label className="mb-3 block">Property Type *</Label>
            <div className="grid grid-cols-4 gap-2">
              {PROPERTY_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setPropertyType(pt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all",
                    propertyType === pt.value
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border bg-white text-foreground-secondary hover:border-foreground-tertiary"
                  )}
                >
                  <pt.icon className="size-5" />
                  {pt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Basic Info */}
          <section className="space-y-4">
            <div>
              <Label htmlFor="title" className="mb-1.5 block">Title *</Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sunny Loft in Park Slope"
              />
            </div>

            <div>
              <Label htmlFor="area" className="mb-1.5 block">Area *</Label>
              <Input
                id="area"
                type="text"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="e.g. Park Slope, Brooklyn"
              />
            </div>

            <div>
              <Label htmlFor="description" className="mb-1.5 block">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Tell guests about your space..."
              />
            </div>
          </section>

          {/* Price Range */}
          <section>
            <Label className="mb-1.5 block">Price Range (USD / night)</Label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-tertiary">
                  $
                </span>
                <Input
                  type="number"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="Min"
                  min={0}
                  className="pl-7"
                />
              </div>
              <span className="text-foreground-tertiary">–</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-tertiary">
                  $
                </span>
                <Input
                  type="number"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="Max"
                  min={0}
                  className="pl-7"
                />
              </div>
            </div>
          </section>

          {/* Availability note */}
          <section className="rounded-xl border border-primary-border bg-primary-light p-4">
            <p className="text-sm text-foreground-secondary">
              <CalendarDays className="size-4 inline mr-1.5 text-primary" />
              <span className="font-medium text-foreground">
                Set your availability after creating the listing.
              </span>{" "}
              You&apos;ll use the calendar on your listing page to mark which
              dates are available, possibly available, or blocked.
            </p>
          </section>

          {/* House Rules */}
          <section>
            <Label htmlFor="rules" className="mb-1.5 block">House Rules</Label>
            <Textarea
              id="rules"
              value={houseRules}
              onChange={(e) => setHouseRules(e.target.value)}
              rows={3}
              placeholder="Any rules or expectations for guests..."
            />
          </section>

          {/* Amenities */}
          <section>
            <Label className="mb-1.5 block">Amenities</Label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    amenities.includes(a)
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border bg-white text-foreground-secondary hover:border-foreground-tertiary"
                  )}
                >
                  {AMENITY_LABELS[a]}
                </button>
              ))}
            </div>
          </section>

          {/* Visibility Settings */}
          <section className="space-y-4 rounded-xl border border-border bg-white p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Visibility Settings
            </h2>

            <div>
              <Label className="mb-1.5 block">Preview Visibility</Label>
              <p className="text-xs text-foreground-tertiary mb-2">
                Who can see the area, price range, and preview photos.
              </p>
              <select
                value={previewVisibility}
                onChange={(e) => setPreviewVisibility(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              >
                {VISIBILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {previewVisibility === "trusted" && (
                <div className="mt-2">
                  <Label className="text-xs">
                    Min trust score for preview (0–100)
                  </Label>
                  <Input
                    type="number"
                    value={previewMinTrustScore}
                    onChange={(e) => setPreviewMinTrustScore(e.target.value)}
                    min={0}
                    max={100}
                    className="w-32 mt-1"
                  />
                </div>
              )}
            </div>

            <div>
              <Label className="mb-1.5 block">Full Listing Visibility</Label>
              <p className="text-xs text-foreground-tertiary mb-2">
                Who can see the full listing, host identity, and contact you.
              </p>
              <select
                value={fullVisibility}
                onChange={(e) => setFullVisibility(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              >
                {VISIBILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {fullVisibility === "trusted" && (
                <div className="mt-2">
                  <Label className="text-xs">
                    Min trust score for full access (0–100)
                  </Label>
                  <Input
                    type="number"
                    value={fullMinTrustScore}
                    onChange={(e) => setFullMinTrustScore(e.target.value)}
                    min={0}
                    max={100}
                    className="w-32 mt-1"
                  />
                </div>
              )}
            </div>

            {(previewVisibility === "specific" ||
              fullVisibility === "specific") && (
              <div>
                <Label className="mb-1.5 block">Specific User IDs</Label>
                <p className="text-xs text-foreground-tertiary mb-2">
                  Comma-separated user IDs. User search coming in CC-6d.
                </p>
                <Input
                  type="text"
                  value={specificUserIds}
                  onChange={(e) => setSpecificUserIds(e.target.value)}
                  placeholder="user-id-1, user-id-2"
                />
              </div>
            )}
          </section>

          {/* Photos */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Photos *</Label>
              <span className="text-xs text-foreground-tertiary">
                {photos.filter((p) => p.isPreview).length}/3 preview photos
              </span>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-sm text-foreground-secondary transition-all hover:border-primary hover:bg-primary-light/30"
            >
              <Upload className="size-4" />
              Click to upload photos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border"
                  >
                    <img
                      src={photo.previewUrl}
                      alt={`Photo ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1.5 right-1.5 rounded-full bg-black/50 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePhotoPreview(idx)}
                      className={cn(
                        "absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all",
                        photo.isPreview
                          ? "bg-primary text-white"
                          : "bg-black/50 text-white opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <Eye className="size-3" />
                      {photo.isPreview ? "Preview" : "Set preview"}
                    </button>
                    {photo.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="size-5 animate-spin text-white" />
                      </div>
                    )}
                    {photo.uploaded && (
                      <div className="absolute top-1.5 left-1.5">
                        <CheckCircle2 className="size-4 text-green-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-border bg-red-light px-4 py-3 text-sm text-red">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Creating listing…
              </>
            ) : (
              "Create Listing"
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}

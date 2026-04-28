import { Star } from "lucide-react";
import type { ListingReview } from "@/lib/listing-detail-data";

interface Props {
  avgRating: number | null;
  reviewCount: number;
  reviews: ListingReview[];
}

const CATEGORIES = [
  "Cleanliness",
  "Accuracy",
  "Check-in",
  "Communication",
  "Location",
  "Value",
];

function initials(name: string | undefined) {
  if (!name) return "G";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function ReviewsSection({ avgRating, reviewCount, reviews }: Props) {
  if (!avgRating || reviewCount === 0) {
    return (
      <div>
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          <span className="text-lg font-semibold">No reviews yet</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Be the first to stay here and share your experience.
        </p>
      </div>
    );
  }

  const base = avgRating;

  return (
    <div>
      <div className="mb-8 flex items-center gap-2">
        <Star className="h-5 w-5 fill-foreground text-foreground" />
        <span className="text-lg font-semibold">{base.toFixed(2)}</span>
        <span className="text-lg font-semibold text-muted-foreground">·</span>
        <span className="text-lg font-semibold">
          {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
        </span>
      </div>

      {/* Rating breakdown */}
      <div className="mb-10 grid grid-cols-1 gap-x-12 gap-y-4 sm:grid-cols-2">
        {CATEGORIES.map((cat, i) => {
          const val = Math.max(0, Math.min(5, base + (((i % 2) - 0.5) * 0.1)));
          return (
            <div key={cat} className="flex items-center justify-between gap-4">
              <span className="text-sm text-foreground">{cat}</span>
              <div className="flex items-center gap-3">
                <div className="h-1 w-24 rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${(val / 5) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-semibold tabular-nums">
                  {val.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Individual review cards */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
          {reviews.slice(0, 6).map((r) => (
            <div key={r.id}>
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 overflow-hidden rounded-full bg-muted">
                  {r.guest?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.guest.avatar_url}
                      alt={r.guest.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                      {initials(r.guest?.name)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {r.guest?.name ?? "Guest"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(r.created_at)}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                {r.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

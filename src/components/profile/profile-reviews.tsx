"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ProfileReview } from "@/lib/profile-data";

interface Props {
  userName: string;
  reviewsOf: ProfileReview[];
  reviewsBy: ProfileReview[];
}

type Tab = "of" | "by";

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function ProfileReviews({ userName, reviewsOf, reviewsBy }: Props) {
  const [tab, setTab] = useState<Tab>("of");
  const firstName = userName.split(" ")[0];

  const rows = tab === "of" ? reviewsOf : reviewsBy;

  return (
    <div>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-white p-1">
        <TabButton active={tab === "of"} onClick={() => setTab("of")}>
          Reviews of {firstName} ({reviewsOf.length})
        </TabButton>
        <TabButton active={tab === "by"} onClick={() => setTab("by")}>
          Reviews by {firstName} ({reviewsBy.length})
        </TabButton>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            No reviews yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            {tab === "of"
              ? "Reviews appear after completed stays."
              : `${firstName} will write reviews after their completed stays.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-border bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {r.other_user?.avatar_url && (
                    <AvatarImage
                      src={r.other_user.avatar_url}
                      alt={r.other_user.name}
                    />
                  )}
                  <AvatarFallback className="text-xs">
                    {initials(r.other_user?.name || "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {r.other_user?.name || "Someone"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(r.created_at)}
                  </div>
                </div>
              </div>

              {r.rating !== null && (
                <div className="mt-3 flex items-center gap-1 text-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i < (r.rating ?? 0)
                          ? "fill-foreground text-foreground"
                          : "text-muted-foreground/40"
                      )}
                    />
                  ))}
                </div>
              )}

              <p className="mt-3 text-sm leading-6 text-foreground whitespace-pre-wrap">
                {r.text}
              </p>

              {r.listing && (
                <Link
                  href={`/listings/${r.listing.id}`}
                  className="mt-3 inline-block text-xs font-medium text-brand hover:underline"
                >
                  {r.listing.area_name} · {r.listing.title}
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

// REMOVE BEFORE BETA — Dev2 (design system page).
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrustTag } from "@/components/trust/trust-tag";
import { ProfileReviews } from "@/components/profile/profile-reviews";
import { ProposalCard } from "@/components/proposals/proposal-card";
import {
  fakeAvatar,
  sampleProposals,
  DEV_VIEWER_ID,
} from "@/lib/dev-theme/fixtures";
import { PageChrome } from "./Chrome";

interface Props {
  degree: 1 | 2 | 3 | 4 | null;
}

const sampleReviewsOf = [
  {
    id: "ro-1",
    rating: 5,
    text: "Wonderful host — Sarah was incredibly welcoming and prompt to respond. The space was exactly as described.",
    created_at: "2026-02-14T10:00:00Z",
    other_user: {
      id: "g1",
      name: "Loren Polster",
      avatar_url: fakeAvatar("loren"),
    },
    listing: {
      id: "l1",
      title: "Sun-drenched studio with garden access",
      area_name: "Mission District, San Francisco",
    },
  },
  {
    id: "ro-2",
    rating: 5,
    text: "We loved our stay. Sarah went above and beyond — left fresh fruit and great neighborhood tips.",
    created_at: "2025-11-22T10:00:00Z",
    other_user: {
      id: "g2",
      name: "Mike Tran",
      avatar_url: fakeAvatar("mike"),
    },
    listing: {
      id: "l1",
      title: "Sun-drenched studio with garden access",
      area_name: "Mission District, San Francisco",
    },
  },
];

const sampleReviewsBy = [
  {
    id: "rb-1",
    rating: 5,
    text: "Easy guests — left the place spotless. Would host again.",
    created_at: "2026-02-14T10:00:00Z",
    other_user: {
      id: "g1",
      name: "Loren Polster",
      avatar_url: fakeAvatar("loren"),
    },
    listing: null,
  },
];

export function ProfilePageV1({ degree }: Props) {
  const isOwn = false;
  const isPreview = degree === null;
  const profileProposals = sampleProposals.slice(0, 2);

  return (
    <PageChrome>
      <div className="mx-auto w-full max-w-[1040px] px-4 py-6 md:px-6 md:py-10">
        {/* Header card */}
        <div className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-white p-6 md:flex-row md:items-center md:p-8">
          <Avatar className="h-28 w-28 md:h-32 md:w-32">
            <AvatarImage src={fakeAvatar("sarah")} alt="Sarah Mendel" />
            <AvatarFallback>SM</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold md:text-3xl">
              {isPreview ? "Sarah M." : "Sarah Mendel"}
            </h1>
            {isPreview && (
              <span className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                Preview profile
              </span>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Member since June 2023
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                San Francisco, CA
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                Architect
              </span>
              <TrustTag
                size="medium"
                degree={degree}
                hostRating={4.92}
                hostReviewCount={47}
                showSubtext
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {isOwn ? (
              <Link
                href="#"
                className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                Edit profile
              </Link>
            ) : (
              <>
                <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
                  {degree === 1 ? "Update vouch" : "Vouch for Sarah"}
                </button>
                <button className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
                  Message
                </button>
              </>
            )}
          </div>
        </div>

        {/* About */}
        <Section title="About">
          <p className="text-sm text-foreground/90">
            {isPreview
              ? "Bio hidden until you reach 2° trust."
              : "Architect. Love hosting people who appreciate small spaces, thoughtful design, and dog-friendly cabins."}
          </p>
        </Section>

        {/* Listings */}
        {!isPreview && (
          <Section title="Sarah's listings">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map((i) => (
                <Link
                  key={i}
                  href="#"
                  className="block overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-md"
                >
                  <div
                    className="aspect-[4/3] bg-cover bg-center"
                    style={{
                      backgroundImage: `url(https://images.unsplash.com/photo-${
                        i === 1
                          ? "1505691938895-1758d7feb511"
                          : "1493809842364-78817add7ffb"
                      }?w=600&q=70)`,
                    }}
                  />
                  <div className="p-3">
                    <p className="text-sm font-semibold">
                      {i === 1
                        ? "Sun-drenched studio with garden access"
                        : "Mission flat with bay window"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mission District, SF
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="font-semibold">$140–$185</span>{" "}
                      <span className="text-muted-foreground">/ night</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Proposals */}
        {!isPreview && profileProposals.length > 0 && (
          <Section title="Sarah's proposals">
            <ul className="flex flex-col gap-4">
              {profileProposals.map((p) => (
                <li key={p.row.id}>
                  <ProposalCard proposal={p} viewerId={DEV_VIEWER_ID} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Reviews */}
        {!isPreview && (
          <Section title="Reviews">
            <ProfileReviews
              userName="Sarah Mendel"
              reviewsOf={sampleReviewsOf}
              reviewsBy={sampleReviewsBy}
            />
          </Section>
        )}

        {isPreview && (
          <Section title="Reviews">
            <div className="rounded-2xl border-2 border-dashed bg-muted/30 p-6 text-center">
              <p className="font-semibold">Reviews hidden</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Reach 2° trust to unlock Sarah&apos;s review history.
              </p>
            </div>
          </Section>
        )}
      </div>
    </PageChrome>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

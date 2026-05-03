import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  CheckCircle2,
  AlertCircle,
  MapPin,
  Briefcase,
  Languages,
  Info,
  Star,
  Sparkles,
} from "lucide-react";
import { getProfileById, type ProfileReview } from "@/lib/profile-data";
import { computeTrustPath } from "@/lib/trust-data";
import { getEffectiveUserId } from "@/lib/impersonation/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileReviews } from "@/components/profile/profile-reviews";
import { VouchPrompt } from "@/components/profile/vouch-prompt";
import { VouchButton } from "@/components/trust/vouch-button";
import { ContactButton } from "@/components/profile/contact-button";
import { ConnectionPopover } from "@/components/trust/connection-breakdown";
import { ConnectionPath } from "@/components/trust/connection-path";
import { TrustTag } from "@/components/trust/trust-tag";
import {
  TrustBadge,
  MacroDegreePill,
  MacroConnectorStrip,
} from "@/components/trust/trust-badge";
import { toTrustBadgeData } from "@/lib/trust/badge";
import { ReportUserButton } from "@/components/safety/report-user-button";
import { PreviewBadge } from "@/components/profile/preview-badge";
import { fetchVisibleProposals } from "@/lib/proposals-data";
import { ProposalCard } from "@/components/proposals/proposal-card";

export const runtime = "edge";
export const dynamic = "force-dynamic";

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

function formatMemberSince(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfileById(id);
  if (!profile) notFound();

  const { user, listings, reviewsOf, reviewsBy } = profile;

  // Figure out whether this is the signed-in user viewing their own profile.
  const { userId: clerkId } = await auth();
  // ALPHA ONLY: impersonation-aware viewer resolution.
  const viewerId = await getEffectiveUserId(clerkId);
  const isOwn = !!viewerId && viewerId === user.id;

  // Compute viewer → this-profile trust only when the viewer isn't
  // looking at themselves.
  const trust =
    viewerId && !isOwn ? await computeTrustPath(viewerId, user.id) : null;

  // Preview mode = signed-in viewer, not self, not directly
  // vouched / 1°. The badge is informational — the page still
  // renders the full profile — and nudges the viewer to grow a
  // deeper connection before exchanging intros. Reuses the same
  // trust fields that drive the trust-tag on the profile.
  const isPreview =
    !!viewerId &&
    !isOwn &&
    (!trust || (!trust.hasDirectVouch && trust.degree !== 1));

  // Author's active proposals that the viewer can see. Empty when the
  // viewer has no path in or the author hasn't posted anything; the
  // section hides itself in that case so we don't render dead space.
  const profileProposals = viewerId
    ? await fetchVisibleProposals({
        viewerId,
        authorId: user.id,
        includeOwn: isOwn,
        limit: 5,
      })
    : [];

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 py-6 md:px-6 md:py-10">
      {/* Header card */}
      <div className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-white p-6 md:flex-row md:items-center md:p-8">
        <ConnectionPopover
          targetUserId={user.id}
          isSelf={isOwn}
          disabled={trust?.degree === 1 || trust?.hasDirectVouch}
        >
          <Avatar className="h-28 w-28 md:h-32 md:w-32 cursor-pointer">
            {user.avatar_url && (
              <AvatarImage src={user.avatar_url} alt={user.name} />
            )}
            <AvatarFallback className="text-2xl">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        </ConnectionPopover>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold md:text-3xl">{user.name}</h1>
            {trust && !isOwn && (
              <MacroDegreePill
                data={toTrustBadgeData(
                  {
                    degree: trust.degree,
                    score: trust.score,
                    hasDirectVouch: trust.hasDirectVouch,
                    connectorPaths: trust.connectorPaths,
                  },
                  {
                    vouch_score: user.vouch_score,
                    host_rating: user.host_rating,
                    host_review_count: user.host_review_count ?? 0,
                  }
                )}
              />
            )}
            {isPreview && <PreviewBadge />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Member since {formatMemberSince(user.created_at)}
          </p>

          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {user.location && (
              <InfoChip icon={MapPin} label={user.location} />
            )}
            {user.occupation && (
              <InfoChip icon={Briefcase} label={user.occupation} />
            )}
            {user.languages && user.languages.length > 0 && (
              <InfoChip
                icon={Languages}
                label={`Speaks ${user.languages.join(", ")}`}
              />
            )}
            {user.phone_number ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Phone verified
              </span>
            ) : (
              // No phone on file — user signed up via Google / email
              // and hit "Skip for now" on the phone step. Flag visibly
              // so hosts can see at a glance that this account is not
              // phone-verified yet. They regain the green badge by
              // adding + verifying a number from /profile/edit.
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                Unverified
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isOwn ? (
            <Link
              href="/profile/edit"
              className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90"
            >
              Edit profile
            </Link>
          ) : (
            <>
              <VouchButton
                targetId={user.id}
                targetName={user.name}
                targetAvatar={user.avatar_url}
                isOwnProfile={isOwn}
                variant="outline"
                className="h-auto rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              />
              <ContactButton
                targetUserId={user.id}
                targetName={user.name}
              />
              <ReportUserButton
                reportedUserId={user.id}
                reportedUserName={user.name}
                sourceContext={{ source: "profile", profile_id: user.id }}
              />
            </>
          )}
        </div>
      </div>

      {/* Request-a-vouch prompt — only renders when ?vouch=1 is present.
          0° users share this link to nudge someone to vouch for them. */}
      <VouchPrompt
        targetId={user.id}
        targetName={user.name}
        targetAvatar={user.avatar_url}
        isSignedIn={Boolean(viewerId)}
        isOwnProfile={isOwn}
      />

      {/* Trust / vouch section — different content for own vs other */}
      {isOwn ? (
        <>
          <OwnTrustSection user={user} />
          {/* B8: training-wheels social proof. Demo-origin vouches
              show ONLY on the user's own profile — every other-view
              code path filters them out. The list itself is fetched
              inline below since this is the single read site that
              wants the demo subset. */}
          <DemoConnectionsSelfView userId={user.id} />
        </>
      ) : trust ? (
        <OtherTrustSection
          user={{
            id: user.id,
            name: user.name,
            avatar_url: user.avatar_url,
            vouch_score: user.vouch_score,
            host_rating: user.host_rating,
            host_review_count: user.host_review_count,
          }}
          trust={trust}
        />
      ) : null}

      {/* About */}
      <Section title="About">
        {user.bio ? (
          <p className="text-sm leading-6 text-foreground whitespace-pre-wrap">
            {user.bio}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isOwn
              ? "Add a short bio so guests and hosts can get to know you."
              : `${user.name} hasn't written a bio yet.`}
          </p>
        )}
      </Section>

      {/* Listings */}
      {listings.length > 0 && (
        <Section title={`${user.name.split(" ")[0]}'s listings`}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <Link
                key={l.id}
                href={`/listings/${l.id}`}
                className="group block"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                  {l.photos[0]?.public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.photos[0].public_url}
                      alt={l.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      No photo
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="line-clamp-1 text-sm font-semibold">
                    {l.area_name}
                  </h3>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {l.title}
                  </p>
                  {(l.price_min ?? l.price_max) && (
                    <p className="mt-1 text-sm">
                      <span className="font-semibold">
                        ${l.price_min ?? l.price_max}
                      </span>
                      <span className="text-muted-foreground"> night</span>
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Proposals */}
      {profileProposals.length > 0 && viewerId && (
        <Section title={`${user.name.split(" ")[0]}'s proposals`}>
          <ul className="flex flex-col gap-4">
            {profileProposals.slice(0, 5).map((p) => (
              <li key={p.row.id}>
                <ProposalCard proposal={p} viewerId={viewerId} />
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Link
              href={`/proposals?author=${user.id}`}
              className="text-sm font-semibold text-foreground hover:underline"
            >
              See all →
            </Link>
          </div>
        </Section>
      )}

      {/* Reviews (tabbed) */}
      <Section title="Reviews">
        <ProfileReviews
          userName={user.name}
          reviewsOf={reviewsOf as ProfileReview[]}
          reviewsBy={reviewsBy as ProfileReview[]}
        />
      </Section>
    </div>
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
      <h2 className="text-lg font-semibold md:text-xl">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function OwnTrustSection({
  user,
}: {
  user: Awaited<ReturnType<typeof getProfileById>> extends infer T
    ? T extends { user: infer U }
      ? U
      : never
    : never;
}) {
  const power = user.vouch_power ?? 1;
  const given = user.vouch_count_given ?? 0;
  const received = user.vouch_count_received ?? 0;
  return (
    <Section title="Your Trust Score">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          primary={`${power.toFixed(2)}×`}
          label="Vouch power"
          hint="Boosts the weight of every vouch you write. Derived from the avg guest rating of people you've vouched for."
        />
        <StatCard
          primary={String(given)}
          secondary={String(received)}
          label="Vouches given · received"
          hint="Track your network activity. Each vouch you receive raises your 1° score with everyone the voucher knows."
        />
        <StatCard
          primary={
            user.host_rating !== null ? user.host_rating.toFixed(2) : "—"
          }
          secondary={
            user.guest_rating !== null ? user.guest_rating.toFixed(2) : "—"
          }
          label="Host · Guest rating"
          hint="Your average ratings from people who've stayed with you or whom you've stayed with."
          star
        />
      </div>
    </Section>
  );
}

function StatCard({
  primary,
  secondary,
  label,
  hint,
  star = false,
}: {
  primary: string;
  secondary?: string;
  label: string;
  hint: string;
  star?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-foreground">
          {primary}
        </span>
        {secondary !== undefined && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {secondary}
            </span>
          </>
        )}
        {star && (
          <Star className="ml-1 h-4 w-4 fill-amber-400 text-amber-400" />
        )}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{label}</div>
      <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        <span>{hint}</span>
      </div>
    </div>
  );
}

function OtherTrustSection({
  user,
  trust,
}: {
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
    vouch_score: number | null;
    host_rating: number | null;
    host_review_count: number | null;
  };
  trust: NonNullable<Awaited<ReturnType<typeof computeTrustPath>>>;
}) {
  const first = user.name.split(" ")[0];
  const badgeData = toTrustBadgeData(
    {
      degree: trust.degree,
      score: trust.score,
      hasDirectVouch: trust.hasDirectVouch,
      connectorPaths: trust.connectorPaths,
    },
    {
      vouch_score: user.vouch_score,
      host_rating: user.host_rating,
      host_review_count: user.host_review_count ?? 0,
    }
  );
  return (
    <Section title={`Your connection to ${first}`}>
      <TrustBadge size="macro" data={badgeData} />
      {badgeData.connectors.length > 0 && (
        <div className="mt-4">
          <MacroConnectorStrip connectors={badgeData.connectors} />
        </div>
      )}
      <div className="mt-6">
        <div className="rounded-2xl border border-border bg-white p-5">
          {trust.path.length >= 2 ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Strongest path
              </div>
              <div className="mt-3 overflow-x-auto">
                <ConnectionPath path={trust.path} />
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              You don&apos;t share any connections with {first} yet. Grow your
              network and these paths will light up automatically.
            </div>
          )}
          {trust.mutualConnections.length > 0 && (
            <>
              <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mutual connections
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {trust.mutualConnections.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/profile/${c.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      <Avatar className="h-5 w-5">
                        {c.avatar_url && (
                          <AvatarImage src={c.avatar_url} alt={c.name} />
                        )}
                        <AvatarFallback className="text-[9px]">
                          {initialsOf(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      {c.name.split(" ")[0]}
                    </Link>
                  </li>
                ))}
                {trust.mutualConnections.length > 8 && (
                  <li className="inline-flex items-center rounded-full bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
                    +{trust.mutualConnections.length - 8} more
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

function InfoChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      {label}
    </span>
  );
}

/**
 * B8 self-view section: lists the demo-origin vouches that the
 * server-side auto-vouch routine in the Clerk webhook seeded for
 * this user on signup. Renders only on the user's OWN profile.
 *
 * Other-view paths never load these rows because every read query
 * in src/lib/trust-data.ts, compute-score.ts, network-data.ts,
 * etc. now filters .eq("is_demo_origin", false) and the matching
 * RPCs in migration 054 do the same.
 */
async function DemoConnectionsSelfView({ userId }: { userId: string }) {
  const supabase = getSupabaseAdmin();
  const { data: rows } = await supabase
    .from("vouches")
    .select("voucher_id, vouch_type, years_known_bucket, vouch_score, created_at")
    .eq("vouchee_id", userId)
    .eq("is_demo_origin", true)
    .order("created_at", { ascending: false });

  const demoVouches = (rows ?? []) as Array<{
    voucher_id: string;
    vouch_type: "standard" | "inner_circle";
    years_known_bucket: string;
    vouch_score: number | null;
    created_at: string;
  }>;
  if (demoVouches.length === 0) return null;

  const voucherIds = demoVouches.map((r) => r.voucher_id);
  const { data: voucherProfiles } = await supabase
    .from("users")
    .select("id, name, avatar_url, bio")
    .in("id", voucherIds);

  type VoucherProfile = {
    id: string;
    name: string;
    avatar_url: string | null;
    bio: string | null;
  };
  const profileById = new Map<string, VoucherProfile>(
    ((voucherProfiles ?? []) as VoucherProfile[]).map((u) => [u.id, u])
  );

  return (
    <Section title="Welcome connections">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            These are demo connections so you can see what social proof
            looks like before your real network arrives. Only you can see
            them — they don&apos;t count toward anyone&apos;s trust score
            and they aren&apos;t visible to other members on your profile.
          </p>
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {demoVouches.map((v) => {
            const prof = profileById.get(v.voucher_id);
            return (
              <li
                key={v.voucher_id}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  {prof?.avatar_url && (
                    <AvatarImage src={prof.avatar_url} alt={prof.name} />
                  )}
                  <AvatarFallback className="text-xs">
                    {prof ? initialsOf(prof.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {prof?.name ?? "Demo connection"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    Vouched for you
                  </div>
                </div>
                <DemoConnectionPill />
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

/**
 * "Demo connection" pill. Shape mirrors the existing PreviewBadge
 * (rounded-full, small icon, soft tint) so the visual vocabulary
 * stays consistent with other "this is a special row" labels.
 * Amber tint distinguishes it from the green Phone-verified chip
 * and the red Unverified chip in the header.
 */
function DemoConnectionPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
      <Sparkles className="h-3 w-3" />
      Demo connection
    </span>
  );
}

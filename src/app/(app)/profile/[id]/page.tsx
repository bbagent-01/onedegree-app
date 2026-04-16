import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { CheckCircle2, MapPin, Briefcase, Languages } from "lucide-react";
import { getProfileById, type ProfileReview } from "@/lib/profile-data";
import { getSupabaseAdmin } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileReviews } from "@/components/profile/profile-reviews";
import { VouchButton } from "@/components/trust/vouch-button";

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
  let isOwn = false;
  if (clerkId) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .maybeSingle();
    isOwn = data?.id === user.id;
  }

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 py-6 md:px-6 md:py-10">
      {/* Header card */}
      <div className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-white p-6 md:flex-row md:items-center md:p-8">
        <Avatar className="h-28 w-28 md:h-32 md:w-32">
          {user.avatar_url && (
            <AvatarImage src={user.avatar_url} alt={user.name} />
          )}
          <AvatarFallback className="text-2xl">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold md:text-3xl">{user.name}</h1>
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
            {user.email && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Email verified
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
              />
              <Link
                href="/inbox"
                className="rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Contact
              </Link>
            </>
          )}
        </div>
      </div>

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

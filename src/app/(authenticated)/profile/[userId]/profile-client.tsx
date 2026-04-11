"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Star,
  UserCheck,
  Pencil,
  Check,
  X,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TrustScoreBadge } from "@/components/trust-score-badge";
import { VouchModal } from "@/components/vouch/VouchModal";

interface VouchEntry {
  userId: string;
  name: string;
  avatar_url: string | null;
  vouch_type: "standard" | "inner_circle";
}

interface ListingSummary {
  id: string;
  title: string;
  area_name: string;
  price_min: number | null;
  price_max: number | null;
  property_type: string;
}

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  guest_rating: number | null;
  guest_review_count: number;
  host_rating: number | null;
  host_review_count: number;
  vouch_power: number | null;
}

interface SharedConnector {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface ProfileClientProps {
  profileUser: ProfileUser;
  isOwnProfile: boolean;
  vouchesReceived: VouchEntry[];
  vouchesGiven: VouchEntry[];
  scoreVsViewer: { score: number; connection_count: number };
  sharedConnectors: SharedConnector[];
  existingVouch: { vouch_type: string } | null;
  viewerVouchedForIds: string[];
  listings: ListingSummary[];
}

function VouchList({
  vouches,
  label,
  viewerVouchedForIds,
}: {
  vouches: VouchEntry[];
  label: string;
  viewerVouchedForIds: string[];
}) {
  if (vouches.length === 0)
    return (
      <p className="text-xs text-foreground-tertiary">No {label.toLowerCase()} yet.</p>
    );

  return (
    <div className="space-y-2">
      {vouches.map((v) => (
        <Link
          key={v.userId}
          href={`/profile/${v.userId}`}
          className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2 hover:border-primary-border transition-colors"
        >
          {v.avatar_url ? (
            <img
              src={v.avatar_url}
              alt={v.name}
              className="size-8 rounded-full object-cover"
            />
          ) : (
            <div className="size-8 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-semibold">
              {v.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {v.name}
            </p>
            {viewerVouchedForIds.includes(v.userId) && (
              <p className="text-[10px] text-trust-solid">Direct vouch</p>
            )}
          </div>
          <Badge
            variant={v.vouch_type === "inner_circle" ? "default" : "secondary"}
          >
            {v.vouch_type === "inner_circle" ? "Inner Circle ★" : "Standard"}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

export function ProfileClient({
  profileUser,
  isOwnProfile,
  vouchesReceived,
  vouchesGiven,
  scoreVsViewer,
  sharedConnectors,
  existingVouch,
  viewerVouchedForIds,
  listings,
}: ProfileClientProps) {
  const router = useRouter();
  const [showVouchModal, setShowVouchModal] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState(profileUser.bio ?? "");
  const [savingBio, setSavingBio] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function saveBio() {
    setSavingBio(true);
    try {
      const res = await fetch("/api/users/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      if (!res.ok) throw new Error();
      setEditingBio(false);
      setToast("Bio updated");
    } catch {
      setToast("Failed to save bio");
    } finally {
      setSavingBio(false);
    }
  }

  const priceLabel = (l: ListingSummary) =>
    l.price_min && l.price_max
      ? `$${l.price_min}–$${l.price_max}`
      : l.price_min
        ? `From $${l.price_min}`
        : l.price_max
          ? `Up to $${l.price_max}`
          : null;

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        {profileUser.avatar_url ? (
          <img
            src={profileUser.avatar_url}
            alt={profileUser.name}
            className="size-20 rounded-full object-cover border-2 border-border"
          />
        ) : (
          <div className="size-20 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-2xl border-2 border-border">
            {profileUser.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">
            {profileUser.name}
          </h1>

          {/* Bio */}
          {isOwnProfile ? (
            editingBio ? (
              <div className="mt-2">
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  placeholder="Tell people about yourself..."
                />
                <div className="flex gap-2 mt-1">
                  <Button
                    size="sm"
                    onClick={saveBio}
                    disabled={savingBio}
                  >
                    <Check className="size-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingBio(false);
                      setBio(profileUser.bio ?? "");
                    }}
                  >
                    <X className="size-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                {bio ? (
                  <p className="text-sm text-foreground-secondary">{bio}</p>
                ) : (
                  <p className="text-sm text-foreground-tertiary italic">
                    No bio yet.
                  </p>
                )}
                <button
                  onClick={() => setEditingBio(true)}
                  className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Pencil className="size-3" />
                  Edit bio
                </button>
              </div>
            )
          ) : (
            profileUser.bio && (
              <p className="mt-1 text-sm text-foreground-secondary">
                {profileUser.bio}
              </p>
            )
          )}

          {/* Vouch button (other user's profile) */}
          {!isOwnProfile && (
            <div className="mt-3">
              <Button
                size="sm"
                onClick={() => setShowVouchModal(true)}
                variant={existingVouch ? "outline" : "default"}
              >
                {existingVouch ? (
                  <>
                    <Pencil className="size-3.5 mr-1" />
                    Update Vouch
                  </>
                ) : (
                  <>
                    <UserCheck className="size-3.5 mr-1" />
                    Vouch for {profileUser.name.split(" ")[0]}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Trust Metrics */}
      <section className="mb-8">
        <h2 className="text-lg text-foreground mb-3">Trust Metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Connection Status */}
          <div className="rounded-xl border border-border bg-white/60 backdrop-blur-lg p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-[10px] font-medium text-foreground-secondary mb-2">
              Connection
            </p>
            {isOwnProfile ? (
              <>
                <p className="font-mono text-2xl font-semibold text-foreground-tertiary">
                  —
                </p>
                <p className="text-[10px] text-foreground-tertiary mt-1">
                  Depends on viewer
                </p>
              </>
            ) : existingVouch ? (
              <>
                <div className="flex items-center justify-center gap-1">
                  <UserCheck className="size-5 text-trust-solid" />
                </div>
                <p className="text-xs font-medium text-trust-solid mt-1">
                  Direct Vouch
                </p>
                <p className="text-[10px] text-foreground-tertiary mt-0.5">
                  {existingVouch.vouch_type === "inner_circle"
                    ? "Inner Circle ★"
                    : "Standard"}
                </p>
                {scoreVsViewer.score > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <TrustScoreBadge score={scoreVsViewer.score} size="sm" />
                    {sharedConnectors.length > 0 && (
                      <p className="text-[10px] text-foreground-tertiary mt-1">
                        via {sharedConnectors.map((c) => c.name.split(" ")[0]).join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : scoreVsViewer.score > 0 ? (
              <>
                <TrustScoreBadge
                  score={scoreVsViewer.score}
                  size="lg"
                  vouchCount={scoreVsViewer.connection_count}
                />
                {sharedConnectors.length > 0 && (
                  <p className="text-[10px] text-foreground-secondary mt-2">
                    via {sharedConnectors.map((c) => c.name.split(" ")[0]).join(", ")}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-mono text-2xl font-semibold text-foreground-tertiary">
                  —
                </p>
                <p className="text-[10px] text-foreground-tertiary mt-1">
                  Not connected
                </p>
              </>
            )}
          </div>

          {/* Guest Rating */}
          <div className="rounded-xl border border-border bg-white/60 backdrop-blur-lg p-4 text-center">
            <p className="text-[10px] font-medium text-foreground-secondary mb-2">
              Guest Rating
            </p>
            {profileUser.guest_rating ? (
              <div className="flex items-center justify-center gap-1">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                <span className="font-mono text-2xl font-semibold text-foreground">
                  {profileUser.guest_rating.toFixed(1)}
                </span>
              </div>
            ) : (
              <p className="font-mono text-2xl font-semibold text-foreground-tertiary">
                —
              </p>
            )}
            <p className="text-[10px] text-foreground-tertiary mt-1">
              {profileUser.guest_review_count > 0
                ? `${profileUser.guest_review_count} stay${profileUser.guest_review_count !== 1 ? "s" : ""}`
                : "No stays yet"}
            </p>
          </div>

          {/* Vouch Power */}
          <div className="rounded-xl border border-border bg-white/60 backdrop-blur-lg p-4 text-center">
            <p className="text-[10px] font-medium text-foreground-secondary mb-2">
              Vouch Power
            </p>
            <p className="font-mono text-2xl font-semibold text-foreground">
              {profileUser.vouch_power?.toFixed(1) ?? "—"}
            </p>
          </div>

          {/* Host Rating */}
          {listings.length > 0 && (
            <div className="rounded-xl border border-border bg-white/60 backdrop-blur-lg p-4 text-center">
              <p className="text-[10px] font-medium text-foreground-secondary mb-2">
                Host Rating
              </p>
              {profileUser.host_rating ? (
                <div className="flex items-center justify-center gap-1">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <span className="font-mono text-2xl font-semibold text-foreground">
                    {profileUser.host_rating.toFixed(1)}
                  </span>
                </div>
              ) : (
                <p className="font-mono text-2xl font-semibold text-foreground-tertiary">
                  —
                </p>
              )}
              <p className="text-[10px] text-foreground-tertiary mt-1">
                {profileUser.host_review_count > 0
                  ? `${profileUser.host_review_count} review${profileUser.host_review_count !== 1 ? "s" : ""}`
                  : "No reviews yet"}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Vouches Received */}
      <section className="mb-8">
        <h2 className="text-lg text-foreground mb-3">
          Vouches Received{" "}
          <span className="text-sm text-foreground-tertiary">
            ({vouchesReceived.length})
          </span>
        </h2>
        <VouchList vouches={vouchesReceived} label="vouches received" viewerVouchedForIds={viewerVouchedForIds} />
      </section>

      {/* Vouches Given */}
      <section className="mb-8">
        <h2 className="text-lg text-foreground mb-3">
          Vouches Given{" "}
          <span className="text-sm text-foreground-tertiary">
            ({vouchesGiven.length})
          </span>
        </h2>
        <VouchList vouches={vouchesGiven} label="vouches given" viewerVouchedForIds={viewerVouchedForIds} />
      </section>

      {/* Listings */}
      {listings.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg text-foreground mb-3">
            {isOwnProfile ? "My Listings" : "Listings"}{" "}
            <span className="text-sm text-foreground-tertiary">
              ({listings.length})
            </span>
          </h2>
          <div className="space-y-2">
            {listings.map((l) => (
              <Link
                key={l.id}
                href={`/listings/${l.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3 hover:border-primary-border transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {l.title}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-foreground-secondary">
                    <MapPin className="size-3" />
                    {l.area_name}
                  </p>
                </div>
                {priceLabel(l) && (
                  <span className="text-sm font-medium text-foreground">
                    {priceLabel(l)}/night
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Not connected state (other user, no score, no vouch) */}
      {!isOwnProfile &&
        scoreVsViewer.score === 0 &&
        !existingVouch && (
          <div className="rounded-xl border border-border bg-background-mid p-5 text-center">
            <Users className="size-8 text-foreground-tertiary mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              Not yet connected
            </p>
            <p className="text-xs text-foreground-secondary mt-1">
              Vouch for {profileUser.name.split(" ")[0]} or get vouched by
              someone in their network to build a trust connection.
            </p>
          </div>
        )}

      {/* Vouch Modal */}
      {showVouchModal && (
        <VouchModal
          targetUserId={profileUser.id}
          targetName={profileUser.name}
          onClose={() => setShowVouchModal(false)}
          onSuccess={(points) => {
            setShowVouchModal(false);
            setToast(
              `Vouched for ${profileUser.name.split(" ")[0]} · ${points} pts`
            );
            router.refresh();
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-3 shadow-lg">
            <Check className="size-4 text-trust-solid" />
            <span className="text-sm font-medium text-foreground">{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { VouchModal } from "@/components/trust/vouch-modal";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";
import type { VouchType } from "@/lib/vouch-constants";

interface Props {
  targetId: string;
  targetName: string;
  targetAvatar?: string | null;
  isSignedIn: boolean;
  isOwnProfile: boolean;
}

interface ExistingVouch {
  vouch_type: VouchType;
  years_known_bucket: string;
  vouch_score?: number | null;
}

/**
 * `/profile/[id]?vouch=1` anchor — lets 0° users share a link that
 * nudges someone who knows them to vouch without hunting for the
 * Vouch button. Behaviour:
 *   - signed-in, viewing someone else → auto-open VouchModal once.
 *   - signed-in, viewing own profile → dismissible prompt explaining
 *     how to share the link.
 *   - signed-out → prompt to sign in, preserving the vouch=1 param so
 *     the modal opens on return.
 */
export function VouchPrompt({
  targetId,
  targetName,
  targetAvatar,
  isSignedIn,
  isOwnProfile,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const asked = params.get("vouch") === "1";

  const [dismissed, setDismissed] = useState(false);
  const [existingVouch, setExistingVouch] = useState<ExistingVouch | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  // Pull existing vouch state so the modal opens in edit-mode when
  // the viewer has already vouched for this person.
  useEffect(() => {
    if (!asked || !isSignedIn || isOwnProfile) return;
    let cancelled = false;
    fetch(`/api/vouches?targetId=${targetId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.vouch) setExistingVouch(data.vouch);
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        if (!autoOpened) {
          setAutoOpened(true);
          setModalOpen(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [asked, isSignedIn, isOwnProfile, targetId, autoOpened]);

  if (!asked || dismissed) return null;

  const firstName = targetName.split(" ")[0];

  // Own-profile: the user opened their own vouch-for-me link. Help
  // them share it instead of pretending someone can vouch here.
  if (isOwnProfile) {
    return (
      <div className="mt-6 rounded-2xl border border-brand/20 bg-brand/5 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand">
            <Shield className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">
              This is your &ldquo;vouch for me&rdquo; link.
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Share this URL with someone who knows you. When they open it,
              they&rsquo;ll see a prompt to vouch for you.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDismissed(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Signed-out: bounce through sign-in, preserving the vouch=1 param
  // so the modal opens after auth.
  if (!isSignedIn) {
    const returnUrl = `/profile/${targetId}?vouch=1`;
    return (
      <div className="mt-6 rounded-2xl border border-brand/20 bg-brand/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-foreground">
              {firstName} asked you to vouch for them.
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              A vouch tells hosts {firstName} is someone real you trust. Sign
              in to continue.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`}
                className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Sign in to vouch
              </Link>
              <Link
                href={`/sign-up?redirect_url=${encodeURIComponent(returnUrl)}`}
                className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Signed-in, other's profile: show a small banner + keep the modal
  // ready to reopen (auto-opens once on mount via the effect above).
  return (
    <>
      <div className="mt-6 rounded-2xl border border-brand/20 bg-brand/5 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand">
            <Shield className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">
              {firstName} asked you to vouch for them.
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Vouches help hosts decide who can see their listings. Only vouch
              for someone you actually know.
            </p>
            <div className="mt-3">
              <Button
                onClick={() => setModalOpen(true)}
                className="h-9 gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-600"
              >
                <Shield className="h-4 w-4" />
                {existingVouch
                  ? `Update vouch for ${firstName}`
                  : `Vouch for ${firstName}`}
              </Button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => {
              setDismissed(true);
              // Drop ?vouch=1 from the URL so refresh doesn't re-open.
              router.replace(`/profile/${targetId}`);
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <VouchModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        target={{ id: targetId, name: targetName, avatar_url: targetAvatar }}
        existingVouch={existingVouch}
        onVouchSaved={() => {
          fetch(`/api/vouches?targetId=${targetId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (data?.vouch) setExistingVouch(data.vouch);
            })
            .catch(() => {});
        }}
        onVouchRemoved={() => setExistingVouch(null)}
      />
    </>
  );
}

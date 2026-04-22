"use client";

/**
 * Thread card for the `__type:intro_request__` structured message
 * under the S2a direct-intro model.
 *
 * The recipient is always the gatekeeper. They see the sender's full
 * profile, how they're connected, and the sender's listings as
 * previews, and then decide: Accept / Reply / Decline / Ignore. On
 * Accept, the app issues a bidirectional listing_access_grants pair
 * and the sender's listings flip to full view on refresh.
 *
 * The sender sees a read-only pending / accepted / declined state
 * on this same card. Only the recipient sees actions.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Shield,
  UserMinus,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ConnectorPathSummary } from "@/lib/trust-data";

export interface IntroSenderProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  member_since_year: number | null;
  host_rating_avg: number | null;
  guest_rating_avg: number | null;
  vouch_count_received: number;
}

export interface IntroSenderListing {
  id: string;
  title: string;
  thumbnail_url: string | null;
  area_name: string;
  price_min: number | null;
}

interface Props {
  threadId: string;
  intro: {
    sender_id: string;
    recipient_id: string;
    status: "pending" | "accepted" | "declined" | "ignored";
    message: string | null;
    start_date: string | null;
    end_date: string | null;
    decided_at: string | null;
  };
  viewerId: string;
  sender: IntroSenderProfile;
  /** Preview cards of the sender's listings. Click opens the listing
   *  detail page where listing-level gating applies — the intro card
   *  itself never unlocks listings. */
  senderListings: IntroSenderListing[];
  /** Direct connectors bridging recipient → sender, sorted strongest
   *  first. */
  connectorPaths: ConnectorPathSummary[];
  trustDegree: 1 | 2 | 3 | 4 | null;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return null;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = start
    ? new Date(start + "T00:00:00").toLocaleDateString(undefined, opts)
    : null;
  const e = end
    ? new Date(end + "T00:00:00").toLocaleDateString(undefined, opts)
    : null;
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

export function IntroRequestCard({
  threadId,
  intro,
  viewerId,
  sender,
  senderListings,
  connectorPaths,
  trustDegree,
}: Props) {
  const router = useRouter();
  const isRecipient = viewerId === intro.recipient_id;
  const isSender = viewerId === intro.sender_id;
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");

  const senderFirst = sender.name.split(" ")[0];
  const dateRange = formatDateRange(intro.start_date, intro.end_date);

  const call = async (action: "accept" | "decline" | "ignore") => {
    if (pendingAction) return;
    setPendingAction(action);
    try {
      const res = await fetch(
        `/api/trust/intro-request/${threadId}/${action}`,
        { method: "POST" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Couldn't complete action");
        return;
      }
      if (action === "accept") {
        toast.success("Intro accepted");
      } else if (action === "decline") {
        toast.success("Intro declined");
      } else {
        toast.success("Moved to ignored");
      }
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setPendingAction(null);
    }
  };

  const submitRevoke = async () => {
    if (pendingAction) return;
    setPendingAction("revoke");
    try {
      const res = await fetch(
        `/api/trust/intro-request/${threadId}/revoke`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: revokeReason.trim() || undefined }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Couldn't revoke");
        return;
      }
      toast.success("Access ended");
      setRevokeDialogOpen(false);
      setRevokeReason("");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setPendingAction(null);
    }
  };

  const headerLine = (() => {
    if (intro.status === "accepted") {
      if (isRecipient) return `You accepted the intro from ${senderFirst}`;
      if (isSender) return `${senderFirst.includes(" ") ? senderFirst : sender.name.split(" ")[0]} — intro accepted`;
      return "Intro accepted";
    }
    if (intro.status === "declined") {
      if (isRecipient) return `You declined this intro from ${senderFirst}`;
      return "Not available right now";
    }
    if (intro.status === "ignored") {
      if (isRecipient) return `You marked this intro as ignored`;
      return "Waiting for a reply";
    }
    // pending
    if (isRecipient) return `Intro request from ${sender.name}`;
    return `Waiting for ${intro.recipient_id === viewerId ? "you" : "their"} decision`;
  })();

  // Status strip along the top — color follows semantic state.
  const statusAccent =
    intro.status === "accepted"
      ? "border-emerald-200 bg-emerald-50"
      : intro.status === "declined"
        ? "border-zinc-200 bg-zinc-50"
        : intro.status === "ignored"
          ? "border-zinc-200 bg-zinc-50"
          : "border-violet-200 bg-violet-50/60";
  const statusIcon =
    intro.status === "accepted" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
    ) : intro.status === "declined" ? (
      <XCircle className="h-4 w-4 text-zinc-600" />
    ) : (
      <UserPlus className="h-4 w-4 text-violet-700" />
    );

  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border-2 border-border bg-white shadow-sm">
      {/* Status header */}
      <div
        className={`flex items-center justify-between border-b-2 px-4 py-2.5 ${statusAccent}`}
      >
        <div className="flex items-center gap-2">
          {statusIcon}
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
            {intro.status === "accepted"
              ? "Intro accepted"
              : intro.status === "declined"
                ? "Not available"
                : intro.status === "ignored"
                  ? "Ignored"
                  : "Intro request"}
          </div>
        </div>
        {/* Recipient-only revoke menu — only visible while intro is
            accepted, the only state where an active grant exists. */}
        {isRecipient && intro.status === "accepted" && (
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full p-1 hover:bg-black/5">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() => setRevokeDialogOpen(true)}
                className="text-red-600 focus:text-red-600"
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Revoke access
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Sender identity row — avatar links to profile per global
            rule. Always full identity for the recipient (they need
            context). Sender also sees themselves here for symmetry. */}
        <div className="flex items-start gap-3">
          <Link
            href={`/profile/${sender.id}`}
            className="shrink-0"
            aria-label={`Open ${sender.name}'s profile`}
          >
            <Avatar className="h-12 w-12">
              {sender.avatar_url && (
                <AvatarImage src={sender.avatar_url} alt={sender.name} />
              )}
              <AvatarFallback>{initials(sender.name)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">
              {headerLine}
            </div>
            {dateRange && intro.status === "pending" && (
              <div className="mt-1 text-xs text-muted-foreground">
                Exploring: <span className="font-medium text-foreground">{dateRange}</span>
              </div>
            )}
            {intro.status === "pending" && trustDegree && (
              <div className="mt-1 text-xs text-muted-foreground">
                {trustDegree === 1
                  ? `Directly connected to ${senderFirst}`
                  : `Connected through ${connectorPaths.length} mutual${connectorPaths.length === 1 ? "" : "s"}`}
              </div>
            )}
          </div>
        </div>

        {/* Message body — quoted, always visible. */}
        {intro.message && intro.status === "pending" && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {senderFirst} wrote
            </div>
            <div className="whitespace-pre-wrap break-words">
              {intro.message}
            </div>
          </div>
        )}

        {/* Expandable: sender's profile */}
        {intro.status === "pending" && (
          <div className="mt-3 rounded-xl border border-border bg-white">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted/30"
            >
              <span>{senderFirst}&rsquo;s profile</span>
              {profileOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {profileOpen && (
              <div className="space-y-3 border-t border-border p-3 text-sm">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${sender.id}`}>
                    <Avatar className="h-14 w-14">
                      {sender.avatar_url && (
                        <AvatarImage src={sender.avatar_url} alt={sender.name} />
                      )}
                      <AvatarFallback>{initials(sender.name)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0">
                    <Link
                      href={`/profile/${sender.id}`}
                      className="font-semibold hover:underline"
                    >
                      {sender.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {sender.member_since_year
                        ? `Member since ${sender.member_since_year}`
                        : "New member"}
                      {sender.vouch_count_received > 0 && (
                        <>
                          {" · "}
                          {sender.vouch_count_received} vouch
                          {sender.vouch_count_received === 1 ? "" : "es"}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {sender.bio && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {sender.bio}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {sender.host_rating_avg != null && (
                    <span>
                      Host rating:{" "}
                      <span className="font-semibold text-foreground">
                        {sender.host_rating_avg.toFixed(2)}
                      </span>
                    </span>
                  )}
                  {sender.guest_rating_avg != null && (
                    <span>
                      Guest rating:{" "}
                      <span className="font-semibold text-foreground">
                        {sender.guest_rating_avg.toFixed(2)}
                      </span>
                    </span>
                  )}
                </div>

                {/* Sender's listings as previews — clicking opens the
                    listing detail page where listing-level gating
                    still applies. The intro card never unlocks
                    listings on its own. */}
                {senderListings.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {senderFirst}&rsquo;s listings
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {senderListings.map((l) => (
                        <Link
                          key={l.id}
                          href={`/listings/${l.id}`}
                          className="overflow-hidden rounded-lg border border-border bg-white hover:shadow-sm"
                        >
                          <div className="aspect-[4/3] bg-muted">
                            {l.thumbnail_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={l.thumbnail_url}
                                alt={l.title}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="p-2">
                            <div className="truncate text-xs font-semibold">
                              {l.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {l.area_name}
                              {l.price_min ? ` · from $${l.price_min}/night` : ""}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  href={`/profile/${sender.id}`}
                  className="block text-xs font-semibold text-brand hover:underline"
                >
                  View full profile →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Expandable: how you're connected */}
        {intro.status === "pending" && (
          <div className="mt-2 rounded-xl border border-border bg-white">
            <button
              type="button"
              id="intro-chain-expand"
              onClick={() => setConnectionsOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted/30"
            >
              <span>How you&rsquo;re connected</span>
              {connectionsOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {connectionsOpen && (
              <div className="space-y-2 border-t border-border p-3 text-sm">
                {connectorPaths.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    No mutual connections — this is a cold intro.
                  </div>
                ) : (
                  connectorPaths.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2"
                    >
                      <Link
                        href={`/profile/${p.id}`}
                        className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
                      >
                        <Avatar className="h-8 w-8">
                          {p.avatar_url && (
                            <AvatarImage src={p.avatar_url} alt={p.name} />
                          )}
                          <AvatarFallback>{initials(p.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Path strength: {Math.round(p.strength)}
                          </div>
                        </div>
                      </Link>
                      <Link
                        href={`/profile/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                      >
                        <MessageCircle className="h-3 w-3" />
                        DM
                      </Link>
                    </div>
                  ))
                )}
                {trustDegree && trustDegree > 2 && (
                  <div className="text-[11px] text-muted-foreground">
                    Some paths are {trustDegree}° — indirect through a
                    chain. Open a profile above to see the full chain.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Terminal-state messaging for the sender side */}
        {isSender && intro.status === "declined" && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-foreground">
            {senderFirst.length > 0
              ? `${senderFirst.replace(/^./, (c) => c.toUpperCase())} isn't able to engage right now.`
              : "Not available right now."}
            <div className="mt-1 text-xs text-muted-foreground">
              You can try again in 30 days.
            </div>
          </div>
        )}
        {isSender && intro.status === "accepted" && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-foreground">
            Intro accepted. You can both now see each other&rsquo;s full
            listings.
          </div>
        )}
        {intro.status === "accepted" && isRecipient && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-foreground">
            You and {senderFirst} can both now see each other&rsquo;s full
            listings. Use the menu above to revoke access at any time.
          </div>
        )}
      </div>

      {/* Actions (recipient, pending) */}
      {isRecipient && intro.status === "pending" && (
        <div className="border-t border-border bg-muted/20 p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => call("accept")}
              disabled={!!pendingAction}
              className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60 sm:col-span-1"
            >
              {pendingAction === "accept" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Accept
            </button>
            <button
              type="button"
              onClick={() => {
                // Inline reply — scroll to the thread's message
                // composer at the bottom of the page. Does NOT change
                // intro_status; the card stays visible.
                const composer = document.querySelector("textarea[placeholder^='Type']") as HTMLTextAreaElement | null;
                composer?.focus();
                composer?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Reply
            </button>
            <button
              type="button"
              onClick={() => call("decline")}
              disabled={!!pendingAction}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
            >
              {pendingAction === "decline" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Decline
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => call("ignore")}
              disabled={!!pendingAction}
              className="text-xs font-semibold text-muted-foreground underline hover:text-foreground disabled:opacity-60"
            >
              {pendingAction === "ignore" ? "Ignoring…" : "Ignore"}
            </button>
            {connectorPaths.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setConnectionsOpen(true);
                  const el = document.getElementById("intro-chain-expand");
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <Shield className="h-3 w-3" />
                Ask someone you&rsquo;re both connected to
              </button>
            )}
          </div>
        </div>
      )}

      {/* Revoke confirmation dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke access for {senderFirst}?</DialogTitle>
            <DialogDescription>
              This tears down full-listing access on both sides — you
              won&rsquo;t see {senderFirst}&rsquo;s listings and they
              won&rsquo;t see yours.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Private note (optional, for your records)
            </label>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={3}
              placeholder="Why are you revoking? Only you see this."
              className="w-full resize-none rounded-xl border-2 border-border !bg-white px-4 py-3 text-sm font-medium shadow-sm focus:border-foreground/60 focus:outline-none"
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setRevokeDialogOpen(false)}
              className="rounded-lg border-2 border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitRevoke}
              disabled={pendingAction === "revoke"}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {pendingAction === "revoke" ? "Revoking…" : "Revoke access"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

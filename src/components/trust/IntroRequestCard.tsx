"use client";

/**
 * Thread card for the `__type:intro_request__` structured message
 * under the S2a direct-intro model.
 *
 * Three render modes:
 *
 *   pending   — full card with sender profile + chain + actions
 *               (Accept / Reply / Decline on recipient; read-only
 *               pending state on sender).
 *
 *   accepted  — compact status strip ("Intro accepted · you both
 *               see each other's full listings"). Revoke menu
 *               stays on the recipient strip.
 *
 *   declined  — compact status strip ("{recipient} has declined
 *               your intro" on sender; "You declined this intro"
 *               on recipient). Recipient strip also offers Reopen.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
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
import { cn } from "@/lib/utils";
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
  /** Recipient's display name — used in the sender-facing decline
   *  copy ("{recipient} has declined your intro"). Pulled from
   *  ThreadDetail.other_user on the sender side, thread.intro_detail
   *  on the recipient side. */
  recipientName: string;
  /** Preview cards of the sender's listings. Click opens the listing
   *  detail page where listing-level gating applies. */
  senderListings: IntroSenderListing[];
  /** Direct connectors bridging recipient → sender (2° paths),
   *  sorted strongest first. Shipped with the thread for fast
   *  fallback render before chain data loads async. */
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

// ── LinkStrengthPill — purple ramp matching ChainRow in
//    connection-breakdown.tsx. Kept local so we can tweak the intro-
//    card style independently (e.g. bigger, more spacing). ──
function LinkStrengthPill({ strength }: { strength: number }) {
  if (!strength || strength <= 0) {
    return (
      <span className="mx-1 h-px w-4 shrink-0 bg-zinc-300" aria-hidden />
    );
  }
  const rounded = Math.round(strength);
  const bucket =
    strength >= 50
      ? "bg-violet-700"
      : strength >= 30
        ? "bg-violet-500"
        : strength >= 15
          ? "bg-violet-400"
          : "bg-violet-300 text-violet-900";
  return (
    <span
      className={cn(
        "mx-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white",
        bucket
      )}
      title={`1° vouch · ${rounded} pts`}
    >
      {rounded}
    </span>
  );
}

// ── Degree pill — color-coded by hop count (1/2/3/4°). ──
function DegreePill({ degree }: { degree: number }) {
  const map: Record<number, string> = {
    1: "bg-violet-100 text-violet-800 ring-violet-200",
    2: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    3: "bg-amber-100 text-amber-800 ring-amber-200",
    4: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1",
        map[degree] ?? map[4]
      )}
    >
      {degree}°
    </span>
  );
}

// ── Connection chain fetch ────────────────────────────────────────
interface ChainNode {
  id: string;
  name: string;
  avatar_url: string | null;
}
interface ChainEntry {
  nodes: ChainNode[];
  linkStrengths: number[];
  composite?: number;
  degree: number;
}
interface PathInfoResponse {
  connector: { id: string; name: string; avatar_url: string | null };
  link_a: number;
  link_b: number;
  path_strength: number;
  rank: number;
}
interface ConnectionApiResponse {
  type:
    | "self"
    | "not_connected"
    | "connected"
    | "direct_forward"
    | "direct_reverse"
    | "multi_hop";
  direction?: "outgoing" | "incoming";
  targetName?: string;
  targetAvatar?: string | null;
  viewerAvatar?: string | null;
  paths?: PathInfoResponse[];
  connection_count?: number;
  chains?: ChainEntry[];
  degree?: 1 | 2 | 3 | 4;
}

export function IntroRequestCard({
  threadId,
  intro,
  viewerId,
  sender,
  recipientName,
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
  const [dmLoadingId, setDmLoadingId] = useState<string | null>(null);

  const [conn, setConn] = useState<ConnectionApiResponse | null>(null);
  const [connLoading, setConnLoading] = useState(false);

  useEffect(() => {
    if (!connectionsOpen || conn || connLoading) return;
    setConnLoading(true);
    fetch(
      `/api/trust/connection?targetId=${encodeURIComponent(intro.sender_id)}&direction=incoming`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setConn(data as ConnectionApiResponse);
      })
      .catch(() => {})
      .finally(() => setConnLoading(false));
  }, [connectionsOpen, intro.sender_id, conn, connLoading]);

  const senderFirst = sender.name.split(" ")[0];
  const recipientFirst = recipientName.split(" ")[0];
  const dateRange = formatDateRange(intro.start_date, intro.end_date);

  const call = async (action: "accept" | "decline" | "reopen") => {
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
      if (action === "accept") toast.success("Intro accepted");
      else if (action === "decline") toast.success("Intro declined");
      else if (action === "reopen") toast.success("Intro reopened");
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

  // DM a connector — find-or-create a listing-less thread and nav.
  const openDm = async (otherUserId: string) => {
    if (dmLoadingId) return;
    setDmLoadingId(otherUserId);
    try {
      const res = await fetch("/api/dm/open-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        threadId?: string;
        error?: string;
      };
      if (!res.ok || !data.threadId) {
        toast.error(data.error || "Couldn't open conversation");
        return;
      }
      router.push(`/inbox/${data.threadId}`);
    } catch {
      toast.error("Network error");
    } finally {
      setDmLoadingId(null);
    }
  };

  // ── Build chain + DM lists ──
  type RenderChain = {
    key: string;
    nodes: ChainNode[];
    linkStrengths: number[];
    degree: number;
  };
  const chainEntries: RenderChain[] = [];
  const dmMap = new Map<string, ChainNode>();

  if (conn) {
    const targetNode: ChainNode = {
      id: intro.sender_id,
      name: sender.name,
      avatar_url: sender.avatar_url,
    };
    const viewerNode: ChainNode = {
      id: "you",
      name: "You",
      avatar_url: null,
    };
    if (conn.type === "connected" && Array.isArray(conn.paths)) {
      for (const p of conn.paths) {
        chainEntries.push({
          key: `2-${p.connector.id}-${p.rank}`,
          nodes: [viewerNode, p.connector, targetNode],
          linkStrengths: [p.link_b, p.link_a],
          degree: 2,
        });
        dmMap.set(p.connector.id, p.connector);
      }
    } else if (conn.type === "multi_hop" && Array.isArray(conn.chains)) {
      for (let i = 0; i < conn.chains.length; i++) {
        const c = conn.chains[i];
        const viewerFirstNodes = [...c.nodes].reverse();
        const viewerFirstLinks = [...c.linkStrengths].reverse();
        chainEntries.push({
          key: `chain-${i}`,
          nodes: viewerFirstNodes,
          linkStrengths: viewerFirstLinks,
          degree: c.degree,
        });
        const firstHop = viewerFirstNodes[1];
        if (firstHop && firstHop.id && firstHop.id !== "you") {
          dmMap.set(firstHop.id, firstHop);
        }
      }
    }
  } else {
    // Fallback while the connection API round-trips.
    const targetNode: ChainNode = {
      id: intro.sender_id,
      name: sender.name,
      avatar_url: sender.avatar_url,
    };
    for (const p of connectorPaths) {
      chainEntries.push({
        key: `fallback-${p.id}`,
        nodes: [
          { id: "you", name: "You", avatar_url: null },
          { id: p.id, name: p.name, avatar_url: p.avatar_url },
          targetNode,
        ],
        linkStrengths: [],
        degree: 2,
      });
      dmMap.set(p.id, {
        id: p.id,
        name: p.name,
        avatar_url: p.avatar_url,
      });
    }
  }

  const dmPeople = Array.from(dmMap.values());

  // ── Compact strip renderer for accepted / declined ──
  if (intro.status === "accepted" || intro.status === "declined") {
    const isAccepted = intro.status === "accepted";
    const strip = isAccepted
      ? {
          accent: "border-emerald-200 bg-emerald-50",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-700" />,
          label: "Intro accepted",
          body: isRecipient
            ? `You and ${senderFirst} can see each other's full listings.`
            : `You and ${recipientFirst} can see each other's full listings.`,
        }
      : {
          accent: "border-zinc-200 bg-zinc-50",
          icon: <XCircle className="h-4 w-4 text-zinc-600" />,
          label: isRecipient
            ? `You declined this intro`
            : `${recipientFirst} has declined your intro`,
          body: isRecipient
            ? `${senderFirst} can't send more messages until you reopen.`
            : `You can't send more messages in this thread. Try again in 30 days.`,
        };

    return (
      <>
        <div
          className={cn(
            "mx-auto w-full max-w-xl overflow-hidden rounded-2xl border-2 bg-white shadow-sm",
            strip.accent
          )}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 shrink-0">{strip.icon}</div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {strip.label}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {strip.body}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {/* Recipient-only revoke when accepted. */}
              {isRecipient && isAccepted && (
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
              {/* Recipient-only reopen when declined. */}
              {isRecipient && !isAccepted && (
                <button
                  type="button"
                  onClick={() => call("reopen")}
                  disabled={!!pendingAction}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                >
                  {pendingAction === "reopen" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Reopen intro
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Revoke dialog — kept mounted for the accepted strip. */}
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
      </>
    );
  }

  // ── Pending: full card ──
  const headerLine = isRecipient
    ? `Intro request from ${sender.name}`
    : `Waiting for ${recipientFirst}'s decision`;

  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border-2 border-border bg-white shadow-sm">
      {/* Status header */}
      <div className="flex items-center justify-between border-b-2 border-violet-200 bg-violet-50/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-violet-700" />
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Intro request
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Sender identity row */}
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
            {dateRange && (
              <div className="mt-1 text-xs text-muted-foreground">
                Exploring:{" "}
                <span className="font-medium text-foreground">
                  {dateRange}
                </span>
              </div>
            )}
            {trustDegree && (
              <div className="mt-1 text-xs text-muted-foreground">
                {trustDegree === 1
                  ? `Directly connected to ${senderFirst}`
                  : `Connected through ${connectorPaths.length} mutual${connectorPaths.length === 1 ? "" : "s"}`}
              </div>
            )}
          </div>
        </div>

        {intro.message && (
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

        {/* Expandable: how you're connected */}
        <div className="mt-2 rounded-xl border border-border bg-white">
          <button
            type="button"
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
            <div className="space-y-4 border-t border-border p-3 text-sm">
              {connLoading && chainEntries.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading chain…
                </div>
              ) : chainEntries.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  No mutual connections — this is a cold intro.
                </div>
              ) : (
                <>
                  {/* Chains — avatars 10×10, purple link-strength pill
                      between nodes, color-coded degree pill on the
                      right. */}
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {chainEntries.length === 1
                        ? "Chain"
                        : `${chainEntries.length} chains`}
                    </div>
                    <div className="space-y-2">
                      {chainEntries.map((c) => (
                        <div
                          key={c.key}
                          className="flex items-center gap-1.5 overflow-x-auto rounded-lg bg-muted/30 px-3 py-2.5 text-xs"
                        >
                          {c.nodes.map((n, idx) => (
                            <div
                              key={`${c.key}-${idx}`}
                              className="flex shrink-0 items-center"
                            >
                              {idx > 0 && (
                                <LinkStrengthPill
                                  strength={c.linkStrengths[idx - 1] ?? 0}
                                />
                              )}
                              {n.id === "you" ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <Avatar className="h-10 w-10 ring-2 ring-foreground/10">
                                    <AvatarFallback className="text-[10px]">
                                      Me
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-[10px] font-medium text-muted-foreground">
                                    You
                                  </span>
                                </div>
                              ) : (
                                <Link
                                  href={`/profile/${n.id}`}
                                  className="flex flex-col items-center gap-0.5 hover:opacity-80"
                                >
                                  <Avatar className="h-10 w-10 ring-2 ring-foreground/10">
                                    {n.avatar_url && (
                                      <AvatarImage
                                        src={n.avatar_url}
                                        alt={n.name}
                                      />
                                    )}
                                    <AvatarFallback className="text-[10px]">
                                      {initials(n.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="max-w-[4.5rem] truncate text-[10px] font-medium text-muted-foreground">
                                    {n.name.split(" ")[0]}
                                  </span>
                                </Link>
                              )}
                            </div>
                          ))}
                          <div className="ml-auto shrink-0 pl-2">
                            <DegreePill degree={c.degree} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deduped 1° contacts the recipient could DM. Click
                      opens an actual DM thread, not a profile. */}
                  {dmPeople.length > 0 && (
                    <div>
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        People you can DM
                      </div>
                      <div className="space-y-1.5">
                        {dmPeople.map((p) => (
                          <div
                            key={`dm-${p.id}`}
                            className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-border"
                          >
                            <Link
                              href={`/profile/${p.id}`}
                              className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
                            >
                              <Avatar className="h-8 w-8">
                                {p.avatar_url && (
                                  <AvatarImage
                                    src={p.avatar_url}
                                    alt={p.name}
                                  />
                                )}
                                <AvatarFallback>
                                  {initials(p.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="truncate text-sm font-semibold">
                                {p.name}
                              </div>
                            </Link>
                            <button
                              type="button"
                              onClick={() => openDm(p.id)}
                              disabled={!!dmLoadingId}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-60"
                            >
                              {dmLoadingId === p.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <MessageCircle className="h-3 w-3" />
                              )}
                              DM
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions — recipient only. */}
      {isRecipient && (
        <div className="border-t border-border bg-muted/20 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => call("accept")}
              disabled={!!pendingAction}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
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
                const composer = document.querySelector(
                  "textarea[placeholder^='Type']"
                ) as HTMLTextAreaElement | null;
                composer?.focus();
                composer?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
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
        </div>
      )}
    </div>
  );
}

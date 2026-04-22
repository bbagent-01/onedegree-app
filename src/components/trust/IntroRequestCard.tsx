"use client";

/**
 * Thread card for the `__type:intro_request__` structured message.
 *
 * Matches the standard thread event-card pattern used by
 * TermsOfferedCard + the payment cards:
 *
 *   ┌─ white card, 2px border, overflow-hidden ─────────┐
 *   │  Header row: icon + title + subtitle + chevron    │
 *   ├───────────────────────────────────────────────────┤
 *   │  Collapsible body (message + profile + chain)     │
 *   ├───────────────────────────────────────────────────┤
 *   │  Bottom footer: action row (pending) or           │
 *   │                 tinted status strip with check/X  │
 *   └───────────────────────────────────────────────────┘
 *
 * Pending   — full card, body always open, action footer.
 * Accepted  — <details> collapses the body; emerald status strip
 *             with big check; recipient strip has the revoke menu.
 * Declined  — <details> collapses the body; red status strip with
 *             big X; recipient strip has Reopen; sender is blocked
 *             upstream from posting further messages.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  UserMinus,
  UserPlus,
  X as XIcon,
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
import { TrustTag } from "@/components/trust/trust-tag";
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
  recipientName: string;
  senderListings: IntroSenderListing[];
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

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Connection API shapes ──
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
  const isTerminal =
    intro.status === "accepted" ||
    intro.status === "declined" ||
    intro.status === "ignored";

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

  // ── Chain + DM lists built from /api/trust/connection ──
  type RenderChain = {
    key: string;
    nodes: ChainNode[];
    degree: 1 | 2 | 3 | 4;
    /** Composite score for this path. Feeds the TrustTag on the
     *  chain row (micro size). */
    score: number;
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
          degree: 2,
          score: Math.round(p.path_strength ?? 0),
        });
        dmMap.set(p.connector.id, p.connector);
      }
    } else if (conn.type === "multi_hop" && Array.isArray(conn.chains)) {
      for (let i = 0; i < conn.chains.length; i++) {
        const c = conn.chains[i];
        const viewerFirstNodes = [...c.nodes].reverse();
        chainEntries.push({
          key: `chain-${i}`,
          nodes: viewerFirstNodes,
          degree: (c.degree as 1 | 2 | 3 | 4) ?? 4,
          score: Math.round(c.composite ?? 0),
        });
        const firstHop = viewerFirstNodes[1];
        if (firstHop && firstHop.id && firstHop.id !== "you") {
          dmMap.set(firstHop.id, firstHop);
        }
      }
    }
  } else {
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
        degree: 2,
        score: Math.round(p.strength ?? 0),
      });
      dmMap.set(p.id, {
        id: p.id,
        name: p.name,
        avatar_url: p.avatar_url,
      });
    }
  }

  const dmPeople = Array.from(dmMap.values());

  // ── Header row — always visible; used both as <summary> in
  //    terminal states and as the plain top of the card in pending. ──
  const headerTitle = (() => {
    if (intro.status === "accepted") {
      return isRecipient
        ? `Intro request from ${sender.name}`
        : isSender
          ? `You sent an intro request to ${recipientName}`
          : `Intro request between ${sender.name} and ${recipientName}`;
    }
    if (intro.status === "declined") {
      return isRecipient
        ? `Intro request from ${sender.name}`
        : isSender
          ? `You sent an intro request to ${recipientName}`
          : `Intro request between ${sender.name} and ${recipientName}`;
    }
    if (intro.status === "ignored") {
      return `Intro request from ${sender.name}`;
    }
    return isRecipient
      ? `Intro request from ${sender.name}`
      : `Waiting for ${recipientFirst}'s decision`;
  })();

  const headerSubtitle = (() => {
    if (intro.status === "pending") {
      if (dateRange) return `Exploring ${dateRange}`;
      return "Awaiting decision";
    }
    if (intro.status === "accepted" && intro.decided_at) {
      return `Accepted on ${formatShortDate(intro.decided_at)}`;
    }
    if (intro.status === "declined" && intro.decided_at) {
      return `Declined on ${formatShortDate(intro.decided_at)}`;
    }
    if (intro.status === "ignored") {
      return "Not yet answered";
    }
    return "";
  })();

  const headerRow = (
    <div className="flex items-start gap-3 p-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
        <UserPlus className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">
          {headerTitle}
        </div>
        {headerSubtitle && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {headerSubtitle}
          </div>
        )}
      </div>
      {isTerminal && (
        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      )}
    </div>
  );

  // ── Body — the collapsible middle (message, profile, chain) ──
  const body = (
    <div className="border-t border-border">
      {intro.message && (
        <div className="border-b border-border p-4">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {senderFirst} wrote
          </div>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {intro.message}
          </div>
          {dateRange && (
            <div className="mt-2 text-xs text-muted-foreground">
              Dates:{" "}
              <span className="font-medium text-foreground">{dateRange}</span>
            </div>
          )}
        </div>
      )}

      {/* Sender's profile expandable */}
      <div className="border-b border-border">
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold hover:bg-muted/30"
        >
          <span>{senderFirst}&rsquo;s profile</span>
          {profileOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {profileOpen && (
          <div className="space-y-3 border-t border-border p-4 text-sm">
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

      {/* How you're connected */}
      <div>
        <button
          type="button"
          onClick={() => setConnectionsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold hover:bg-muted/30"
        >
          <span>How you&rsquo;re connected</span>
          {connectionsOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {connectionsOpen && (
          <div className="space-y-4 border-t border-border p-4 text-sm">
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
                        className="flex items-center gap-2 overflow-x-auto rounded-lg bg-muted/30 px-3 py-2.5 text-xs"
                      >
                        {c.nodes.map((n, idx) => (
                          <div
                            key={`${c.key}-${idx}`}
                            className="flex shrink-0 items-center gap-2"
                          >
                            {idx > 0 && (
                              <span
                                className="text-muted-foreground"
                                aria-hidden
                              >
                                →
                              </span>
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
                          <TrustTag
                            size="micro"
                            degree={c.degree}
                            score={c.score}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

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
  );

  // ── Bottom footer ──
  const pendingFooter = isRecipient ? (
    <div className="border-t border-border bg-muted/30 p-3">
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
            <Check className="h-3.5 w-3.5" />
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
  ) : (
    <div className="border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
      Waiting for {recipientFirst} to decide.
    </div>
  );

  const acceptedFooter = (
    <div className="flex items-center gap-3 border-t border-emerald-200 bg-emerald-50 px-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
        <Check className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-emerald-900">
          Intro accepted
        </div>
        <div className="text-xs text-emerald-800/80">
          {isRecipient
            ? `You and ${senderFirst} can see each other's full listings.`
            : `You and ${recipientFirst} can see each other's full listings.`}
        </div>
      </div>
      {isRecipient && (
        <DropdownMenu>
          <DropdownMenuTrigger className="shrink-0 rounded-full p-1 hover:bg-emerald-100">
            <MoreHorizontal className="h-4 w-4 text-emerald-900/70" />
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
  );

  const declinedFooter = (
    <div className="flex items-center gap-3 border-t border-red-200 bg-red-50 px-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-sm">
        <XIcon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-red-900">
          {isRecipient
            ? `You declined ${senderFirst}'s intro`
            : `${recipientFirst} has declined your intro`}
        </div>
        <div className="text-xs text-red-800/80">
          {isRecipient
            ? `${senderFirst} can't post until you reopen.`
            : "You can't send more messages in this thread. Try again in 30 days."}
        </div>
      </div>
      {isRecipient && (
        <button
          type="button"
          onClick={() => call("reopen")}
          disabled={!!pendingAction}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100 disabled:opacity-60"
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
  );

  const ignoredFooter = (
    <div className="border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
      Marked as ignored — stays in your Intros tab so you can come back later.
    </div>
  );

  const footer =
    intro.status === "pending"
      ? pendingFooter
      : intro.status === "accepted"
        ? acceptedFooter
        : intro.status === "declined"
          ? declinedFooter
          : ignoredFooter;

  return (
    <>
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border-2 border-border bg-white shadow-sm">
        {isTerminal ? (
          // Collapsible shell matching TermsOfferedCard — <details>
          // gives us the tap-to-expand affordance without pulling in
          // an accordion component.
          <details className="group">
            <summary
              className={cn(
                "cursor-pointer list-none focus-visible:outline-none"
              )}
            >
              {headerRow}
            </summary>
            {body}
          </details>
        ) : (
          <>
            {headerRow}
            {body}
          </>
        )}
        {footer}
      </div>

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
    </>
  );
}

"use client";

import { useState, useCallback, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  CheckCircle2,
  EyeOff,
  Loader2,
  User as UserIcon,
  Users,
  UserX,
} from "lucide-react";
import { trustTier } from "@/lib/trust-data";
import { cn } from "@/lib/utils";

// ── API response types ──

interface VouchInfo {
  vouch_type: string;
  years_known_bucket: string;
  vouch_score: number;
}

interface PathInfo {
  connector: { id: string; name: string; avatar_url: string | null };
  link_a: number;
  link_b: number;
  path_strength: number;
  rank: number;
  weight: number;
  weighted_score: number;
  viewer_vouch_score: number;
  connector_vouch_score: number;
  connector_vouch_power: number;
}

type ConnectionData =
  | { type: "self" }
  | {
      type: "direct_forward";
      direction?: "outgoing" | "incoming";
      targetName: string;
      vouch: VouchInfo;
      reverseVouch: VouchInfo | null;
    }
  | {
      type: "direct_reverse";
      direction?: "outgoing" | "incoming";
      targetName: string;
      vouch: VouchInfo;
    }
  | {
      type: "connected";
      direction?: "outgoing" | "incoming";
      targetName: string;
      targetAvatar?: string | null;
      viewerAvatar?: string | null;
      score: number;
      paths: PathInfo[];
      connection_count: number;
    }
  | {
      type: "not_connected";
      direction?: "outgoing" | "incoming";
      targetName: string;
    }
  | {
      type: "multi_hop";
      direction?: "outgoing" | "incoming";
      targetName: string;
      degree: 3 | 4;
      /** Ordered chain of user profiles along the reachable path.
       *  Incoming: [target, ..., viewer]. Outgoing: [viewer, ..., target]. */
      path: Array<{
        id: string;
        name: string;
        avatar_url: string | null;
      }>;
      /** Every simple path between viewer and target up to 4 hops,
       *  oriented same as `path` (target-first for incoming,
       *  viewer-first for outgoing). Up to 10 entries. */
      chains?: Array<{
        nodes: Array<{ id: string; name: string; avatar_url: string | null }>;
        linkStrengths: number[];
        composite: number;
        degree: number;
      }>;
      /** Count of chains beyond the 10-cap returned in `chains`. */
      chainsTruncated?: number;
    };

// ── Helpers ──

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Mark whether the viewer has a direct relationship with this
 * connector. In the current single-hop model every connector is
 * first-hop, so always true. Placeholder for the multi-hop future.
 */
function viewerKnows(_connectorId: string): boolean {
  return true;
}

// ── Main wrapper ──

export type ConnectionDirection = "outgoing" | "incoming";

interface ConnectionPopoverProps {
  targetUserId: string;
  isSelf?: boolean;
  /**
   * Direction of trust to display. Outgoing = viewer's trust of the
   * target (default). Incoming = target's trust of the viewer — used
   * on host/listing surfaces where the displayed score represents
   * the host's vetting of the guest.
   */
  direction?: ConnectionDirection;
  children: ReactNode;
}

/**
 * Wraps an avatar with a popover showing the trust breakdown. Data
 * fetched on first open. Anonymity rules are strict — vouch_type and
 * years_known are never shown in the default Summary mode; Show math
 * reveals numeric scores only, never the semantic labels.
 */
export function ConnectionPopover({
  targetUserId,
  isSelf = false,
  direction = "outgoing",
  children,
}: ConnectionPopoverProps) {
  const [data, setData] = useState<ConnectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (data) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/trust/connection?targetId=${encodeURIComponent(targetUserId)}&direction=${direction}`
      );
      if (res.ok) setData(await res.json());
    } catch {
      // Fail silently — the popover just won't show data.
    } finally {
      setLoading(false);
    }
  }, [targetUserId, direction, data]);

  if (isSelf) return <>{children}</>;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) fetchData();
      }}
    >
      <PopoverTrigger
        className="inline-flex cursor-pointer"
        onClick={(e) => {
          // The trigger often sits inside a Link (browse tiles wrap
          // everything in an <a>). stopPropagation alone blocks
          // React-handler bubbling but not the browser's native
          // anchor navigation — preventDefault handles that so the
          // popover can open without leaving the page.
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-[34rem] max-w-[calc(100vw-1.5rem)] max-h-[80vh] overflow-y-auto p-0"
      >
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {data && !loading && <TrustDetailView data={data} />}
      </PopoverContent>
    </Popover>
  );
}

// ── Detail view (Summary + Show math toggle) ──

function TrustDetailView({ data }: { data: ConnectionData }) {
  const [showMath, setShowMath] = useState(false);

  if (data.type === "self") return null;

  if (data.type === "not_connected") {
    return (
      <div className="p-3">
        <div className="flex items-center gap-2">
          <UserX className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-semibold">
            Not connected to {data.targetName}
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Invite mutual friends or ask for an introduction.
        </p>
      </div>
    );
  }

  if (data.type === "multi_hop") {
    return <MultiHopView data={data} />;
  }

  // Direct vouches (forward / reverse). The semantics of
  // "forward" depend on the direction flag on the data:
  //   outgoing: forward = viewer → target
  //   incoming: forward = target → viewer (host's trust of me)
  if (data.type === "direct_forward" || data.type === "direct_reverse") {
    const vouch = data.vouch;
    const isIncoming = data.direction === "incoming";
    const heading =
      data.type === "direct_forward"
        ? isIncoming
          ? `${data.targetName} vouched for you`
          : `You vouched for ${data.targetName}`
        : isIncoming
          ? `You vouched for ${data.targetName}`
          : `${data.targetName} vouched for you`;
    return (
      <div className="p-3">
        <div className="text-sm font-semibold">{heading}</div>
        <div className="mt-3 flex items-center gap-2">
          <DirectChip />
        </div>
        {data.type === "direct_forward" && data.reverseVouch && (
          <>
            <div className="mt-3 border-t border-border pt-3 text-sm font-semibold">
              {isIncoming
                ? `You also vouched for ${data.targetName}`
                : `${data.targetName} also vouched for you`}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <DirectChip />
            </div>
          </>
        )}
        <ShowMathToggle on={showMath} onToggle={() => setShowMath((v) => !v)} />
        {showMath && (
          <div className="mt-2 rounded-lg bg-muted/30 p-2.5 text-[11px] font-mono">
            <div className="text-foreground">
              {heading} &rarr;{" "}
              <span className="font-semibold">
                vouch score = {vouch.vouch_score} pts
              </span>
            </div>
            {data.type === "direct_forward" && data.reverseVouch && (
              <div className="mt-2 text-foreground">
                {isIncoming
                  ? `You also vouched for ${data.targetName}`
                  : `${data.targetName} also vouched for you`}{" "}
                &rarr;{" "}
                <span className="font-semibold">
                  vouch score = {data.reverseVouch.vouch_score} pts
                </span>
              </div>
            )}
            <div className="mt-2 text-muted-foreground/70 text-[10px]">
              Numeric-only view. Vouch type and years-known stay hidden.
            </div>
          </div>
        )}
      </div>
    );
  }

  // Connected through mutual connectors.
  const sortedPaths = [...data.paths].sort((a, b) => a.rank - b.rank);
  const isIncoming = data.direction === "incoming";
  const headerText = isIncoming
    ? `${data.targetName} is connected to you via ${data.connection_count} connection${data.connection_count > 1 ? "s" : ""}`
    : `Connected to ${data.targetName} via ${data.connection_count} connection${data.connection_count > 1 ? "s" : ""}`;
  return (
    <div className="p-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm font-semibold">{headerText}</div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Trust Score:{" "}
        <span className="font-semibold text-foreground">
          {data.score} pts ({trustTier(data.score).label})
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {sortedPaths.map((path, idx) => {
          // Shape each 2° path as a 3-node chain in viewer-first order
          // so we can reuse the same ChainRow component the multi-hop
          // view uses. For incoming direction the server's link_a is
          // target→connector (first hop target-side) and link_b is
          // connector→you. For outgoing it's the opposite. ChainRow
          // receives viewer-first nodes + you-first link strengths
          // (index 0 = first hop out of viewer) and reverses for
          // display.
          const linkA = path.link_a;
          const linkB = path.link_b;
          // you→connector link strength:
          //  outgoing: link_a (you→connector)
          //  incoming: link_b (connector→you)
          const youToConnector = isIncoming ? linkB : linkA;
          const connectorToTarget = isIncoming ? linkA : linkB;
          return (
            <ChainRow
              key={path.connector.id}
              label={`Path ${idx + 1} · via ${path.connector.name.split(" ")[0]}`}
              viewerAvatar={data.viewerAvatar ?? null}
              chain={{
                nodes: [
                  { id: "you", name: "You", avatar_url: data.viewerAvatar ?? null },
                  {
                    id: path.connector.id,
                    name: path.connector.name,
                    avatar_url: path.connector.avatar_url,
                  },
                  {
                    id: "target",
                    name: data.targetName,
                    avatar_url: data.targetAvatar ?? null,
                  },
                ],
                linkStrengths: [youToConnector, connectorToTarget],
                degree: 2,
              }}
            />
          );
        })}
      </div>

      <ShowMathToggle on={showMath} onToggle={() => setShowMath((v) => !v)} />
      {showMath && (
        <div className="mt-2 space-y-4 rounded-lg bg-muted/30 p-3 text-[11px] font-mono">
          {sortedPaths.map((p) => {
            const first = p.connector.name.split(" ")[0];
            const targetFirst = data.targetName.split(" ")[0];
            // In incoming mode the chain is source (target) → connector → viewer,
            // so link_a is "target vouched for connector" and link_b is
            // "connector vouched for you." Outgoing keeps the original
            // You → connector → target chain.
            const linkALabel = isIncoming
              ? `${targetFirst} vouched for ${first}`
              : `You vouched for ${first}`;
            const linkBLabel = isIncoming
              ? `${first} vouched for you`
              : `${first} vouched for ${targetFirst}`;
            const vpOwnerFirst = first;
            return (
              <div key={p.connector.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-semibold text-foreground">
                    Path {p.rank} · via {first}
                  </div>
                  <div className="text-muted-foreground">
                    rank {p.rank} · weight {p.weight.toFixed(3)}
                  </div>
                </div>
                <div className="rounded-md bg-white/70 px-2.5 py-1.5 text-foreground">
                  {linkALabel} &rarr;{" "}
                  <span className="font-semibold">
                    vouch score = {p.link_a.toFixed(1)} pts
                  </span>
                </div>
                <div className="rounded-md bg-white/70 px-2.5 py-1.5 text-foreground">
                  {linkBLabel} &rarr;{" "}
                  <span className="font-semibold">
                    {p.connector_vouch_score.toFixed(1)} pts
                  </span>{" "}
                  ×{" "}
                  <span className="font-semibold">
                    {p.connector_vouch_power.toFixed(2)}×
                  </span>{" "}
                  {vpOwnerFirst}&apos;s vouch power ={" "}
                  <span className="font-semibold">
                    {p.link_b.toFixed(1)} pts
                  </span>
                </div>
                <div className="px-1 text-foreground">
                  Path strength = avg({p.link_a.toFixed(1)},{" "}
                  {p.link_b.toFixed(1)}) ={" "}
                  <span className="font-semibold">
                    {p.path_strength.toFixed(1)} pts
                  </span>
                  {"   "}×{" "}
                  <span className="font-semibold">
                    {p.weight.toFixed(3)}
                  </span>{" "}
                  ={" "}
                  <span className="font-semibold text-emerald-700">
                    {p.weighted_score.toFixed(2)} pts
                  </span>
                </div>
              </div>
            );
          })}
          <div className="border-t border-border pt-2 text-foreground">
            Total ={" "}
            {sortedPaths
              .map((p) => p.weighted_score.toFixed(2))
              .join(" + ")}{" "}
            ={" "}
            <span className="font-semibold text-emerald-700">
              {data.score} pts
            </span>
          </div>
          <ColorKey />
          <div className="text-[10px] text-muted-foreground/70">
            Numeric-only view. Vouch type and years-known stay hidden
            to protect each voucher&apos;s privacy.
          </div>
        </div>
      )}
    </div>
  );
}

/** Bucket → color → score-range legend used inside Show math. */
function ColorKey() {
  const buckets: Array<{
    label: string;
    range: string;
    className: string;
  }> = [
    { label: "Weak", range: "1–14", className: "bg-emerald-100" },
    { label: "Modest", range: "15–29", className: "bg-emerald-300" },
    { label: "Strong", range: "30–49", className: "bg-emerald-500" },
    { label: "Very strong", range: "50+", className: "bg-emerald-700" },
  ];
  return (
    <div className="rounded-md bg-white/60 p-2 text-[10px] text-muted-foreground">
      <div className="mb-1 font-semibold text-foreground">Color key</div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {buckets.map((b) => (
          <div key={b.label} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/5",
                b.className
              )}
            />
            <span className="font-medium text-foreground">{b.range}</span>
            <span>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ──

/** Path row — anonymized intermediaries get a silhouette. */
function PathRow({ path }: { path: PathInfo }) {
  const knows = viewerKnows(path.connector.id);
  const tier = trustTier(path.path_strength);
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 p-2.5">
      {knows && path.connector.avatar_url ? (
        <Avatar className="h-7 w-7" size="sm">
          <AvatarImage
            src={path.connector.avatar_url}
            alt={path.connector.name}
          />
          <AvatarFallback className="text-[9px]">
            {initials(path.connector.name)}
          </AvatarFallback>
        </Avatar>
      ) : knows ? (
        <Avatar className="h-7 w-7" size="sm">
          <AvatarFallback className="text-[9px]">
            {initials(path.connector.name)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserIcon className="h-3.5 w-3.5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">
          {knows ? path.connector.name : "Mutual connection"}
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <StrengthChip tier={tier} compact />
          <span className="flex items-center gap-0.5">
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                trustTier(path.link_a).dotClass
              )}
              title="You → connector link"
            />
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                trustTier(path.link_b).dotClass
              )}
              title="Connector → host link"
            />
          </span>
        </div>
      </div>
    </div>
  );
}

function StrengthChip({
  tier,
  compact = false,
}: {
  tier: ReturnType<typeof trustTier>;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        tier.solidClass
      )}
    >
      {tier.label}
    </span>
  );
}

/** Direct-vouch chip — used on the direct_forward / direct_reverse
 *  branches instead of a numeric-tier StrengthChip, because a direct
 *  vouch supersedes the score buckets entirely. */
function DirectChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
      <CheckCircle2 className="h-3 w-3" />
      Direct
    </span>
  );
}

function ShowMathToggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-3 w-full rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
    >
      {on ? "Hide math" : "Show math"}
    </button>
  );
}

// ── Multi-hop view (3° / 4°) ──

/**
 * Renders the chain of intermediaries between the viewer and a 3°
 * or 4° target. The chain is drawn as a horizontal path of avatars
 * separated by arrows, with "You" on one end and the target on the
 * other. The goal is to show exactly who bridges the gap so the
 * viewer can decide who to ask for an introduction.
 *
 * The spec treats degree ≥ 3 as score-less — we lean into that and
 * let the chain itself carry the meaning rather than invent numbers.
 */
function MultiHopView({
  data,
}: {
  data: Extract<ConnectionData, { type: "multi_hop" }>;
}) {
  const [showMath, setShowMath] = useState(false);
  const isIncoming = data.direction === "incoming";
  // Normalize to [you, intermediary..., target] so target is always
  // at the end regardless of the raw direction that came back from
  // the API.
  const chainYouFirst = isIncoming ? [...data.path].reverse() : data.path;
  const target = chainYouFirst[chainYouFirst.length - 1];
  const viewer = chainYouFirst[0];
  const ordinal = data.degree === 4 ? "4th" : "3rd";

  // Build the full list of chains to render. Prefer the enumerated
  // `chains` array from the API (every simple path up to 4 hops);
  // fall back to just the representative `path` when the server
  // hasn't populated chains (older API shape / upgrade path).
  const rawChains =
    data.chains && data.chains.length > 0
      ? data.chains
      : [
          {
            nodes: data.path,
            // No per-link strengths on the fallback — render dashes
            // between nodes instead of strength pills.
            linkStrengths: data.path.slice(1).map(() => 0),
            composite: 0,
            degree: data.path.length - 1,
          },
        ];

  // Orient every chain you-first. Then sort by degree ascending (so
  // the closest paths surface first) and, within same-degree ties,
  // by composite strength descending. This matches Loren's ask:
  // "closest connection on top, then 4° connections under their
  // own heading."
  const chainsYouFirst = rawChains
    .map((c) => ({
      nodes: isIncoming ? [...c.nodes].reverse() : c.nodes,
      linkStrengths: isIncoming
        ? [...c.linkStrengths].reverse()
        : c.linkStrengths,
      degree: c.degree,
      composite: c.composite,
    }))
    .sort((a, b) => {
      if (a.degree !== b.degree) return a.degree - b.degree;
      return b.composite - a.composite;
    });

  // Group chains by degree so each group gets its own heading.
  const byDegree = new Map<number, typeof chainsYouFirst>();
  for (const chain of chainsYouFirst) {
    const existing = byDegree.get(chain.degree) ?? [];
    existing.push(chain);
    byDegree.set(chain.degree, existing);
  }
  const groups = [...byDegree.entries()].sort((a, b) => a[0] - b[0]);

  // The badge score (for 3°) comes from the strongest 3° chain:
  // min(hops) × 0.6. Find the best 3° chain and its min-hop so we
  // can show the math.
  const three = chainsYouFirst.filter((c) => c.degree === 3);
  const bestThree =
    three.length > 0
      ? three.reduce((best, c) =>
          Math.min(...c.linkStrengths) * 0.6 >
          Math.min(...best.linkStrengths) * 0.6
            ? c
            : best
        )
      : null;
  const score = bestThree
    ? Math.round(Math.min(...bestThree.linkStrengths) * 0.6)
    : 0;

  // Global path counter so labels stay unique across groups
  // ("Path 1, Path 2, Path 3" rather than restarting at each group).
  let counter = 0;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm font-semibold">
          You&rsquo;re a {ordinal}&deg; connection to {target.name}
        </div>
      </div>
      {data.degree === 3 && bestThree && (
        <div className="mt-0.5 text-xs text-muted-foreground">
          Trust score:{" "}
          <span className="font-semibold text-[#bf8a0d]">{score}</span>{" "}
          <span className="text-muted-foreground/70">· 3° dampened</span>
        </div>
      )}
      {chainsYouFirst.length > 1 && (
        <div className="mt-0.5 text-xs text-muted-foreground">
          {chainsYouFirst.length} paths between you
        </div>
      )}

      <div className="mt-3 space-y-3">
        {groups.map(([degree, rows]) => (
          <div key={degree}>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {rows.length} {degreeOrdinal(degree)}&deg;{" "}
              {rows.length === 1 ? "path" : "paths"}
              {degree === data.degree && " · closest"}
            </div>
            <div className="space-y-2">
              {rows.map((chain) => {
                counter += 1;
                return (
                  <ChainRow
                    key={counter}
                    chain={chain}
                    viewerAvatar={viewer.avatar_url}
                    label={`Path ${counter}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {typeof data.chainsTruncated === "number" &&
        data.chainsTruncated > 0 && (
          <div className="mt-2 text-[11px] text-muted-foreground">
            + {data.chainsTruncated} more{" "}
            {data.chainsTruncated === 1 ? "path" : "paths"} not shown
          </div>
        )}

      <ShowMathToggle on={showMath} onToggle={() => setShowMath((v) => !v)} />
      {showMath && (
        <div className="mt-2 rounded-lg bg-muted/30 p-3 text-[11px] font-mono space-y-2">
          {bestThree && (
            <>
              <div className="text-foreground">
                <span className="font-semibold">3° dampening formula:</span>
                <br />
                score = min(hop strengths) &times; 0.6
              </div>
              <div className="rounded-md bg-white/70 px-2.5 py-1.5 text-foreground">
                min({bestThree.linkStrengths.map((s) => Math.round(s)).join(", ")}){" "}
                &times; 0.6 ={" "}
                <span className="font-semibold">
                  {Math.round(Math.min(...bestThree.linkStrengths))}
                </span>{" "}
                &times; 0.6 ={" "}
                <span className="font-semibold text-[#bf8a0d]">{score} pts</span>
              </div>
              <div className="text-muted-foreground/70 text-[10px]">
                The weakest link in the chain sets the ceiling; the 0.6
                multiplier dampens 3° scores below 2° scores with the same
                per-hop strengths. Best 3° chain wins when multiple exist.
              </div>
            </>
          )}
          {!bestThree && data.degree === 4 && (
            <div className="text-foreground">
              <span className="font-semibold">No composite score at 4°+.</span>
              <br />
              Four-hop chains are too indirect to boil down to a single
              number. We show the chain itself so you can see who might
              introduce you.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function degreeOrdinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

/**
 * One row in the enumerated-chains view. Nodes are drawn
 * target → ... → You (left to right). Between each consecutive pair
 * we show a small strength pill (colored by trust-tier) regardless
 * of whether either endpoint is anonymized — the strength of the
 * link is public information even when the identities aren't.
 *
 * Mobile: row scrolls horizontally when it overflows. At 3 hops the
 * whole row fits at 375px; at 4 hops it scrolls.
 */
function ChainRow({
  chain,
  viewerAvatar,
  label,
}: {
  chain: {
    nodes: Array<{ id: string; name: string; avatar_url: string | null }>;
    linkStrengths: number[];
    degree: number;
  };
  viewerAvatar: string | null;
  label: string;
}) {
  // Flip for display: target on the left → You on the right.
  const displayNodes = [...chain.nodes].reverse();
  const displayStrengths = [...chain.linkStrengths].reverse();
  const youIndex = displayNodes.length - 1;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-2.5">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {displayNodes.map((node, i) => {
          const isTarget = i === 0;
          // Anonymity: target (i===0), the bridge (i===youIndex-1,
          // directly adjacent to viewer), and the viewer (youIndex)
          // are KNOWN. Everyone else is anonymized.
          const isBridge = i === youIndex - 1;
          const isYou = i === youIndex;
          const known = isTarget || isBridge || isYou;

          return (
            <span key={`${node.id}-${i}`} className="contents">
              {i > 0 && (
                <LinkStrengthPill strength={displayStrengths[i - 1]} />
              )}
              <ChainSegment
                name={isYou ? "You" : node.name}
                avatarUrl={isYou ? viewerAvatar : node.avatar_url}
                isTarget={isTarget}
                viewerKnows={known}
                label={isYou ? "You" : undefined}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact strength chip shown between two chain nodes. Uses the
 * same trustTier palette as the rest of the app so the color
 * buckets read consistently.
 */
function LinkStrengthPill({ strength }: { strength: number }) {
  if (!strength || strength <= 0) {
    return (
      <span className="mx-0.5 h-px w-3 shrink-0 bg-zinc-300" aria-hidden />
    );
  }
  const tier = trustTier(strength);
  return (
    <span
      className={cn(
        "mx-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
        tier.solidClass
      )}
      title={`${tier.label} · ${Math.round(strength)} pts`}
    >
      {Math.round(strength)}
    </span>
  );
}


function ChainSegment({
  name,
  avatarUrl,
  isTarget,
  viewerKnows: known,
  label,
}: {
  name: string;
  avatarUrl: string | null;
  isTarget: boolean;
  viewerKnows: boolean;
  /** Override the rendered label. Used for the viewer's "You" node. */
  label?: string;
}) {
  const first = name.split(" ")[0];
  // Anonymized nodes show their INITIALS with periods (e.g. "A.N.")
  // so the viewer gets a faint texture of who's in the chain without
  // the identity leakage of a full first name.
  const periodedInitials = initials(name)
    .split("")
    .map((ch) => `${ch}.`)
    .join("");
  const resolvedLabel = label ?? (known ? first : periodedInitials);
  const anonymized = !known && !isTarget;
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div
        className={cn(
          "relative h-10 w-10 overflow-hidden rounded-full border-2 bg-muted",
          isTarget ? "border-foreground" : "border-border"
        )}
      >
        {known && avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : known ? (
          <div className="flex h-full w-full items-center justify-center text-xs font-semibold">
            {initials(name)}
          </div>
        ) : avatarUrl ? (
          // Anonymized: blur the photo, then overlay a centered
          // outlined eye-off so the "hidden identity" cue sits on
          // top of the avatar itself instead of a corner badge.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={resolvedLabel}
            className="h-full w-full scale-125 object-cover blur-md"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        {anonymized && (
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <EyeOff
              className="h-4 w-4 text-zinc-700"
              strokeWidth={2.25}
            />
          </span>
        )}
      </div>
      <div className="max-w-[4.5rem] truncate text-[10px] font-medium text-muted-foreground">
        {resolvedLabel}
      </div>
    </div>
  );
}

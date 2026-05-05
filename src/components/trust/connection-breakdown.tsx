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
  Loader2,
  Shield,
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

// Shared vouch-score fields included on every variant so the popover
// can always render "what does the vouch score mean" — even on
// not_connected / direct branches.
interface TargetVouchFields {
  /** users.vouch_score (0–10). null when unset. */
  targetVouchScore?: number | null;
  /** users.vouch_count_received — feeds the math display. */
  targetVouchCount?: number | null;
}

interface DirectForwardData extends TargetVouchFields {
  type: "direct_forward";
  direction?: "outgoing" | "incoming";
  targetName: string;
  vouch: VouchInfo;
  reverseVouch: VouchInfo | null;
}

interface DirectReverseData extends TargetVouchFields {
  type: "direct_reverse";
  direction?: "outgoing" | "incoming";
  targetName: string;
  vouch: VouchInfo;
}

interface ConnectedData extends TargetVouchFields {
  type: "connected";
  direction?: "outgoing" | "incoming";
  targetName: string;
  targetAvatar?: string | null;
  viewerAvatar?: string | null;
  score: number;
  paths: PathInfo[];
  connection_count: number;
}

interface NotConnectedData extends TargetVouchFields {
  type: "not_connected";
  direction?: "outgoing" | "incoming";
  targetName: string;
}

interface MultiHopData extends TargetVouchFields {
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
}

type ConnectionData =
  | { type: "self" }
  | DirectForwardData
  | DirectReverseData
  | ConnectedData
  | NotConnectedData
  | MultiHopData;

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
   * Skip wrapping children in the popover trigger. Callers pass
   * this when the trust state doesn't warrant explanation — e.g.
   * direct vouches (1°) render as a purple pill and there's nothing
   * to break down, so clicking should do nothing.
   */
  disabled?: boolean;
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
  disabled = false,
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
      if (res.ok) {
        const body = (await res.json()) as ConnectionData;
        // 1° direct vouches don't warrant a detail window — there's
        // nothing to break down. If the fetch reveals a direct
        // connection, close the popover immediately and skip the
        // content render.
        if (body.type === "direct_forward" || body.type === "direct_reverse") {
          setOpen(false);
          return;
        }
        setData(body);
      }
    } catch {
      // Fail silently — the popover just won't show data.
    } finally {
      setLoading(false);
    }
  }, [targetUserId, direction, data]);

  if (isSelf || disabled) return <>{children}</>;

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
        {typeof data.targetVouchScore === "number" &&
          data.targetVouchScore > 0 && (
            <VouchScoreSection
              score={data.targetVouchScore}
              count={data.targetVouchCount ?? 0}
              targetName={data.targetName}
            />
          )}
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
        {typeof data.targetVouchScore === "number" &&
          data.targetVouchScore > 0 && (
            <VouchScoreSection
              score={data.targetVouchScore}
              count={data.targetVouchCount ?? 0}
              targetName={data.targetName}
            />
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
      {typeof data.targetVouchScore === "number" &&
        data.targetVouchScore > 0 && (
          <VouchScoreSection
            score={data.targetVouchScore}
            count={data.targetVouchCount ?? 0}
            targetName={data.targetName}
          />
        )}
    </div>
  );
}

/** Platform-wide vouch score block. Always rendered in the popover
 *  so viewers can see what the score means even when it doesn't
 *  appear on the badge (we suppress chips below 3 there). Includes
 *  a tone bucket + a one-line explanation + an expandable math
 *  breakdown. */
function VouchScoreSection({
  score,
  count,
  targetName,
}: {
  score: number;
  count: number;
  targetName: string;
}) {
  const [open, setOpen] = useState(false);
  const tier =
    score >= 5
      ? { color: "#1BEAA5", label: "Strong" }
      : score >= 4
        ? { color: "#39BFF8", label: "Modest" }
        : score >= 3
          ? { color: "#FDD34D", label: "Light" }
          : { color: "#FF8F8F", label: "Limited" };

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            Vouch score
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span
              className="inline-flex items-center gap-1 text-base font-semibold tabular-nums"
              style={{ color: tier.color }}
            >
              <Shield
                className="h-3.5 w-3.5"
                fill="currentColor"
                strokeWidth={0}
              />
              {score.toFixed(1)}
            </span>
            <span className="text-[11px] text-muted-foreground">/ 10</span>
            <span
              className="ml-1 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: tier.color }}
            >
              {tier.label}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/40"
        >
          {open ? "Hide math" : "Show math"}
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Platform-wide measure of how many people have vouched for{" "}
        {targetName} and how strong those vouches are. Independent of your
        personal connection — useful for spotting trustworthy hosts even
        when you don&apos;t share mutuals yet.
      </p>
      {open && (
        <div className="mt-2 rounded-lg bg-muted/30 p-2.5 text-[11px] font-mono space-y-1.5 text-foreground">
          <div>
            <span className="font-semibold">Formula:</span>
            <br />
            score = 10 × (1 − e^(−signal / 30))
          </div>
          <div>
            <span className="font-semibold">Signal:</span>
            <br />
            signal = Σ vouch_power(j) × log(2 + vouch_signal(j))
          </div>
          <div>
            …summed over every inbound vouch (j → {targetName}). Stronger
            vouchers (higher vouch_power) and vouchers who themselves have
            high signal carry more weight, so a few well-vetted vouchers
            beat many weak ones.
          </div>
          <div className="border-t border-border pt-1.5 text-muted-foreground">
            {count} inbound{" "}
            {count === 1 ? "vouch" : "vouches"} · current score{" "}
            <span className="font-semibold" style={{ color: tier.color }}>
              {score.toFixed(1)}
            </span>
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

  // Orient every chain you-first, filter to the viewer's actual
  // degree (i.e. only show 3° paths on a 3° host, only 4° paths on
  // a 4° host — longer chains between two nodes aren't a shorter
  // connection, so they'd just add noise), then sort by composite
  // strength descending.
  const chainsYouFirst = rawChains
    .map((c) => ({
      nodes: isIncoming ? [...c.nodes].reverse() : c.nodes,
      linkStrengths: isIncoming
        ? [...c.linkStrengths].reverse()
        : c.linkStrengths,
      degree: c.degree,
      composite: c.composite,
    }))
    .filter((c) => c.degree === data.degree)
    .sort((a, b) => b.composite - a.composite);

  // Single-degree view now — one group per render.
  const groups: Array<[number, typeof chainsYouFirst]> =
    chainsYouFirst.length > 0 ? [[data.degree, chainsYouFirst]] : [];

  // Badge score for multi-hop = mean(hop strengths) × dampen, picking
  // the strongest chain within the viewer's actual degree bucket
  // (closest reachable). 3° dampen = 0.66, 4° dampen = 0.5.
  const DAMPEN = data.degree === 3 ? 0.66 : 0.5;
  const mean = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
  const sameDegree = chainsYouFirst.filter((c) => c.degree === data.degree);
  const bestChain =
    sameDegree.length > 0
      ? sameDegree.reduce((best, c) =>
          mean(c.linkStrengths) * DAMPEN > mean(best.linkStrengths) * DAMPEN
            ? c
            : best
        )
      : null;
  const score = bestChain
    ? Math.round(mean(bestChain.linkStrengths) * DAMPEN)
    : 0;
  const scoreColor = data.degree === 3 ? "text-[#bf8a0d]" : "text-zinc-700";

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
      {bestChain && (
        <div className="mt-0.5 text-xs text-muted-foreground">
          Trust score:{" "}
          <span className={cn("font-semibold", scoreColor)}>{score}</span>{" "}
          <span className="text-muted-foreground/70">
            · {data.degree}° dampened
          </span>
        </div>
      )}
      {chainsYouFirst.length > 1 && (
        <div className="mt-0.5 text-xs text-muted-foreground">
          {chainsYouFirst.length} paths between you
        </div>
      )}

      <div className="mt-3 space-y-2">
        {groups.map(([, rows]) =>
          rows.map((chain) => {
            counter += 1;
            return (
              <ChainRow
                key={counter}
                chain={chain}
                viewerAvatar={viewer.avatar_url}
                label={`Path ${counter}`}
              />
            );
          })
        )}
      </div>

      <ShowMathToggle on={showMath} onToggle={() => setShowMath((v) => !v)} />
      {showMath && (
        <div className="mt-2 rounded-lg bg-muted/30 p-3 text-[11px] font-mono space-y-2">
          {bestChain && (
            <>
              <div className="text-foreground">
                <span className="font-semibold">
                  {data.degree}° dampening formula:
                </span>
                <br />
                score = avg(hop strengths) &times; {DAMPEN}
              </div>
              <div className="rounded-md bg-white/70 px-2.5 py-1.5 text-foreground space-y-1">
                <div>
                  avg(
                  {bestChain.linkStrengths
                    .map((s) => Math.round(s))
                    .join(", ")}
                  ) ={" "}
                  <span className="font-semibold">
                    {Math.round(mean(bestChain.linkStrengths))}
                  </span>
                </div>
                <div>
                  {Math.round(mean(bestChain.linkStrengths))} &times;{" "}
                  {DAMPEN} ={" "}
                  <span className={cn("font-semibold", scoreColor)}>
                    {score} pts
                  </span>
                </div>
              </div>
              <div className="text-muted-foreground/70 text-[10px]">
                {data.degree === 3
                  ? "Average of the three hop strengths, dampened by 0.66 so 3° scores stay visibly lower than 2° scores at the same per-hop strength. Best 3° chain wins when multiple exist."
                  : "Average of the four hop strengths, dampened by 0.5 since an extra hop genuinely dilutes the trust signal. Best 4° chain wins when multiple exist."}
              </div>
            </>
          )}
        </div>
      )}

      {typeof data.targetVouchScore === "number" &&
        data.targetVouchScore > 0 && (
          <VouchScoreSection
            score={data.targetVouchScore}
            count={data.targetVouchCount ?? 0}
            targetName={data.targetName}
          />
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
      {/* Avatar row + strength pills row vertically aligned around the
          avatar center. The `LinkStrengthPill` is sized to match the
          avatar's vertical midpoint and the row overall is `items-center`
          so the pill caps at the same baseline as the avatar circle. */}
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
 * Pill rendered between two adjacent people in a chain row. Each
 * link is a 1° vouch — we render that as a small "1°" pill and
 * color-code by strength so the chain reads at a glance:
 *
 *   ≤ 14   → mustard (yellow) — weak vouch
 *   15–30  → sky (blue)        — modest vouch
 *   ≥ 31   → mint (green)      — strong vouch
 *
 * Numeric value is preserved in the title attribute for hover
 * inspection. Centered vertically with the avatars so the row
 * reads as a clean horizontal sequence.
 */
function LinkStrengthPill({ strength }: { strength: number }) {
  // Wrapper aligns the pill to the AVATAR center (not the segment
  // total height — segments include the name label below the
  // avatar). The `mt-` value matches half the avatar height (40/2=20)
  // minus half the pill height so the pill caps at the avatar's
  // vertical midpoint.
  if (!strength || strength <= 0) {
    return (
      <span
        className="mx-0.5 inline-flex shrink-0 items-center"
        style={{ height: 40 }}
        aria-hidden
      >
        <span className="h-px w-3 bg-zinc-300" />
      </span>
    );
  }
  const rounded = Math.round(strength);
  const bucket =
    strength >= 31
      ? { bg: "#1BEAA5", fg: "#0B2E25", label: "Strong" }
      : strength >= 15
        ? { bg: "#39BFF8", fg: "#0B2E25", label: "Modest" }
        : { bg: "#FDD34D", fg: "#0B2E25", label: "Weak" };
  return (
    <span
      className="mx-0.5 inline-flex shrink-0 items-center"
      style={{ height: 40 }}
    >
      <span
        className="inline-flex items-center rounded-full px-1.5 py-[1px] text-[10px] font-semibold leading-none tabular-nums"
        style={{ backgroundColor: bucket.bg, color: bucket.fg }}
        title={`${bucket.label} 1° vouch · ${rounded} pts`}
      >
        1°
      </span>
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
        ) : anonymized ? (
          // Anonymized intermediary — a small "incognito" cartoon
          // face on a soft tinted circle. Friendlier than the prior
          // blurred-photo + eye-off treatment, and doesn't tease
          // the actual photo through a blur (privacy improvement).
          <div
            className="flex h-full w-full items-center justify-center text-xl"
            style={{ backgroundColor: "rgba(245, 241, 230, 0.18)" }}
            aria-label="Anonymous mutual connection"
          >
            <span aria-hidden>🥸</span>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="max-w-[4.5rem] truncate text-[10px] font-medium text-muted-foreground">
        {resolvedLabel}
      </div>
    </div>
  );
}

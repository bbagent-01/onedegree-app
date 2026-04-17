"use client";

import { useState, useCallback, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, User as UserIcon, Users, UserX } from "lucide-react";
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
      score: number;
      paths: PathInfo[];
      connection_count: number;
    }
  | {
      type: "not_connected";
      direction?: "outgoing" | "incoming";
      targetName: string;
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

  // Direct vouches (forward / reverse). The semantics of
  // "forward" depend on the direction flag on the data:
  //   outgoing: forward = viewer → target
  //   incoming: forward = target → viewer (host's trust of me)
  if (data.type === "direct_forward" || data.type === "direct_reverse") {
    const vouch = data.vouch;
    const tier = trustTier(vouch.vouch_score);
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
          <StrengthChip tier={tier} />
        </div>
        {data.type === "direct_forward" && data.reverseVouch && (
          <>
            <div className="mt-3 border-t border-border pt-3 text-sm font-semibold">
              {isIncoming
                ? `You also vouched for ${data.targetName}`
                : `${data.targetName} also vouched for you`}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <StrengthChip
                tier={trustTier(data.reverseVouch.vouch_score)}
              />
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
        {sortedPaths.map((path) => (
          <PathRow key={path.connector.id} path={path} />
        ))}
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

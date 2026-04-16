"use client";

import { useState, useCallback, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield, Star, UserX, Users, Loader2 } from "lucide-react";
import { YEARS_KNOWN_BUCKETS } from "@/lib/vouch-constants";

// ── Types for the API response ──

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
      targetName: string;
      vouch: VouchInfo;
      reverseVouch: VouchInfo | null;
    }
  | { type: "direct_reverse"; targetName: string; vouch: VouchInfo }
  | {
      type: "connected";
      targetName: string;
      score: number;
      paths: PathInfo[];
      connection_count: number;
    }
  | { type: "not_connected"; targetName: string };

// ── Helpers ──

function yearsLabel(bucket: string): string {
  return YEARS_KNOWN_BUCKETS.find((b) => b.value === bucket)?.label ?? bucket;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function vouchTypeLabel(t: string) {
  return t === "inner_circle" ? "Inner Circle" : "Standard";
}

// ── Main Wrapper Component ──

interface ConnectionPopoverProps {
  /** The target user's internal ID. */
  targetUserId: string;
  /** If true, skip popover entirely (e.g. viewer's own avatar). */
  isSelf?: boolean;
  /** The wrapped avatar or element to trigger the popover. */
  children: ReactNode;
}

/**
 * Wraps any avatar/element with a popover showing the full connection
 * breakdown between the viewer and the target user. Fetches data on
 * first open via /api/trust/connection (auth handled server-side).
 * Set isSelf=true to skip popover on the viewer's own avatar.
 */
export function ConnectionPopover({
  targetUserId,
  isSelf = false,
  children,
}: ConnectionPopoverProps) {
  const [data, setData] = useState<ConnectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (data) return; // Already fetched
    setLoading(true);
    try {
      const res = await fetch(
        `/api/trust/connection?targetId=${encodeURIComponent(targetUserId)}`
      );
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // Silently fail — popover just won't show data
    } finally {
      setLoading(false);
    }
  }, [targetUserId, data]);

  // Don't show popover on self — must be after all hooks
  if (isSelf) {
    return <>{children}</>;
  }

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
        className="w-80 max-h-[400px] overflow-y-auto p-0"
      >
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {data && !loading && <ConnectionBreakdown data={data} />}
      </PopoverContent>
    </Popover>
  );
}

// ── Breakdown Content ──

function ConnectionBreakdown({ data }: { data: ConnectionData }) {
  if (data.type === "self") return null;

  if (data.type === "direct_forward") {
    return (
      <div className="p-3">
        <div className="text-sm font-semibold">
          You vouched for {data.targetName}
        </div>
        <VouchDetail vouch={data.vouch} className="mt-2" />
        {data.reverseVouch && (
          <>
            <div className="mt-3 border-t border-border pt-3 text-sm font-semibold">
              {data.targetName} also vouched for you
            </div>
            <VouchDetail vouch={data.reverseVouch} className="mt-2" />
          </>
        )}
      </div>
    );
  }

  if (data.type === "direct_reverse") {
    return (
      <div className="p-3">
        <div className="text-sm font-semibold">
          {data.targetName} vouched for you
        </div>
        <VouchDetail vouch={data.vouch} className="mt-2" />
      </div>
    );
  }

  if (data.type === "connected") {
    return (
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-semibold">
            Connected to {data.targetName} via{" "}
            {data.connection_count} connection
            {data.connection_count > 1 ? "s" : ""}
          </div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          1° Vouch Score:{" "}
          <span className="font-semibold text-foreground">
            {data.score} pts
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {data.paths.map((path, i) => (
            <PathDetail key={path.connector.id} path={path} index={i} targetName={data.targetName} />
          ))}
        </div>

        {data.paths.length > 1 && (
          <div className="mt-3 border-t border-border pt-2 text-xs">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-mono tabular-nums font-semibold">
              {data.paths
                .map((p) => `${p.weighted_score}`)
                .join(" + ")}{" "}
              = {data.score} pts
            </span>
          </div>
        )}
      </div>
    );
  }

  // not_connected
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

// ── Sub-components ──

function VouchDetail({
  vouch,
  className,
}: {
  vouch: VouchInfo;
  className?: string;
}) {
  const isInner = vouch.vouch_type === "inner_circle";
  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-xs">
        <Badge
          className={
            isInner
              ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
              : "bg-blue-100 text-blue-800 hover:bg-blue-100"
          }
        >
          {isInner ? (
            <Star className="mr-1 h-3 w-3" />
          ) : (
            <Shield className="mr-1 h-3 w-3" />
          )}
          {vouchTypeLabel(vouch.vouch_type)}
        </Badge>
        <span className="text-muted-foreground">
          {yearsLabel(vouch.years_known_bucket)}
        </span>
        <span className="ml-auto font-semibold font-mono tabular-nums">
          {vouch.vouch_score} pts
        </span>
      </div>
    </div>
  );
}

function PathDetail({ path, index, targetName }: { path: PathInfo; index: number; targetName: string }) {
  const isFirst = index === 0;
  const connectorFirst = path.connector.name.split(" ")[0];
  const targetFirst = targetName.split(" ")[0];
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5" size="sm">
            {path.connector.avatar_url && (
              <AvatarImage
                src={path.connector.avatar_url}
                alt={path.connector.name}
              />
            )}
            <AvatarFallback className="text-[8px]">
              {initials(path.connector.name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">
            {isFirst ? "Strongest" : `Path ${path.rank}`} — via{" "}
            {connectorFirst}
          </span>
        </div>
        {path.rank > 1 && (
          <span className="text-muted-foreground">
            weight: {path.weight.toFixed(2)}
          </span>
        )}
      </div>

      <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground font-mono">
        <div>
          You → {connectorFirst}:{" "}
          <span className="text-foreground">{path.link_a} pts</span>
        </div>
        <div>
          {connectorFirst} → {targetFirst}:{" "}
          <span className="text-foreground">
            {path.connector_vouch_score} × {path.connector_vouch_power} VP ={" "}
            {path.link_b.toFixed(1)} pts
          </span>
        </div>
        <div>
          Path: avg({path.link_a}, {path.link_b.toFixed(1)}) ={" "}
          <span className="text-foreground font-semibold">
            {path.path_strength} pts
          </span>
          {path.rank > 1 && (
            <span>
              {" "}
              × {path.weight.toFixed(3)} ={" "}
              <span className="text-foreground font-semibold">
                {path.weighted_score} pts
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

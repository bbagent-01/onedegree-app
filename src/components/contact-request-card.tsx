"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Users,
  MessageSquare,
  Check,
  X,
  Star,
} from "lucide-react";

interface ContactRequestCardProps {
  request: {
    id: string;
    listing_id: string;
    guest_id: string;
    host_id: string;
    message: string;
    check_in: string | null;
    check_out: string | null;
    guest_count: number;
    status: string;
    host_response_message: string | null;
    created_at: string;
    listing?: { id: string; title: string; area_name: string } | null;
    guest?: {
      id: string;
      name: string;
      avatar_url: string | null;
      guest_rating: number | null;
      guest_review_count: number;
      vouch_power: number | null;
    } | null;
    host?: {
      id: string;
      name: string;
      avatar_url: string | null;
    } | null;
  };
  viewAs: "host" | "guest";
  onStatusChange?: () => void;
}

const STATUS_BADGES: Record<string, { variant: "default" | "success" | "destructive" | "warning"; label: string }> = {
  pending: { variant: "warning", label: "Pending" },
  accepted: { variant: "success", label: "Accepted" },
  declined: { variant: "destructive", label: "Declined" },
  cancelled: { variant: "default", label: "Cancelled" },
};

export function ContactRequestCard({
  request,
  viewAs,
  onStatusChange,
}: ContactRequestCardProps) {
  const [responding, setResponding] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const badge = STATUS_BADGES[request.status] || STATUS_BADGES.pending;
  const counterpart = viewAs === "host" ? request.guest : request.host;

  async function handleRespond(status: "accepted" | "declined") {
    setLoading(true);
    try {
      const res = await fetch(`/api/contact-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          hostResponseMessage: responseMessage.trim() || null,
        }),
      });
      if (res.ok) {
        onStatusChange?.();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {counterpart?.avatar_url ? (
            <img
              src={counterpart.avatar_url}
              alt={counterpart.name}
              className="size-10 rounded-full object-cover"
            />
          ) : (
            <div className="size-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-sm">
              {counterpart?.name?.charAt(0) || "?"}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">
              {counterpart?.name || "Unknown"}
            </p>
            {viewAs === "host" && request.guest && (
              <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                {request.guest.guest_rating && (
                  <span className="flex items-center gap-0.5">
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                    {Number(request.guest.guest_rating).toFixed(1)}
                  </span>
                )}
                <span>
                  {request.guest.guest_review_count} stay
                  {request.guest.guest_review_count !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      {/* Listing */}
      {request.listing && (
        <Link
          href={`/listings/${request.listing.id}`}
          className="text-xs text-primary hover:underline"
        >
          {request.listing.title} · {request.listing.area_name}
        </Link>
      )}

      {/* Details */}
      <div className="flex items-center gap-4 mt-2 text-xs text-foreground-secondary">
        {request.check_in && (
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3" />
            {new Date(request.check_in).toLocaleDateString()}
            {request.check_out && (
              <> – {new Date(request.check_out).toLocaleDateString()}</>
            )}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="size-3" />
          {request.guest_count} guest{request.guest_count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Message */}
      <div className="mt-3 rounded-lg bg-background-mid p-3">
        <div className="flex items-start gap-2">
          <MessageSquare className="size-3.5 text-foreground-tertiary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground-secondary leading-relaxed">
            {request.message}
          </p>
        </div>
      </div>

      {/* Host response */}
      {request.host_response_message && (
        <div className="mt-2 rounded-lg bg-primary-light p-3">
          <p className="text-xs font-medium text-foreground mb-1">
            Host response:
          </p>
          <p className="text-sm text-foreground-secondary">
            {request.host_response_message}
          </p>
        </div>
      )}

      {/* Host actions */}
      {viewAs === "host" && request.status === "pending" && (
        <div className="mt-3 space-y-2">
          {responding ? (
            <>
              <Textarea
                placeholder="Optional message to the guest..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleRespond("accepted")}
                  disabled={loading}
                  className="flex-1"
                >
                  <Check className="size-3.5 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRespond("declined")}
                  disabled={loading}
                  className="flex-1"
                >
                  <X className="size-3.5 mr-1" />
                  Decline
                </Button>
              </div>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setResponding(true)}
              className="w-full"
            >
              Respond
            </Button>
          )}
        </div>
      )}

      {/* Timestamp */}
      <p className="text-[10px] text-foreground-tertiary mt-3">
        {new Date(request.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </div>
  );
}

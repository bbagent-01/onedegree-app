"use client";

/**
 * Clickable TrustTag wrapper. Renders the same visual pill as
 * <TrustTag> but opens the trust-detail ConnectionPopover on click
 * (anchored below the pill, escape / outside-click to dismiss).
 *
 * This is the canonical way to render a TrustTag anywhere the user
 * might want to inspect the path strengths or connector chain. For
 * pure-display contexts (e.g. a profile summary card where the
 * popover would be redundant) keep using the base <TrustTag>.
 *
 * The split between "avatar → profile" and "TrustTag → trust detail"
 * is the S5 click-model rule: avatars and names navigate, trust
 * pills explain. See session prompt Task 7.
 */

import type { ComponentProps } from "react";
import { ConnectionPopover } from "./connection-breakdown";
import { TrustTag } from "./trust-tag";

type TrustTagProps = ComponentProps<typeof TrustTag>;

interface Props extends TrustTagProps {
  /** Target user whose trust detail should be shown. */
  targetUserId: string;
  /** Direction of trust to display. Default outgoing (viewer →
   *  target); pass "incoming" on surfaces where the tag represents
   *  the host's vetting of the viewer. */
  direction?: "outgoing" | "incoming";
  /** Skip the popover entirely (e.g. for the viewer's own entries)
   *  while keeping the visual in place. */
  disabled?: boolean;
}

export function TrustTagPopover({
  targetUserId,
  direction = "outgoing",
  disabled = false,
  ...tagProps
}: Props) {
  // 1° / direct-vouch tags are non-interactive (ConnectionPopover
  // itself suppresses the popover — there's nothing to break down).
  // Skip the hover affordance entirely so a non-clickable tag
  // doesn't hint that it's clickable.
  const isNonInteractive =
    disabled || tagProps.degree === 1 || tagProps.direct === true;
  if (isNonInteractive) {
    return <TrustTag {...tagProps} />;
  }
  // Hover affordance — a subtle white rounded container with a soft
  // drop shadow appears on hover so viewers see the pill is
  // interactive without cluttering the tag's default rendering. The
  // small `?` glyph at the end of the badge is a permanent hint that
  // the row is interactive even before hover. Wider padding gives
  // the click target some breathing room without shifting the
  // surrounding layout (negative margins compensate so the pill's
  // resting position is unchanged).
  return (
    <ConnectionPopover
      targetUserId={targetUserId}
      direction={direction}
    >
      <span className="-mx-2 -my-1 inline-flex cursor-pointer rounded-xl px-2 py-1 transition-all hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-black/5">
        <TrustTag {...tagProps} showHelpHint />
      </span>
    </ConnectionPopover>
  );
}

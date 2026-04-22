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
  if (disabled) {
    return <TrustTag {...tagProps} />;
  }
  return (
    <ConnectionPopover
      targetUserId={targetUserId}
      direction={direction}
      disabled={tagProps.degree === 1 || tagProps.direct === true}
    >
      <span className="cursor-pointer">
        <TrustTag {...tagProps} />
      </span>
    </ConnectionPopover>
  );
}

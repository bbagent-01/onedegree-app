import { Eye } from "lucide-react";

/**
 * Small amber pill shown near the profile header when the viewer
 * doesn't have full network access to the person they're looking at.
 * Purely informational — the page currently renders the full profile
 * regardless of trust state; the badge is a nudge that the viewer
 * would unlock a deeper relationship by requesting an intro or
 * growing their mutual network.
 *
 * Caller is responsible for deciding when to render it — typically
 * when the viewer is signed in, isn't looking at themselves, and has
 * no direct vouch / accepted intro with the target.
 */
export function PreviewBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"
      title="You're seeing a limited view. Request an intro to see their full profile and listings."
    >
      <Eye className="h-3 w-3" />
      Preview
    </span>
  );
}

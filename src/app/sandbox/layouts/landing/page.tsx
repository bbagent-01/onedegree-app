import { LiveFrame } from "../_lib/live-frame";

export const runtime = "edge";

export default function Page() {
  return (
    <LiveFrame
      src="/join"
      liveLabel="/join (closest current public-facing surface — / redirects to /browse)"
      note="There's no live landing page today. This iframes /join so we can iterate from the closest current marketing surface."
    />
  );
}

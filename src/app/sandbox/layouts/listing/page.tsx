import { LiveFrame } from "../_lib/live-frame";

export const runtime = "edge";

export default function Page() {
  return (
    <LiveFrame
      src="/browse"
      liveLabel="/listings/[id]"
      note="Click any listing card on /browse to navigate the iframe to the detail page. Once you pick a listing to base variations on, I'll wire this route to that specific URL."
    />
  );
}

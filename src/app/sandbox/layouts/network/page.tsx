import { LiveFrame } from "../_lib/live-frame";

export const runtime = "edge";

export default function Page() {
  return (
    <LiveFrame
      src="/dashboard?tab=network"
      liveLabel="/dashboard?tab=network"
    />
  );
}

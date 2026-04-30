import { LiveFrame } from "../_lib/live-frame";

export const runtime = "edge";

export default function Page() {
  return <LiveFrame src="/browse" liveLabel="/browse" />;
}

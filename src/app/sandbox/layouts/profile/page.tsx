import { LiveFrame } from "../_lib/live-frame";

export const runtime = "edge";

export default function Page() {
  return (
    <LiveFrame
      src="/profile"
      liveLabel="/profile (redirects to your own profile when signed in)"
    />
  );
}

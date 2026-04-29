// Public sandbox for trust-badge variant exploration. No DB integration.
// All sample data is hardcoded inline below — edit values directly to
// see how each variant reacts. This page is intentionally not auth-
// gated (see middleware.ts isPublicRoute matcher).

import { TrustBadgeSandbox } from "./TrustBadgeSandbox";

export const runtime = "edge";
export const metadata = { title: "Trust badge variants — Trustead sandbox" };

export default function Page() {
  return <TrustBadgeSandbox />;
}

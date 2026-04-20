// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.

import "../../globals.css";

export const metadata = {
  title: "Design System · 1DB Dev",
};

export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-white text-foreground">{children}</div>;
}

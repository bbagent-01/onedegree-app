// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable
// alongside Dev1 and Dev3.
//
// Editor-only piece of the sandbox: renders the palette circle that
// opens the BrandEditorDrawer. Admin-gated by SandboxMount. The
// theme APPLICATION (sessionStorage init + CSS injection) lives in
// SandboxApplier.tsx, which is always rendered for every user so
// the Trustead theme is the site's default at trustead.app.
"use client";

import { SandboxIndicator } from "./SandboxIndicator";

export default function SandboxClient() {
  return <SandboxIndicator />;
}

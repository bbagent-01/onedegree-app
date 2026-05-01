import { DesktopNav } from "@/components/layout/desktop-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Footer } from "@/components/layout/footer";
import { VouchBackToaster } from "@/components/trust/vouch-back-toaster";
import SandboxApplier from "@/components/dev/SandboxApplier";
import { OnboardingMount } from "@/components/onboarding/OnboardingMount";

// ALPHA ONLY (CC-Dev1): compile-time gate. `NEXT_PUBLIC_*` env vars
// are inlined by Next.js at build time, so when this evaluates to
// `false` webpack dead-code-eliminates the dynamic import below.
// NODE_ENV is deliberately not used here — Cloudflare Pages runs
// Next as production at runtime even on alpha-c, where we DO want
// the feature. The prod/alpha split is the env var being set vs.
// unset. Remove this block before beta.
const IMPERSONATION_ENABLED_AT_BUILD =
  process.env.NEXT_PUBLIC_ENABLE_IMPERSONATION === "true";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let impersonationMount: React.ReactNode = null;
  let sandboxMount: React.ReactNode = null;
  if (IMPERSONATION_ENABLED_AT_BUILD) {
    const { ImpersonationMount } = await import(
      "@/components/admin/ImpersonationMount"
    );
    impersonationMount = <ImpersonationMount />;
    // REMOVE BEFORE BETA (Dev2): re-applies the sandbox theme overrides
    // on every route and renders the site-wide purple dashed indicator
    // whenever Loren has the sandbox toggle on. Gated behind the same
    // build-time env flag so prod bundles strip it out entirely.
    const SandboxMount = (
      await import("@/components/dev/SandboxMount")
    ).default;
    sandboxMount = <SandboxMount />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Trustead theme baseline — applied for EVERY user (not
          admin-gated). Renders the new green/cream/mint look as the
          site's default. Admin-only editor (palette + drawer) lives
          inside SandboxMount below. */}
      <SandboxApplier />
      <DesktopNav />
      {/* Bottom padding reserves space for the fixed mobile nav plus the
          iOS home-indicator safe area. Stripped on md+ where the nav
          isn't fixed. */}
      <main
        className="flex-1 md:!pb-0"
        style={{
          paddingBottom: "calc(4rem + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </main>
      <Footer />
      <MobileNav />
      <VouchBackToaster />
      {/* Admin floating dock (alpha only) — keeps the impersonation
          icon and the brand-switcher palette icon on the same plane,
          so the palette spaces from the impersonation icon via the
          dock's flex-gap rather than a hardcoded left offset. The
          ImpersonationBar (top-of-viewport) and the modal/popover
          children of these mounts use their own fixed positioning
          and escape this dock visually. */}
      {(impersonationMount || sandboxMount) && (
        <div className="fixed bottom-4 left-4 z-[80] flex items-center gap-3">
          {impersonationMount}
          {sandboxMount}
        </div>
      )}
      {/* Show-once onboarding takeover. Server-checked: returns null
          unless the signed-in user has users.onboarding_seen_at IS
          NULL. Mounts last so it sits on top of nav/footer/cookie
          banner via z-[60]. */}
      <OnboardingMount />
    </div>
  );
}

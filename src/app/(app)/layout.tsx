import { DesktopNav } from "@/components/layout/desktop-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Footer } from "@/components/layout/footer";

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
  if (IMPERSONATION_ENABLED_AT_BUILD) {
    const { ImpersonationMount } = await import(
      "@/components/admin/ImpersonationMount"
    );
    impersonationMount = <ImpersonationMount />;
  }

  return (
    <div className="flex min-h-screen flex-col">
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
      {impersonationMount}
    </div>
  );
}

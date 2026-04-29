import { DesktopNav } from "@/components/layout/desktop-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Footer } from "@/components/layout/footer";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
      <OnboardingGate />
    </div>
  );
}

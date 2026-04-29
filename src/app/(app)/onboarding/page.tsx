"use client";

import { useRouter } from "next/navigation";
import { OnboardingSwiper } from "@/components/onboarding/onboarding-swiper";

/**
 * Test/preview route — always renders the welcome swiper, regardless of
 * users.onboarding_seen_at. Does NOT write the seen flag, so this URL is
 * repeatable for QA and demos. The auto-trigger gate on /browse is the
 * production path; this route is a manual escape hatch.
 */
export default function OnboardingPreviewPage() {
  const router = useRouter();
  return <OnboardingSwiper onClose={() => router.push("/browse")} />;
}

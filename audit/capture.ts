/**
 * audit/capture.ts — Playwright screenshot capture for UX Map Phase A
 *
 * Produces deterministic screenshots of every user-facing route in the 1DB app
 * across three trust levels (0°, 1°, 4°) and two viewports (desktop 1440×900,
 * mobile 375×812).
 *
 * OUTPUT STRUCTURE:
 *   audit/screenshots/{trust-level}/{viewport}/{route-slug}.png
 *   audit/screenshots/{trust-level}/{viewport}/{route-slug}-full.png  (long-scroll)
 *   audit/screenshots/{trust-level}/{viewport}/{route-slug}-open.png  (modal/expanded)
 *
 * PREREQUISITES:
 *   1. Install Playwright:        npm install --save-dev @playwright/test
 *   2. Install browsers:          npx playwright install chromium
 *   3. Set AUDIT_TARGET_URL:      export AUDIT_TARGET_URL=https://alpha-c.onedegreebnb.com
 *   4. Provide Clerk storageState files for each trust level (see AUTH_SETUP below).
 *
 * AUTH SETUP (one-time):
 *   For each of the three trust accounts (0deg/1deg/4deg), sign in manually once
 *   and save the storage state:
 *     npx playwright codegen $AUDIT_TARGET_URL --save-storage audit/.auth/0deg.json
 *   Repeat for 1deg.json and 4deg.json.
 *   (The 0deg account should be a fresh Clerk test account with zero vouches.)
 *
 *   Known accounts for 1DB (documented in seed data):
 *     - 0deg: audit-0deg-<timestamp> — create fresh via Clerk test phone
 *     - 1deg: Loren's primary account (most vouches; high connectivity)
 *     - 4deg: Pavel or Ines (at chain-only distance from test targets)
 *
 * RUN:
 *   npx tsx audit/capture.ts
 *   (or: AUDIT_TEST_LISTING_ID=<uuid> npx tsx audit/capture.ts to override listing)
 *
 * DETERMINISM:
 *   The script uses ONE fixed listing ID for /listings/[id] to keep screenshots
 *   comparable across runs. The ID is the first active seed listing from Loren's
 *   account. Override via env AUDIT_TEST_LISTING_ID.
 */

import { chromium, Browser, BrowserContext, Page } from "@playwright/test";
import fs from "fs/promises";
import path from "path";

// ---------- CONFIG ----------
const TARGET_URL = process.env.AUDIT_TARGET_URL || "https://alpha-c.onedegreebnb.com";
const AUTH_DIR = path.join(__dirname, ".auth");
const SCREENSHOT_DIR = path.join(__dirname, "screenshots");

// Replace with the ID of a real active seed listing from Loren's account.
// Run `select id, title from listings where host_id = '<loren-id>' and visibility_mode != 'hidden' limit 1;` in Supabase.
const TEST_LISTING_ID = process.env.AUDIT_TEST_LISTING_ID || "REPLACE_WITH_SEED_LISTING_ID";

// Replace with a real thread the 1deg account participates in.
const TEST_THREAD_ID = process.env.AUDIT_TEST_THREAD_ID || "REPLACE_WITH_SEED_THREAD_ID";

// Replace with a real booking for the 1deg account.
const TEST_BOOKING_ID = process.env.AUDIT_TEST_BOOKING_ID || "REPLACE_WITH_SEED_BOOKING_ID";

// Replace with a real wishlist ID.
const TEST_WISHLIST_ID = process.env.AUDIT_TEST_WISHLIST_ID || "REPLACE_WITH_SEED_WISHLIST_ID";

// Replace with a real listing the 1deg account hosts.
const TEST_HOSTED_LISTING_ID = process.env.AUDIT_TEST_HOSTED_LISTING_ID || "REPLACE_WITH_HOSTED_LISTING_ID";

// Profile ID for a 4° target user (for /profile/[id] at chain-only distance).
const TEST_PROFILE_ID = process.env.AUDIT_TEST_PROFILE_ID || "REPLACE_WITH_DISTANT_USER_ID";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
] as const;

const TRUST_LEVELS = [
  { name: "0deg", storageState: path.join(AUTH_DIR, "0deg.json") },
  { name: "1deg", storageState: path.join(AUTH_DIR, "1deg.json") },
  { name: "4deg", storageState: path.join(AUTH_DIR, "4deg.json") },
] as const;

interface RouteSpec {
  slug: string;     // file-safe slug used in screenshot filenames
  path: string;     // URL path with substitutions applied
  fullScroll?: boolean;
  openVariant?: {
    actionLabel: string;
    description: string;
  };
  skipForTrust?: Array<"0deg" | "1deg" | "4deg">;
}

const ROUTES: RouteSpec[] = [
  { slug: "root", path: "/" },
  { slug: "sign-in", path: "/sign-in", skipForTrust: ["0deg", "1deg", "4deg"] }, // captured signed-out only
  { slug: "sign-up", path: "/sign-up", skipForTrust: ["0deg", "1deg", "4deg"] },
  { slug: "browse", path: "/browse", fullScroll: true },
  { slug: "dashboard", path: "/dashboard" },
  { slug: "dashboard-network", path: "/dashboard/network", fullScroll: true },
  { slug: "dashboard-traveling", path: "/dashboard/traveling" },
  { slug: "help", path: "/help", fullScroll: true },
  { slug: "hosting", path: "/hosting" },
  { slug: "hosting-create", path: "/hosting/create", fullScroll: true, skipForTrust: ["0deg", "4deg"] },
  {
    slug: "hosting-listing-edit",
    path: `/hosting/listings/${TEST_HOSTED_LISTING_ID}/edit`,
    fullScroll: true,
    skipForTrust: ["0deg", "4deg"],
  },
  { slug: "inbox", path: "/inbox" },
  {
    slug: "inbox-thread",
    path: `/inbox/${TEST_THREAD_ID}`,
    skipForTrust: ["0deg", "4deg"],
  },
  { slug: "invite", path: "/invite" },
  {
    slug: `listings-${TEST_LISTING_ID.slice(0, 8)}`,
    path: `/listings/${TEST_LISTING_ID}`,
    fullScroll: true,
    openVariant: {
      actionLabel: "Request Intro",
      description: "Click Request Intro to capture dialog-open state",
    },
  },
  {
    slug: `listings-${TEST_LISTING_ID.slice(0, 8)}-reserve`,
    path: `/listings/${TEST_LISTING_ID}/reserve`,
    skipForTrust: ["0deg", "4deg"],
  },
  {
    slug: `profile-${TEST_PROFILE_ID.slice(0, 8)}`,
    path: `/profile/${TEST_PROFILE_ID}`,
    fullScroll: true,
  },
  { slug: "profile-edit", path: "/profile/edit" },
  { slug: "settings", path: "/settings" },
  { slug: "settings-notifications", path: "/settings/notifications" },
  { slug: "settings-phone", path: "/settings/phone" },
  { slug: "trips", path: "/trips" },
  {
    slug: `trips-${TEST_BOOKING_ID.slice(0, 8)}`,
    path: `/trips/${TEST_BOOKING_ID}`,
    skipForTrust: ["0deg", "4deg"],
  },
  { slug: "vouch", path: "/vouch" },
  { slug: "wishlists", path: "/wishlists" },
  {
    slug: `wishlists-${TEST_WISHLIST_ID.slice(0, 8)}`,
    path: `/wishlists/${TEST_WISHLIST_ID}`,
    skipForTrust: ["0deg", "4deg"],
  },
];

// ---------- HELPERS ----------
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function capturePage(
  page: Page,
  outDir: string,
  route: RouteSpec,
) {
  const url = new URL(route.path, TARGET_URL).toString();
  console.log(`    → ${url}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000); // settle animations

  // Viewport-sized screenshot
  await page.screenshot({
    path: path.join(outDir, `${route.slug}.png`),
    fullPage: false,
  });

  if (route.fullScroll) {
    await page.screenshot({
      path: path.join(outDir, `${route.slug}-full.png`),
      fullPage: true,
    });
  }

  // Closed variant of any modal is already captured above.
  // For the "open" variant, try clicking the named action.
  if (route.openVariant) {
    try {
      const button = page.getByRole("button", { name: route.openVariant.actionLabel });
      if (await button.isVisible({ timeout: 2000 })) {
        await button.click();
        await page.waitForTimeout(600);
        await page.screenshot({
          path: path.join(outDir, `${route.slug}-open.png`),
          fullPage: false,
        });
      }
    } catch {
      // Open variant not reachable at this trust level — skip silently.
    }
  }
}

async function captureForTrust(
  browser: Browser,
  trust: typeof TRUST_LEVELS[number],
) {
  let storageExists = true;
  try {
    await fs.access(trust.storageState);
  } catch {
    storageExists = false;
  }

  if (!storageExists && trust.name !== "0deg") {
    console.warn(
      `  [!] ${trust.name} storage state missing at ${trust.storageState} — skipping`,
    );
    return;
  }

  for (const viewport of VIEWPORTS) {
    const outDir = path.join(SCREENSHOT_DIR, trust.name, viewport.name);
    await ensureDir(outDir);

    console.log(`  [${trust.name}] ${viewport.name} ${viewport.width}×${viewport.height}`);

    const context: BrowserContext = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      storageState: storageExists ? trust.storageState : undefined,
      colorScheme: "light",
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      if (route.skipForTrust?.includes(trust.name as any)) continue;
      try {
        await capturePage(page, outDir, route);
      } catch (err) {
        console.error(`    ✗ ${route.path} failed:`, (err as Error).message);
      }
    }

    await context.close();
  }
}

async function captureSignedOut(browser: Browser) {
  for (const viewport of VIEWPORTS) {
    const outDir = path.join(SCREENSHOT_DIR, "signed-out", viewport.name);
    await ensureDir(outDir);

    console.log(`  [signed-out] ${viewport.name} ${viewport.width}×${viewport.height}`);

    const context: BrowserContext = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: "light",
    });
    const page = await context.newPage();

    // Only routes that render something meaningful signed-out:
    const signedOutRoutes: RouteSpec[] = [
      { slug: "root", path: "/" },
      { slug: "sign-in", path: "/sign-in" },
      { slug: "sign-up", path: "/sign-up" },
      { slug: "browse", path: "/browse", fullScroll: true },
      { slug: "help", path: "/help", fullScroll: true },
      {
        slug: `listings-${TEST_LISTING_ID.slice(0, 8)}`,
        path: `/listings/${TEST_LISTING_ID}`,
        fullScroll: true,
      },
      {
        slug: `profile-${TEST_PROFILE_ID.slice(0, 8)}`,
        path: `/profile/${TEST_PROFILE_ID}`,
        fullScroll: true,
      },
    ];

    for (const route of signedOutRoutes) {
      try {
        await capturePage(page, outDir, route);
      } catch (err) {
        console.error(`    ✗ ${route.path} failed:`, (err as Error).message);
      }
    }

    await context.close();
  }
}

// ---------- MAIN ----------
(async () => {
  console.log("🎬 1DB UX Audit — screenshot capture");
  console.log(`   target: ${TARGET_URL}`);
  console.log(`   output: ${SCREENSHOT_DIR}`);
  console.log();

  if (
    TEST_LISTING_ID.startsWith("REPLACE_") ||
    TEST_PROFILE_ID.startsWith("REPLACE_") ||
    TEST_BOOKING_ID.startsWith("REPLACE_") ||
    TEST_THREAD_ID.startsWith("REPLACE_") ||
    TEST_WISHLIST_ID.startsWith("REPLACE_") ||
    TEST_HOSTED_LISTING_ID.startsWith("REPLACE_")
  ) {
    console.error(
      "✗ One or more TEST_* IDs is still a placeholder. Either set env vars or edit capture.ts before running.",
    );
    console.error("  Required: AUDIT_TEST_LISTING_ID, AUDIT_TEST_PROFILE_ID, AUDIT_TEST_BOOKING_ID,");
    console.error("            AUDIT_TEST_THREAD_ID, AUDIT_TEST_WISHLIST_ID, AUDIT_TEST_HOSTED_LISTING_ID");
    process.exit(1);
  }

  await ensureDir(SCREENSHOT_DIR);
  const browser = await chromium.launch();

  try {
    await captureSignedOut(browser);
    for (const trust of TRUST_LEVELS) {
      await captureForTrust(browser, trust);
    }
  } finally {
    await browser.close();
  }

  console.log();
  console.log("✓ Screenshot capture complete.");
  console.log(`  See: ${SCREENSHOT_DIR}`);
})();

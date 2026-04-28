/**
 * audit/capture.mjs — Playwright screenshot capture for UX Map Phase A.
 *
 * Produces deterministic screenshots of every user-facing route across three
 * trust levels (0°, 1°, 4°) and two viewports (desktop 1440×900, mobile 375×812).
 *
 * Written as .mjs (not .ts) so it stays outside the Next.js tsconfig's type-check
 * scope — @playwright/test is a dev-only dep and shouldn't break `tsc` when it's
 * not installed. Install the dep explicitly before running:
 *
 *   npm install --save-dev @playwright/test
 *   npx playwright install chromium
 *
 * OUTPUT STRUCTURE:
 *   audit/screenshots/{trust-level}/{viewport}/{route-slug}.png
 *   audit/screenshots/{trust-level}/{viewport}/{route-slug}-full.png  (long-scroll)
 *   audit/screenshots/{trust-level}/{viewport}/{route-slug}-open.png  (modal/expanded)
 *
 * AUTH SETUP (one-time per trust account):
 *   Sign in manually once via Playwright codegen and save the storage state:
 *     npx playwright codegen $AUDIT_TARGET_URL --save-storage audit/.auth/0deg.json
 *   Repeat for 1deg.json and 4deg.json.
 *
 *   Known accounts for Trustead:
 *     - 0deg: audit-0deg-<timestamp> — create fresh via Clerk test phone
 *     - 1deg: Loren's primary (most vouches; high connectivity)
 *     - 4deg: Pavel or Ines (chain-only distance from test targets)
 *
 * RUN:
 *   AUDIT_TARGET_URL=https://alpha-c.onedegreebnb.com \
 *   AUDIT_TEST_LISTING_ID=<uuid> \
 *   AUDIT_TEST_PROFILE_ID=<uuid> \
 *   AUDIT_TEST_BOOKING_ID=<uuid> \
 *   AUDIT_TEST_THREAD_ID=<uuid> \
 *   AUDIT_TEST_WISHLIST_ID=<uuid> \
 *   AUDIT_TEST_HOSTED_LISTING_ID=<uuid> \
 *   node audit/capture.mjs
 *
 * DETERMINISM:
 *   One fixed listing ID for /listings/[id] so screenshots compare cleanly across
 *   runs. Use the first active seed listing from Loren's account.
 */

import { chromium } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- CONFIG ----------
const TARGET_URL = process.env.AUDIT_TARGET_URL || "https://alpha-c.onedegreebnb.com";
const AUTH_DIR = path.join(__dirname, ".auth");
const SCREENSHOT_DIR = path.join(__dirname, "screenshots");

const TEST_LISTING_ID = process.env.AUDIT_TEST_LISTING_ID || "REPLACE_WITH_SEED_LISTING_ID";
const TEST_THREAD_ID = process.env.AUDIT_TEST_THREAD_ID || "REPLACE_WITH_SEED_THREAD_ID";
const TEST_BOOKING_ID = process.env.AUDIT_TEST_BOOKING_ID || "REPLACE_WITH_SEED_BOOKING_ID";
const TEST_WISHLIST_ID = process.env.AUDIT_TEST_WISHLIST_ID || "REPLACE_WITH_SEED_WISHLIST_ID";
const TEST_HOSTED_LISTING_ID = process.env.AUDIT_TEST_HOSTED_LISTING_ID || "REPLACE_WITH_HOSTED_LISTING_ID";
const TEST_PROFILE_ID = process.env.AUDIT_TEST_PROFILE_ID || "REPLACE_WITH_DISTANT_USER_ID";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

const TRUST_LEVELS = [
  { name: "0deg", storageState: path.join(AUTH_DIR, "0deg.json") },
  { name: "1deg", storageState: path.join(AUTH_DIR, "1deg.json") },
  { name: "4deg", storageState: path.join(AUTH_DIR, "4deg.json") },
];

const ROUTES = [
  { slug: "root", path: "/" },
  { slug: "sign-in", path: "/sign-in", skipForTrust: ["0deg", "1deg", "4deg"] },
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
  { slug: "inbox-thread", path: `/inbox/${TEST_THREAD_ID}`, skipForTrust: ["0deg", "4deg"] },
  { slug: "invite", path: "/invite" },
  {
    slug: `listings-${TEST_LISTING_ID.slice(0, 8)}`,
    path: `/listings/${TEST_LISTING_ID}`,
    fullScroll: true,
    openVariant: { actionLabel: "Request Intro", description: "Capture dialog-open state" },
  },
  {
    slug: `listings-${TEST_LISTING_ID.slice(0, 8)}-reserve`,
    path: `/listings/${TEST_LISTING_ID}/reserve`,
    skipForTrust: ["0deg", "4deg"],
  },
  { slug: `profile-${TEST_PROFILE_ID.slice(0, 8)}`, path: `/profile/${TEST_PROFILE_ID}`, fullScroll: true },
  { slug: "profile-edit", path: "/profile/edit" },
  { slug: "settings", path: "/settings" },
  { slug: "settings-notifications", path: "/settings/notifications" },
  { slug: "settings-phone", path: "/settings/phone" },
  { slug: "trips", path: "/trips" },
  { slug: `trips-${TEST_BOOKING_ID.slice(0, 8)}`, path: `/trips/${TEST_BOOKING_ID}`, skipForTrust: ["0deg", "4deg"] },
  { slug: "vouch", path: "/vouch" },
  { slug: "wishlists", path: "/wishlists" },
  {
    slug: `wishlists-${TEST_WISHLIST_ID.slice(0, 8)}`,
    path: `/wishlists/${TEST_WISHLIST_ID}`,
    skipForTrust: ["0deg", "4deg"],
  },
];

// ---------- HELPERS ----------
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function capturePage(page, outDir, route) {
  const url = new URL(route.path, TARGET_URL).toString();
  console.log(`    → ${url}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);

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
      // Variant unreachable at this trust level — skip silently.
    }
  }
}

async function captureForTrust(browser, trust) {
  let storageExists = true;
  try {
    await fs.access(trust.storageState);
  } catch {
    storageExists = false;
  }

  if (!storageExists) {
    console.warn(`  [!] ${trust.name} storage state missing at ${trust.storageState} — skipping`);
    return;
  }

  for (const viewport of VIEWPORTS) {
    const outDir = path.join(SCREENSHOT_DIR, trust.name, viewport.name);
    await ensureDir(outDir);

    console.log(`  [${trust.name}] ${viewport.name} ${viewport.width}×${viewport.height}`);

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      storageState: trust.storageState,
      colorScheme: "light",
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      if (route.skipForTrust?.includes(trust.name)) continue;
      try {
        await capturePage(page, outDir, route);
      } catch (err) {
        console.error(`    ✗ ${route.path} failed:`, err.message);
      }
    }

    await context.close();
  }
}

async function captureSignedOut(browser) {
  const signedOutRoutes = [
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

  for (const viewport of VIEWPORTS) {
    const outDir = path.join(SCREENSHOT_DIR, "signed-out", viewport.name);
    await ensureDir(outDir);

    console.log(`  [signed-out] ${viewport.name} ${viewport.width}×${viewport.height}`);

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: "light",
    });
    const page = await context.newPage();

    for (const route of signedOutRoutes) {
      try {
        await capturePage(page, outDir, route);
      } catch (err) {
        console.error(`    ✗ ${route.path} failed:`, err.message);
      }
    }

    await context.close();
  }
}

// ---------- MAIN ----------
(async () => {
  console.log("🎬 Trustead UX Audit — screenshot capture");
  console.log(`   target: ${TARGET_URL}`);
  console.log(`   output: ${SCREENSHOT_DIR}`);
  console.log();

  const placeholders = [
    TEST_LISTING_ID,
    TEST_PROFILE_ID,
    TEST_BOOKING_ID,
    TEST_THREAD_ID,
    TEST_WISHLIST_ID,
    TEST_HOSTED_LISTING_ID,
  ];
  if (placeholders.some((id) => id.startsWith("REPLACE_"))) {
    console.error("✗ One or more TEST_* IDs is still a placeholder.");
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

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Signed-out users hit `/sign-in` for everything except shareable deep links
// (specific listing/profile pages, help docs, join invites) and webhook/cron
// endpoints. `/` and `/browse` are now private so the landing experience is
// always the sign-in screen.
const isPublicRoute = createRouteMatcher([
  "/listing/(.*)",
  "/listings/(.*)",
  "/help(.*)",
  "/profile/(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/geocode(.*)",
  "/api/cron/(.*)",
  "/api/support(.*)",
  "/join/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

/**
 * Add no-store cache headers to every SSR'd HTML response.
 *
 * Cloudflare Pages' `_headers` file doesn't apply to dynamic routes
 * served by Next.js Functions, so iOS Safari was defaulting to its
 * own aggressive heuristic cache and serving stale browse pages after
 * deploys. We set Cache-Control + legacy Pragma/Expires headers
 * directly on the middleware response so every SSR page, regardless
 * of route, round-trips to the edge on every visit.
 *
 * Static bundles under /_next/static/ keep their long-lived
 * immutable cache — the middleware matcher excludes them.
 */
function addNoStoreHeaders(res: NextResponse): NextResponse {
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

// Wrap Clerk middleware to handle missing env vars gracefully
// (Cloudflare Pages edge runtime may not have secrets available)
export default function middleware(request: NextRequest) {
  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return addNoStoreHeaders(NextResponse.next());
  }

  return clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
    return addNoStoreHeaders(NextResponse.next());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })(request, {} as any);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

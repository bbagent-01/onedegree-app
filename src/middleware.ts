import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/browse(.*)",
  "/listing/(.*)",
  "/listings/(.*)",
  "/listings/(.*)",
  "/help(.*)",
  "/profile",
  "/profile/(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/geocode(.*)",
  "/api/cron/(.*)",
  "/api/health",
  "/api/support(.*)",
  "/join/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/terms",
  "/privacy",
  "/legal-status",
]);

// ── ALPHA-ONLY (CC-Dev1 Impersonation Switcher) ─────────────────
// Middleware-level cookie revalidation. The impersonation cookie
// alone is not trusted — we re-check the env gates and admin
// allowlist on every request. If the cookie is present but any gate
// now fails (env flipped, user removed from allowlist, secrets
// unset), we strip the cookie so downstream server code reads a
// clean session. Inlined here to keep middleware edge-compatible and
// avoid importing the session module (which pulls in supabase-admin).
// Remove the whole block before beta along with the env vars.
const IMPERSONATION_COOKIE = "imp_user_id";

function impersonationEnabled(): boolean {
  // Intentionally mirrors `isImpersonationEnabled()` in
  // src/lib/impersonation/session.ts. Kept NODE_ENV-free because
  // Cloudflare Pages runs as production at runtime — the real
  // prod/alpha split is the env var being set vs. unset.
  return process.env.NEXT_PUBLIC_ENABLE_IMPERSONATION === "true";
}

function isAdminId(id: string | null | undefined): boolean {
  if (!id) return false;
  const raw = process.env.IMPERSONATION_ADMIN_USER_IDS ?? "";
  if (!raw) return false;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(id);
}

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
    let userId: string | null = null;
    if (!isPublicRoute(req)) {
      // Unauthenticated viewers get redirected to /sign-in with the
      // original URL stashed in `redirect_url` so they land back
      // where they started after auth. Default auth.protect() 404s
      // in production, which hides the sign-in option entirely.
      const { userId: resolvedUserId, redirectToSignIn } = await auth();
      if (!resolvedUserId) {
        return redirectToSignIn({ returnBackUrl: req.url });
      }
      userId = resolvedUserId;
    } else {
      const a = await auth();
      userId = a.userId;
    }

    const res = addNoStoreHeaders(NextResponse.next());

    // ALPHA ONLY: if an impersonation cookie is present but any gate
    // now fails, strip it. Never trust the cookie alone — the
    // session helper re-validates too, but stripping here means a
    // stale cookie can't even reach server components.
    const hasCookie = req.cookies.get(IMPERSONATION_COOKIE);
    if (hasCookie && !(impersonationEnabled() && isAdminId(userId))) {
      res.cookies.delete(IMPERSONATION_COOKIE);
    }

    return res;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })(request, {} as any);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

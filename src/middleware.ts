import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/explore(.*)",
  "/browse(.*)",
  "/listing/(.*)",
  "/listings/(.*)",
  "/listings/(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/geocode(.*)",
  "/join/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

// Wrap Clerk middleware to handle missing env vars gracefully
// (Cloudflare Pages edge runtime may not have secrets available)
export default function middleware(request: NextRequest) {
  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return NextResponse.next();
  }

  return clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })(request, {} as any);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

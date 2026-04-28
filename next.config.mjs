/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Cloudflare Pages
  output: "standalone",
  images: {
    remotePatterns: [
      { hostname: "placehold.co" },
      { hostname: "*.supabase.co" },
    ],
  },
  async redirects() {
    return [
      // /reserve is dead (Alpha-C S1 — thread-native flow now starts
      // on the listing detail page). Permanent redirect so stale
      // bookmarks / cached URLs land users somewhere useful.
      {
        source: "/listings/:id/reserve",
        destination: "/listings/:id",
        permanent: true,
      },
      // Stale URLs surfaced during S10.5 retest.
      { source: "/messages", destination: "/inbox", permanent: true },
      { source: "/messages/:path*", destination: "/inbox", permanent: true },
      { source: "/hosting/listings", destination: "/hosting", permanent: true },
    ];
  },
};

export default nextConfig;

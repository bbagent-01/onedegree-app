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
};

export default nextConfig;

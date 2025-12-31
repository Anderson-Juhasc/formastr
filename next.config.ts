import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Use unoptimized images to avoid Vercel's image optimization quota
    // (1,000 source images/month on free tier)
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  transpilePackages: ["@snort/system", "@snort/shared"],
  // Optimize for Vercel free tier
  experimental: {
    // Reduce memory usage during builds
    webpackMemoryOptimizations: true,
  },
  // Add caching headers for static assets
  headers: async () => [
    {
      source: "/:all*(svg|jpg|jpeg|png|gif|webp|avif|ico)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/:all*(js|css)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],
};

export default nextConfig;

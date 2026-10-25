import type { NextConfig } from "next";

// Every external host the browser talks to must be listed here — v1 forgot
// Blob and Google avatars, and photo uploads silently failed for months.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.public.blob.vercel-storage.com",
  "font-src 'self'",
  "connect-src 'self' https://vercel.com https://*.blob.vercel-storage.com",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // dev needs eval for React refresh
          {
            key: "Content-Security-Policy",
            value: process.env.NODE_ENV === "development" ? csp.replace("'unsafe-inline'", "'unsafe-inline' 'unsafe-eval'") : csp,
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // camera allowed for photo capture
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;

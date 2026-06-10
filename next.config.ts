import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

// Bind next-intl plugin to our custom request configuration
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Enforce strict mode for React 19 concurrent features
  reactStrictMode: true,

  // Security & fingerprinting mitigation
  poweredByHeader: false,

  // Allow LAN access for dev server
  allowedDevOrigins: ["172.16.56.238", "localhost", "192.168.1.3", "172.16.57.49"],

  // Enable build-time payload compression
  compress: true,

  // Production optimizations
  compiler: {
    // Strip console logs in production (preserves console.error for monitoring)
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  // Turbopack / Next 16 experimental module optimizations to minimize bundle size
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "framer-motion",
      "@hookform/resolvers",
    ],
  },
};

export default withNextIntl(withSerwist(nextConfig));

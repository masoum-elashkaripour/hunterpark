import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The GSAP/DOM scripts initialise once per page load; Strict Mode's double
  // effect run in development would start the preloader and timers twice.
  reactStrictMode: false,
  // Let the Levion workspace proxy (any port / branch subdomain) reach the dev server.
  allowedDevOrigins: ["*.workspace.levion.io"],
  // The dev badge sits over the hero's bottom-left corner; keep the dev view true to production.
  devIndicators: false,
  images: {
    formats: ["image/webp"],
    qualities: [70, 72, 75],
  },
};

export default nextConfig;

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
    // 70–75: the homepage. 90: the /work, /about and /contact photographs.
    qualities: [70, 72, 75, 90],
  },
  experimental: {
    // Two root layouts — (home) and (site) — so there is no single layout to
    // build a 404 from; `app/global-not-found.tsx` serves unmatched URLs.
    globalNotFound: true,
  },

  /**
   * Cache headers for the /work, /about and /contact pages, carried over from
   * their own repo. The homepage's routes and shared folders (/fonts, /brand,
   * /media) are deliberately left as they were.
   */
  async headers() {
    if (process.env.NODE_ENV !== "production") {
      return [
        {
          source: "/:path*",
          headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
        },
      ];
    }

    const forever = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];

    return [
      ...["/about", "/contact", "/work", "/work/:slug*"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      })),

      { source: "/video/:path*", headers: forever },
      { source: "/poster/:path*", headers: forever },
      { source: "/talent/:path*", headers: forever },
      { source: "/portraits/:path*", headers: forever },
      { source: "/capabilities/:path*", headers: forever },
    ];
  },
};

export default nextConfig;

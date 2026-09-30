import type { NextConfig } from "next";

/**
 * Every image and clip the page renders now lives in `public/`, so there is no
 * remote host to allow and no CORS proxy to maintain. The WordPress thumbnail
 * URLs kept in `lib/works.ts` are reference data only.
 */
const nextConfig: NextConfig = {
  // The workspace is reached through a proxy host; without this, cross-origin
  // dev requests and HMR are blocked and the page never hydrates.
  allowedDevOrigins: ["*.workspace.levion.io"],

  /**
   * `q` is an allowlist, not a free number — the default permits 75 alone and
   * anything else is a 400 from the optimiser. 90 is added so the stills can be
   * served at near-source quality: the posters are frames lifted out of the
   * clips themselves, so a heavy re-encode on top of the video's own
   * compression is where the softness was coming from.
   */
  images: { qualities: [75, 90] },

  /**
   * Nothing here may be cached by the proxy in front of this workspace.
   *
   * Next marks a prerendered page `Cache-Control: s-maxage=31536000`, which is
   * correct on a platform where a deploy invalidates the edge — and wrong
   * through `*.workspace.levion.io`, which simply keeps it. The cost was hours
   * of chasing bugs that had already been fixed: the browser was several
   * builds behind and neither of us could tell.
   *
   * Drop this when the site ships somewhere that invalidates its own cache.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;

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
    /**
     * IN DEVELOPMENT, NOTHING IS CACHED. Not even the assets.
     *
     * The long-lived rules below are a production optimisation and they are
     * actively harmful while the code is being edited: narrowing the blanket
     * `no-store` to documents alone left `/_next/static` cacheable, the browser
     * kept chunks from an earlier edit, and the result was a page whose SERVER
     * html was the new component tree and whose CLIENT bundle was the old one.
     * React reported it as a hydration mismatch and regenerated the tree, which
     * on `/work` took the carousel's imperative setup with it — the page simply
     * stopped advancing.
     *
     * That is the exact failure the broad rule was written for, and Next warns
     * about it in as many words if you put a header on `/_next/static` at all.
     * So in dev there are no clever rules: one `no-store` over everything, the
     * way it was before any of this.
     */
    if (process.env.NODE_ENV !== "production") {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Cache-Control", value: "no-store, must-revalidate" },
          ],
        },
      ];
    }

    /**
     * Immutable by nature: a font, or a video file that is replaced by editing
     * the repository rather than by a deploy overwriting it in place. None of
     * these can go stale behind the proxy, because changing one changes its
     * filename.
     *
     * Measured before this existed: on `/about` the browser could not keep a
     * single byte of video, so one 3.9MB clip was fetched three times in one
     * page load as the player asked for successive ranges.
     *
     * `/_next/static` is deliberately absent — Next already serves its own
     * content-hashed chunks `immutable`, and putting a header there is what
     * broke dev.
     */
    const forever = [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ];

    return [
      /**
       * The documents are listed rather than matched by a wildcard, so nothing
       * here can reach `/_next`. Next marks a prerendered page
       * `s-maxage=31536000`, which is right where a deploy invalidates the edge
       * and wrong through `*.workspace.levion.io`, which simply keeps it.
       *
       * Ordering matters for what follows: Next applies every entry whose
       * `source` matches and, for one header key, the LAST match wins. These go
       * first so the asset rules can beat them where they overlap.
       */
      ...["/", "/about", "/work", "/work/:slug*"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      })),

      { source: "/video/:path*", headers: forever },
      { source: "/poster/:path*", headers: forever },
      { source: "/talent/:path*", headers: forever },
      { source: "/portraits/:path*", headers: forever },
      { source: "/capabilities/:path*", headers: forever },
      { source: "/fonts/:path*", headers: forever },
      { source: "/brand/:path*", headers: forever },
    ];
  },
};

export default nextConfig;

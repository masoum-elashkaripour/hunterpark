"use client";

import { useEffect } from "react";

let started = false;

/**
 * Boots the page's GSAP/DOM scripts once React has hydrated the whole document.
 * Rendered last in <body> so its effect runs after every section is in place.
 * The scripts are imported here, not at module scope, because they touch
 * `window` (Lenis, matchMedia) and must never run during server rendering.
 */
export default function SiteScripts() {
  useEffect(() => {
    if (started) return;
    started = true;
    import("../scripts/site").then(({ startSite }) => startSite());
  }, []);

  return null;
}

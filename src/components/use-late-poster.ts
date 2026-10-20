"use client";

import { useEffect, useState } from "react";

/**
 * A poster for a film far down the page, held back from the first load ON A PHONE.
 *
 * A `<video poster>` written into the page's markup is fetched with the page, at full size —
 * on /about that was the staircase's and the closing card's stills, a quarter of a megabyte
 * apiece, competing with the hero's own film for a phone's connection while nothing of them
 * was on screen. So the attribute is set only once the page has loaded and the browser is
 * idle (on a larger screen, as soon as the page is up — they are the same pictures).
 */
export function useLatePoster(src: string | undefined): string | undefined {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const go = () => !cancelled && setReady(true);
    if (!window.matchMedia("(max-width: 767px)").matches) {
      const t = window.setTimeout(go, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(t);
      };
    }
    let t = 0;
    const later = () => {
      const idle = window.requestIdleCallback;
      if (typeof idle === "function") idle(go, { timeout: 2500 });
      else t = window.setTimeout(go, 1200);
    };
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener("load", later);
    };
  }, [src]);
  return ready ? src : undefined;
}

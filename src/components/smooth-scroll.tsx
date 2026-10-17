"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/** The page's Lenis, while it has one — for code that must MOVE the page (see
    `carryTo` in use-beat.ts): a plain `window.scrollTo` is overruled by Lenis on
    its next frame, which holds its own idea of where the page is. */
let current: Lenis | null = null;
export const getLenis = () => current;

/**
 * One Lenis instance for the whole site — the same smoothing the live build
 * runs (its stylesheet carries `.lenis-smooth` and `.lenis-stopped`).
 *
 * Lenis drives the REAL scroll position rather than transforming a wrapper,
 * which matters here: everything on these pages is read off `window.scrollY`,
 * and the hero pins with `position: sticky`. A transform-based smooth-scroll
 * library would break both.
 *
 * Disabled outright for reduced motion — easing someone's scroll for them is
 * exactly the kind of motion that setting is asking us not to do.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* `lerp: 0.1, wheelMultiplier: 1` — the source repo's own two options and
       nothing else (`src/scripts/smooth-scroll.ts`). Crisper than the heavily
       damped settings that were here: the reference does not slow the wheel
       down, it just takes the stepping out of it. `duration` and `easing` only
       apply to programmatic `scrollTo`, so they were never doing anything for
       a reader turning a wheel. */
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    current = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      if (current === lenis) current = null;
      lenis.destroy();
    };
  }, []);

  return null;
}

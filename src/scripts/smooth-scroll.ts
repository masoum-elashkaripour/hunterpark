import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "./lifecycle";

gsap.registerPlugin(ScrollTrigger);

/**
 * One Lenis instance for the whole site, driven by GSAP's ticker so
 * ScrollTrigger and smooth scroll stay in lockstep. Disabled for reduced motion.
 */
export const lenis: Lenis | null = prefersReducedMotion()
  ? null
  : new Lenis({ lerp: 0.1, wheelMultiplier: 1 });

if (lenis) {
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function lockScroll(): void {
  lenis?.stop();
  document.documentElement.style.overflow = "hidden";
}

export function unlockScroll(): void {
  document.documentElement.style.overflow = "";
  lenis?.start();
}

type ScrollListener = (y: number, direction: 1 | -1 | 0) => void;

/** Scroll position + direction, sourced from Lenis when active, native scroll otherwise. */
export function onScroll(listener: ScrollListener): void {
  if (lenis) {
    lenis.on("scroll", (l: Lenis) => listener(l.scroll, l.direction as 1 | -1 | 0));
    return;
  }
  let last = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      listener(y, y > last ? 1 : y < last ? -1 : 0);
      last = y;
    },
    { passive: true },
  );
}

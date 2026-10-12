import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { onSiteReady } from "./lifecycle";
import { initFilm } from "./film";

gsap.registerPlugin(ScrollTrigger);

/**
 * Registers every scroll-driven scene, in page order. Chapters 01–02 play as one
 * pinned film (film.ts); later beats (The Network, Trusted By, Chapter 03…) go here.
 *
 * Scenes only run with motion allowed. While they're active, <html> carries
 * `.hp-motion`, which switches the sections from their plain flowing layout
 * into staged, pinnable compositions. Under prefers-reduced-motion that class
 * never appears, so everything simply reads top to bottom.
 */
const scenes: Array<() => void> = [initFilm];

export function initScrollScenes(): void {
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    document.documentElement.classList.add("hp-motion");
    scenes.forEach((scene) => scene());
    return () => document.documentElement.classList.remove("hp-motion");
  });

  // Pins measure the page; re-measure once fonts and the preloader hand-off have settled.
  // A refresh re-measures every pin in the film — a few hundred ms on a phone — so the two
  // requests share one frame when they land together, and fonts that had already loaded
  // before the scenes were measured ask for nothing.
  let queued = 0;
  const refreshSoon = () => {
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      ScrollTrigger.refresh();
    });
  };
  if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(refreshSoon);
  onSiteReady(refreshSoon);
}

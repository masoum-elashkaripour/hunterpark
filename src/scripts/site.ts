import { runPreloader } from "./preloader";
import { initHeader } from "./header";
import { initHero } from "./hero";
import { createTilt } from "./tilt";
import { initHeroParallax } from "./hero-parallax";
import { initScrollScenes } from "./scroll-scenes";
import { initChapterIndicator } from "./chapter-indicator";
import { initCapabilities } from "./capabilities";
import { initSoundtrack } from "./soundtrack";

/**
 * Starts every page script, in the order the sections depend on each other:
 * the preloader borrows the hero's first background, then hands off to the
 * header and hero intros via lifecycle.onSiteReady().
 */
export function startSite(): void {
  // React doesn't write the `muted` attribute into server HTML, and browsers only
  // autoplay muted video — set it on the elements before anything calls play().
  document.querySelectorAll<HTMLVideoElement>("video[data-hero-bg]").forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
  });

  runPreloader();
  initHeader();
  initHero();

  // Mouse-driven depth on the title (desktop pointers only; off for reduced motion).
  const title = document.querySelector<HTMLElement>("[data-hero-tilt]");
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (title && hero) createTilt(title, { area: hero });
  initHeroParallax();
  initScrollScenes(); // the chapters as one scroll-driven film
  initChapterIndicator();
  initCapabilities(); // titles: jump to a capability (motion) / switch media directly (static)
  initSoundtrack(); // the ambient soundtrack: one engine for the whole visit + the header toggle
}

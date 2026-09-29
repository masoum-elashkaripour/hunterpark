import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { onSiteReady, prefersReducedMotion } from "./lifecycle";

gsap.registerPlugin(ScrollTrigger);

function track(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-chapter-track]");
}

function rows(el: HTMLElement): number {
  return el.children.length || 1;
}

/**
 * A tween that rolls the indicator to chapter `index` (0-based) — nest it in any
 * scrubbed timeline at the moment the story crosses into that chapter.
 */
export function chapterIndicatorTo(index: number, duration = 0.1): gsap.core.Tween | gsap.core.Timeline {
  const el = track();
  if (!el) return gsap.timeline();
  return gsap.to(el, { yPercent: (-100 * index) / rows(el), duration, ease: "power2.inOut" });
}

/** Fades the indicator in after the preloader. Without motion, chapters switch at section edges. */
export function initChapterIndicator(): void {
  const root = document.querySelector<HTMLElement>("[data-chapter-index]");
  const el = track();
  if (!root || !el) return;

  onSiteReady(() => gsap.to(root, { autoAlpha: 1, duration: prefersReducedMotion() ? 0 : 1.2, delay: prefersReducedMotion() ? 0 : 0.8 }));

  if (!prefersReducedMotion()) return; // the film timeline drives it

  // Reduced motion: an instant switch as each chapter's section reaches mid-screen.
  document.querySelectorAll<HTMLElement>("[data-chapter-section]").forEach((section) => {
    const index = Number(section.dataset.chapterSection);
    ScrollTrigger.create({
      trigger: section,
      start: "top 50%",
      end: "bottom 50%",
      onToggle: (self) => self.isActive && gsap.set(el, { yPercent: (-100 * index) / rows(el) }),
    });
  });
}

import { gsap } from "gsap";
import { prefersReducedMotion } from "./lifecycle";

/**
 * Pointer parallax for the hero background: the photography slides a few px
 * against the pointer (the title leans toward it), giving the frame depth.
 * Writes two CSS variables on the backdrop; each slide's `transform` reads them.
 */
const RANGE_X = 14; // px at the hero's edges
const RANGE_Y = 10;

export function initHeroParallax(): void {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  const backdrop = hero?.querySelector<HTMLElement>(".hero__backdrop");
  if (!hero || !backdrop || prefersReducedMotion() || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const offset = { x: 0, y: 0 };
  const write = () => {
    backdrop.style.setProperty("--hero-px", `${offset.x.toFixed(2)}px`);
    backdrop.style.setProperty("--hero-py", `${offset.y.toFixed(2)}px`);
  };
  const toX = gsap.quickTo(offset, "x", { duration: 1.4, ease: "power3.out", onUpdate: write });
  const toY = gsap.quickTo(offset, "y", { duration: 1.4, ease: "power3.out", onUpdate: write });

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      const rect = hero.getBoundingClientRect();
      if (event.clientY < rect.top || event.clientY > rect.bottom) return;
      const nx = gsap.utils.clamp(-1, 1, (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2));
      const ny = gsap.utils.clamp(-1, 1, (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2));
      toX(-nx * RANGE_X);
      toY(-ny * RANGE_Y);
    },
    { passive: true },
  );
  document.documentElement.addEventListener("pointerleave", () => {
    toX(0);
    toY(0);
  });
}

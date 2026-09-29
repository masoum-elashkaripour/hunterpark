import { gsap } from "gsap";
import { onSiteReady, prefersReducedMotion } from "./lifecycle";


export function initHeader(): void {
  const header = document.querySelector<HTMLElement>("[data-header]");
  const menu = document.querySelector<HTMLElement>("[data-menu]");
  const toggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  if (!header || !menu || !toggle) return;

  const reduced = prefersReducedMotion();
  const logo = header.querySelector<HTMLElement>("[data-header-logo]")!;
  const srLabel = toggle.querySelector<HTMLElement>("[data-menu-toggle-sr]")!;
  const cta = header.querySelector<HTMLElement>("[data-header-cta]");
  const sound = header.querySelector<HTMLElement>("[data-sound-toggle]");

  // --- Intro: runs the moment the preloader hands off ---------------------
  onSiteReady(() => {
    if (reduced) {
      gsap.set([logo, toggle, cta, sound], { opacity: 1 });
      return;
    }
    // When the preloader played, its wordmark has already flown into this slot.
    const logoLanded = "logoLanded" in document.documentElement.dataset;
    const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
    if (logoLanded) intro.set(logo, { opacity: 1 }, 0);
    else
      intro.fromTo(
        logo,
        { opacity: 1, clipPath: "inset(0% 100% 0% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" },
        0.15,
      );
    // Trigger and CTA drift in from their own edges
    intro
      .fromTo(toggle, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 1 }, 0.5)
      .fromTo([sound, cta], { opacity: 0, x: 12 }, { opacity: 1, x: 0, duration: 1 }, 0.6);
  });

  // The bar itself is static: no scroll states (see header.css).
  let menuOpen = false;

  // --- Expanded menu ---------------------------------------------------------
  // A short list that drops from the trigger. Items don't navigate yet; the
  // page stays live underneath (no scroll lock), so outside clicks just close it.
  const rule = menu.querySelector<HTMLElement>("[data-menu-rule]");
  const items = menu.querySelectorAll<HTMLElement>("[data-menu-item]");
  const social = menu.querySelectorAll<HTMLElement>("[data-menu-social]");
  let timeline: gsap.core.Timeline | null = null;

  const setOpenState = (open: boolean) => {
    menuOpen = open;
    toggle.setAttribute("aria-expanded", String(open));
    srLabel.textContent = open ? "Close menu" : "Open menu";
    menu.inert = !open;
  };

  function openMenu() {
    setOpenState(true);
    timeline?.kill();
    if (reduced) {
      gsap.set(menu, { visibility: "visible" });
      gsap.set(rule, { scaleY: 1 });
      gsap.set([...items, ...social], { opacity: 1, y: 0 });
      return;
    }
    timeline = gsap
      .timeline({ defaults: { ease: "expo.out" } })
      .set(menu, { visibility: "visible" })
      .fromTo(rule, { scaleY: 0 }, { scaleY: 1, duration: 0.7, ease: "expo.inOut" }, 0)
      .fromTo(items, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.12)
      .fromTo(social, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05 }, 0.38);
  }

  function closeMenu({ restoreFocus = true } = {}) {
    if (!menuOpen) return;
    setOpenState(false);
    if (restoreFocus) toggle!.focus();
    timeline?.kill();
    const done = () => gsap.set(menu, { visibility: "hidden" });
    if (reduced) {
      done();
      return;
    }
    timeline = gsap
      .timeline({ defaults: { ease: "expo.in" }, onComplete: done })
      .to(social, { opacity: 0, y: -6, duration: 0.25, stagger: { each: 0.03, from: "end" } }, 0)
      .to(items, { opacity: 0, y: -8, duration: 0.3, stagger: { each: 0.04, from: "end" } }, 0.05)
      .to(rule, { scaleY: 0, duration: 0.45, ease: "expo.inOut" }, 0.1);
  }

  toggle.addEventListener("click", () => (menuOpen ? closeMenu() : openMenu()));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuOpen) closeMenu();
  });

  // Clicking anywhere outside the trigger and the list folds it away.
  document.addEventListener("pointerdown", (event) => {
    if (!menuOpen) return;
    const target = event.target as Node;
    if (!menu.contains(target) && !toggle.contains(target)) closeMenu({ restoreFocus: false });
  });
}

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
  // A short list off a lime rule. In the hero it drops from the trigger; past the hero it runs
  // sideways from it in one row, social cells included. Either way it has no background and
  // the page stays live and in place underneath. Items are links to the pages; outside clicks close.
  const rule = menu.querySelector<HTMLElement>("[data-menu-rule]");
  const items = menu.querySelectorAll<HTMLElement>("[data-menu-item]");
  const social = menu.querySelectorAll<HTMLElement>("[data-menu-social]");
  let timeline: gsap.core.Timeline | null = null;
  let row = false; // this opening runs sideways (past the hero)

  // The hero keeps the original drop-down; everywhere after it the menu runs sideways in a row.
  // With motion on, the hero is the film's first stretch of scroll; without, its own section.
  const inHero = () => {
    if (document.documentElement.classList.contains("hp-motion")) return window.scrollY < window.innerHeight * 0.35;
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    return !hero || hero.getBoundingClientRect().bottom > window.innerHeight * 0.5;
  };

  const setOpenState = (open: boolean) => {
    menuOpen = open;
    toggle.setAttribute("aria-expanded", String(open));
    srLabel.textContent = open ? "Close menu" : "Open menu";
    menu.inert = !open;
  };

  /** Sets the menu's shape for this opening: the hero's drop-down, or the sideways row. */
  function layOut(sideways: boolean) {
    const bar = header!;
    const panel = menu!;
    const trigger = toggle!;
    row = sideways;
    bar.classList.toggle("is-menu-row", sideways);
    bar.classList.remove("is-menu-below");
    delete document.documentElement.dataset.menuBelow;
    gsap.set([rule, ...items, ...social], { clearProps: "transform" });
    if (!sideways) {
      panel.style.removeProperty("--menu-row-left");
      return;
    }
    // The row starts just past the trigger, on the bar…
    const inner = trigger.parentElement!.getBoundingClientRect();
    panel.style.setProperty("--menu-row-left", `${trigger.getBoundingClientRect().right - inner.left + 8}px`);
    // …unless it would reach the centred logo: then it runs along the line under the bar
    const logoBox = logo.getBoundingClientRect();
    if (panel.getBoundingClientRect().right > logoBox.left - 24) {
      bar.classList.add("is-menu-below");
      document.documentElement.dataset.menuBelow = "";
    }
  }

  function openMenu() {
    setOpenState(true);
    timeline?.kill();
    layOut(!inHero());
    // The rule draws down (hero) or across (past it); the items follow in its direction
    const draw = row ? "scaleX" : "scaleY";
    const shift = row ? "x" : "y";
    if (reduced) {
      gsap.set(menu, { visibility: "visible" });
      gsap.set(rule, { [draw]: 1 });
      gsap.set([...items, ...social], { opacity: 1, x: 0, y: 0 });
      return;
    }
    timeline = gsap
      .timeline({ defaults: { ease: "expo.out" } })
      .set(menu, { visibility: "visible" })
      .fromTo(rule, { [draw]: 0 }, { [draw]: 1, duration: 0.7, ease: "expo.inOut" }, 0)
      .fromTo(items, { opacity: 0, [shift]: row ? -12 : 14 }, { opacity: 1, [shift]: 0, duration: 0.7, stagger: 0.07 }, 0.12)
      .fromTo(social, { opacity: 0, [shift]: row ? -10 : 10 }, { opacity: 1, [shift]: 0, duration: 0.6, stagger: 0.05 }, 0.38);
  }

  function closeMenu({ restoreFocus = true } = {}) {
    if (!menuOpen) return;
    setOpenState(false);
    if (restoreFocus) toggle!.focus();
    timeline?.kill();
    const done = () => {
      gsap.set(menu, { visibility: "hidden" });
      delete document.documentElement.dataset.menuBelow; // the chapter marker returns
    };
    if (reduced) {
      done();
      return;
    }
    // Folds back the way it came: down the rule (hero), or back along it to the trigger
    const draw = row ? "scaleX" : "scaleY";
    const shift = row ? "x" : "y";
    timeline = gsap
      .timeline({ defaults: { ease: "expo.in" }, onComplete: done })
      .to(social, { opacity: 0, [shift]: -6, duration: 0.25, stagger: { each: 0.03, from: "end" } }, 0)
      .to(items, { opacity: 0, [shift]: -8, duration: 0.3, stagger: { each: 0.04, from: "end" } }, 0.05)
      .to(rule, { [draw]: 0, duration: 0.45, ease: "expo.inOut" }, 0.1);
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

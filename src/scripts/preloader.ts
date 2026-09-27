import { gsap } from "gsap";
import { markSiteReady, prefersReducedMotion } from "./lifecycle";
import { lockScroll, unlockScroll } from "./smooth-scroll";
import { borrowHeroImage, returnHeroImage } from "./hero-handoff";

const SESSION_KEY = "hp:preloaded";
const MIN_DURATION = 2.8; // s — time for the collage to build, never longer than needed
const MAX_DURATION = 8; // s — safety cap on slow networks
const HOLD_AT_100 = 0.45; // s — a beat on the finished collage before it opens
const FINAL_AT = 0.97; // progress at which the final (hero) photograph drops

interface Layout {
  count: number; // collage cards (the final hero card is extra)
  cardWidth: number; // vw
  spreadX: number; // fraction of viewport width
  spreadY: number; // fraction of viewport height
  finalWidth: number; // vw — size of the hero card before it opens
}

/** Composition per breakpoint — fewer, larger photographs on small screens. */
function layoutFor(width: number): Layout {
  if (width < 768) return { count: 11, cardWidth: 30, spreadX: 0.36, spreadY: 0.34, finalWidth: 50 };
  if (width < 1100) return { count: 15, cardWidth: 19, spreadX: 0.38, spreadY: 0.34, finalWidth: 34 };
  return { count: 19, cardWidth: 12.5, spreadX: 0.4, spreadY: 0.36, finalWidth: 25 };
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function imageSettled(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
}

/** An image is ready when loaded; a film when its first frame can be drawn. */
function mediaSettled(el: HTMLImageElement | HTMLVideoElement): Promise<void> {
  if (el instanceof HTMLImageElement) return imageSettled(el);
  if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();
  return new Promise((resolve) => {
    el.addEventListener("loadeddata", () => resolve(), { once: true });
    el.addEventListener("error", () => resolve(), { once: true });
    el.querySelector("source:last-child")?.addEventListener("error", () => resolve(), { once: true });
  });
}

export function runPreloader(): void {
  const root = document.querySelector<HTMLElement>("[data-preloader]");
  if (!root || getComputedStyle(root).display === "none") {
    root?.remove();
    markSiteReady();
    return;
  }

  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* storage unavailable — preloader simply plays again next time */
  }

  lockScroll();
  window.scrollTo(0, 0);

  const reduced = prefersReducedMotion();
  const stack = root.querySelector<HTMLElement>("[data-stack]")!;
  const finalFrame = root.querySelector<HTMLElement>("[data-final]")!;
  const shade = root.querySelector<HTMLElement>("[data-shade]")!;
  const logo = root.querySelector<HTMLImageElement>("[data-logo]")!;
  const count = root.querySelector<HTMLElement>("[data-count]")!;
  const template = root.querySelector<HTMLTemplateElement>("[data-cards]")!;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const layout = layoutFor(vw);

  // --- The final card: the hero's own background image, borrowed for the show
  const heroImage = borrowHeroImage();
  if (heroImage) {
    finalFrame.prepend(heroImage);
    // Moving a <video> can pause it — keep the film rolling underneath the collage.
    if (heroImage instanceof HTMLVideoElement && !prefersReducedMotion()) heroImage.play().catch(() => {});
  }

  // --- Build a random collage from the shared collection ---------------------
  const candidates = gsap.utils.shuffle(Array.from(template.content.querySelectorAll<HTMLImageElement>("img")));
  const cards = candidates.slice(0, layout.count).map((source, i) => {
    const card = source.cloneNode(true) as HTMLImageElement; // cloning out of the template starts the fetch
    const ratio = Number(card.dataset.ratio) || 1.5;
    const width = (layout.cardWidth * rand(0.8, 1.25) * vw) / 100;
    const height = width / ratio;
    // Golden-angle scatter: organic, but never clumped or grid-like
    const t = Math.sqrt((i + 0.5) / layout.count);
    const angle = i * 2.39996 + rand(-0.35, 0.35);
    card.style.width = `${width}px`;
    card.style.height = `${height}px`;
    card.style.margin = `${-height / 2}px 0 0 ${-width / 2}px`;
    gsap.set(card, {
      x: Math.cos(angle) * t * layout.spreadX * vw,
      y: Math.sin(angle) * t * layout.spreadY * vh,
      rotation: rand(-14, 14),
    });
    return card;
  });
  // Drop order is shuffled too, so the collage fills in rather than spiralling out.
  const dropOrder = gsap.utils.shuffle([...cards]);
  dropOrder.forEach((card) => stack.append(card));

  // Hero card at rest: a miniature of the viewport, slightly askew, near the centre
  const finalRest = {
    scale: layout.finalWidth / 100,
    x: vw * rand(-0.04, 0.04),
    y: vh * rand(-0.05, 0.03),
    rotation: rand(-5, 5),
  };
  gsap.set(finalFrame, { ...finalRest, opacity: 0 });

  // --- Logo -----------------------------------------------------------------
  if (!reduced) gsap.from(logo, { opacity: 0, scale: 0.94, duration: 1.2, ease: "expo.out", delay: 0.1 });

  // --- Real progress: fonts + every photograph -------------------------------
  const tasks: Promise<unknown>[] = [document.fonts.ready, ...cards.map(imageSettled)];
  if (heroImage) tasks.push(mediaSettled(heroImage));
  // Under reduced motion the film holds on its poster frame.
  if (reduced && heroImage instanceof HTMLVideoElement) heroImage.pause();
  let settled = 0;
  tasks.forEach((task) => task.finally(() => settled++));

  const drop = (el: HTMLElement, rest: { x: number; y: number; rotation: number; scale: number }) => {
    if (reduced) {
      gsap.set(el, { opacity: 1 });
      return;
    }
    gsap.fromTo(
      el,
      {
        opacity: 0,
        scale: rest.scale * 1.18,
        rotation: rest.rotation + rand(-9, 9),
        x: rest.x,
        y: rest.y - rand(18, 40),
      },
      { opacity: 1, ...rest, duration: 0.85, ease: "expo.out" },
    );
  };

  const restOf = (el: HTMLElement) => ({
    x: Number(gsap.getProperty(el, "x")),
    y: Number(gsap.getProperty(el, "y")),
    rotation: Number(gsap.getProperty(el, "rotation")),
    scale: Number(gsap.getProperty(el, "scale")),
  });

  // Each card lands once progress passes its threshold (and its image is ready).
  const thresholds = dropOrder.map((_, i) => ((i + 1) / (dropOrder.length + 1)) * FINAL_AT);
  let nextCard = 0;
  let finalDroppedAt = -1;

  const start = performance.now();
  const state = { shown: 0 };

  const tick = () => {
    const elapsed = (performance.now() - start) / 1000;
    const real = elapsed >= MAX_DURATION ? 1 : settled / tasks.length;
    const pace = Math.min(elapsed / MIN_DURATION, 1);
    const target = Math.min(real, pace);
    state.shown += (target - state.shown) * 0.1;
    if (target === 1 && state.shown > 0.998) state.shown = 1;

    while (nextCard < dropOrder.length && state.shown >= thresholds[nextCard]) {
      const card = dropOrder[nextCard++];
      const rest = restOf(card);
      imageSettled(card).then(() => drop(card, rest));
    }

    if (finalDroppedAt < 0 && state.shown >= FINAL_AT) {
      finalDroppedAt = elapsed;
      drop(finalFrame, finalRest);
    }

    count.textContent = String(Math.round(state.shown * 100)).padStart(2, "0");

    // Hold on the finished collage, and give the final card time to land.
    if (state.shown === 1 && finalDroppedAt >= 0 && elapsed - finalDroppedAt >= Math.max(HOLD_AT_100, 0.8)) {
      gsap.ticker.remove(tick);
      exit();
    }
  };
  gsap.ticker.add(tick);

  // --- Exit: the hero card opens to full bleed, the logo flies into the header
  function handOff() {
    returnHeroImage(); // same element, same position, already decoded — no swap
    document.documentElement.dataset.logoLanded = "";
    root!.remove();
    unlockScroll();
    markSiteReady();
  }

  function exit() {
    const headerLogo = document.querySelector<HTMLElement>("[data-header-logo]");

    if (reduced) {
      // Put the image back first so the hero is already in place under the fade.
      returnHeroImage();
      if (headerLogo) gsap.set(headerLogo, { opacity: 1 });
      document.documentElement.dataset.logoLanded = "";
      gsap.to(root, {
        opacity: 0,
        duration: 0.5,
        ease: "none",
        onComplete: () => {
          root!.remove();
          unlockScroll();
          markSiteReady();
        },
      });
      return;
    }

    // FLIP the wordmark onto the header logo's slot (top-centre).
    const from = logo.getBoundingClientRect();
    const to = headerLogo?.getBoundingClientRect();
    const logoTarget = to
      ? {
          x: to.left + to.width / 2 - (from.left + from.width / 2),
          y: to.top + to.height / 2 - (from.top + from.height / 2),
          scale: to.width / from.width,
        }
      : { opacity: 0 };

    gsap
      .timeline({ defaults: { ease: "expo.inOut" }, onComplete: handOff })
      .to(count.parentElement, { yPercent: 40, opacity: 0, duration: 0.6, ease: "expo.in" }, 0)
      .to(finalFrame, { scale: 1, x: 0, y: 0, rotation: 0, boxShadow: "0 0 0 rgba(0,0,0,0)", duration: 1.4 }, 0.05)
      .to(shade, { opacity: 1, duration: 1.4, ease: "power2.inOut" }, 0.05)
      .to(
        dropOrder,
        { opacity: 0, scale: "-=0.1", duration: 0.8, ease: "power2.in", stagger: { each: 0.012, from: "random" } },
        0.25,
      )
      .to(logo, { ...logoTarget, duration: 1.4 }, 0.1);
  }
}

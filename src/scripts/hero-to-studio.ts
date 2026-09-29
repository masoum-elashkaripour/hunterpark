import { gsap } from "gsap";
import { chapterIndicatorTo } from "./chapter-indicator";

/** Hero → Chapter 02 — tune here. Positions are shares of this beat (0–1). */
export const HERO_TO_STUDIO = {
  exitEnd: 0.25, // reel + lead-ins are gone by here
  joinStart: 0.05, // HUNT and PARK glide together…
  joinEnd: 0.44,
  nameStart: 0.36, // …and resolve into the one name, HUNTERPARK
  nameEnd: 0.56,
  // The media collapses into a centred line in ONE continuous move: width, height and
  // opacity all interpolate over the same range (no phases, no hold).
  collapseStart: 0.08,
  collapseEnd: 0.72,
  lineWidth: { desktop: 0.38, mobile: 0.8 }, // share of the frame the line spans when it closes
  widthEase: "power2.out", // narrows mostly early…
  heightEase: "power2.in", // …thins mostly late — together a steady collapse
  fadeTo: 0.3, // the image fades as it compresses — the violet line carries on from it
  lineStretchEnd: 0.9, // …and the violet line stretches across the frame
  chapterAt: 0.72, // the indicator rolls 01 INTRO → 02 STUDIO
};

/** Where an element sits with its GSAP transforms cleared — so targets stay right on refresh. */
function naturalRect(el: HTMLElement): DOMRect {
  const saved = { x: gsap.getProperty(el, "x"), y: gsap.getProperty(el, "y"), scale: gsap.getProperty(el, "scale") };
  gsap.set(el, { x: 0, y: 0, scale: 1 });
  const rect = el.getBoundingClientRect();
  gsap.set(el, saved);
  return rect;
}

/** Bounding box of a run of split letters, read from their (untransformed) masks. */
function lettersRect(chars: HTMLElement[]): { left: number; right: number; top: number; bottom: number } {
  const rects = chars.map((c) => (c.parentElement ?? c).getBoundingClientRect());
  return {
    left: Math.min(...rects.map((r) => r.left)),
    right: Math.max(...rects.map((r) => r.right)),
    top: Math.min(...rects.map((r) => r.top)),
    bottom: Math.max(...rects.map((r) => r.bottom)),
  };
}

/** Transform that lays a hero word onto its letters inside the HUNTERPARK wordmark. */
function onto(word: HTMLElement, chars: HTMLElement[]) {
  const scale = () => {
    const t = lettersRect(chars);
    return (t.bottom - t.top) / naturalRect(word).height;
  };
  return {
    scale,
    x: () => lettersRect(chars).left - naturalRect(word).left,
    y: () => {
      const n = naturalRect(word);
      return lettersRect(chars).bottom - n.top - n.height * scale();
    },
  };
}

const isMobile = () => window.matchMedia("(max-width: 767px)").matches;

/**
 * Chapter 01 becomes Chapter 02: the reel and lead-ins slip away, HUNT and PARK
 * glide together and resolve into the one name — HUNTERPARK — while the hero
 * media closes into a window and shuts to a violet line, the line Studio's first
 * film opens out of. HunterPark is never split: it becomes one word, then (in
 * studio.ts) gives way to WHO WE ARE in the same place.
 * Returns an unpinned timeline of length 1 (placed by scripts/film.ts), or null.
 */
export function heroToStudioTimeline(): gsap.core.Timeline | null {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  const hunt = hero?.querySelector<HTMLElement>('[data-hero-word="hunt"]');
  const park = hero?.querySelector<HTMLElement>('[data-hero-word="park"]');
  const shutter = hero?.querySelector<HTMLElement>("[data-hero-shutter]");
  const nameChars = Array.from(document.querySelectorAll<HTMLElement>("[data-studio-name] [data-split-char]"));
  if (!hero || !hunt || !park || !shutter || nameChars.length < 10) return null;
  const huntChars = nameChars.slice(0, 4); // H U N T
  const parkChars = nameChars.slice(-4); // P A R K

  const backdrop = hero.querySelector<HTMLElement>(".hero__backdrop");
  const m = HERO_TO_STUDIO;
  const joinDur = m.joinEnd - m.joinStart;
  const lineWidth = () => (isMobile() ? m.lineWidth.mobile : m.lineWidth.desktop);
  const easeW = gsap.parseEase(m.widthEase);
  const easeH = gsap.parseEase(m.heightEase);
  // One progress value drives the whole collapse; the clip is always a centred rectangle
  const collapse = { p: 0 };
  const drawCollapse = () => {
    const side = ((1 - lineWidth()) / 2) * 100 * easeW(collapse.p);
    const edge = 50 * easeH(collapse.p);
    if (backdrop) {
      backdrop.style.clipPath = `inset(${edge.toFixed(3)}% ${side.toFixed(3)}% ${edge.toFixed(3)}% ${side.toFixed(3)}%)`;
      backdrop.style.opacity = String(1 - (1 - m.fadeTo) * collapse.p);
    }
  };

  gsap.set([hunt, park], { transformOrigin: "0% 0%" });

  return (
    gsap
      .timeline({ defaults: { ease: "none" } })
      // 1 · The reel and the whispered lead-ins slip away
      .to(hero.querySelector("[data-hero-reel]"), { y: 60, autoAlpha: 0, duration: m.exitEnd, ease: "power2.in" }, 0)
      .to(hero.querySelectorAll("[data-hero-lead]"), { yPercent: -40, autoAlpha: 0, duration: m.exitEnd * 0.8, stagger: 0.04, ease: "power2.in" }, 0)
      // 2 · The punctuation lets go first, so the two words can become one name…
      .to(hero.querySelectorAll("[data-hero-punct]"), { autoAlpha: 0, duration: 0.08 }, m.joinStart)
      // …HUNT and PARK glide together onto their letters in HUNTERPARK…
      .to(hunt, { ...onto(hunt, huntChars), duration: joinDur, ease: "power3.inOut" }, m.joinStart)
      .to(park, { ...onto(park, parkChars), duration: joinDur, ease: "power3.inOut" }, m.joinStart)
      // …and the one name takes over: its letters rise from the centre out, the two words give way
      .fromTo(
        nameChars,
        { yPercent: 110 },
        { yPercent: 0, duration: (m.nameEnd - m.nameStart) * 0.7, stagger: { each: 0.012, from: "center" }, ease: "power3.out" },
        m.nameStart,
      )
      .to([hunt, park], { autoAlpha: 0, duration: 0.05 }, m.nameStart + (m.nameEnd - m.nameStart) * 0.35)
      // 3 · The media collapses into itself about the frame's centre — narrowing, thinning and
      //     fading at the same time, as one continuous move from full frame to a centred line.
      //     (The clip is written from a single progress value, so there are no stages to meet,
      //     no easing to a stop mid-way, and no shorthand insets to mis-interpolate.)
      .fromTo(collapse, { p: 0 }, { p: 1, duration: m.collapseEnd - m.collapseStart, ease: "none", onUpdate: drawCollapse, immediateRender: false }, m.collapseStart)
      // 4 · The violet line takes over from the shut window and stretches edge to edge
      .fromTo(shutter, { scaleX: 0 }, { scaleX: lineWidth, duration: 0.02 }, m.collapseEnd - 0.02)
      .to(shutter, { scaleX: 1, duration: m.lineStretchEnd - m.collapseEnd, ease: "power2.out" }, m.collapseEnd)
      // 5 · The running chapter marker rolls over
      .add(chapterIndicatorTo(1, 0.12), m.chapterAt)
      .to({}, { duration: 1 - m.lineStretchEnd })
  );
}

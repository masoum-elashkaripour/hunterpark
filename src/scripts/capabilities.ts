import { gsap } from "gsap";
import { chapterIndicatorTo } from "./chapter-indicator";
import { frameSubject, win, STUDIO_MOTION } from "./studio";

/**
 * What We Do — the capabilities beat of the homepage film. Tune here.
 * Positions are shares of the beat's own timeline (0–1); film.ts gives the beat its
 * scroll length. Everything is scrubbed: stop scrolling and it stops, scroll back and
 * it reverses. No hover, nothing plays on its own.
 */
export const CAPS_MOTION = {
  // 1 · The WHO WE ARE film shrinks from fullscreen into the window as Film & Video
  settle: { end: 0.14 },
  // 2 · Capabilities advance one by one; each hand-over takes this share of the beat
  change: 0.07,
  // 3 · Hand-off: the window opens full-bleed, Chapter 03 is announced
  handoff: { start: 0.84, end: 0.98, chapterAt: 0.87, titleAt: 0.9 },
  reveal: { ease: "power3.inOut" }, // sharp and controlled, no overshoot
  mediaFrom: { scale: 1.12, shift: 6 }, // incoming media settles from a slight zoom + offset (%)
  title: { dim: 0.26, shift: "0.35em" },
};

// The edge each capability's media takes the window from — varied, so the rhythm isn't a loop
const EDGES = ["inset(0% 0% 100% 0%)", "inset(0% 0% 0% 100%)", "inset(100% 0% 0% 0%)", "inset(0% 100% 0% 0%)", "inset(0% 0% 100% 0%)"];
const SHIFTS = [[0, -1], [1, 0], [0, 1], [-1, 0], [0, -1]]; // matching direction of travel

const cssVar = (el: HTMLElement, name: string) => getComputedStyle(el).getPropertyValue(name).trim() || "0%";

export interface CapabilitiesBeat {
  timeline: gsap.core.Timeline;
  /** Where each capability becomes the active one, as a share of the beat (0–1). */
  at: number[];
  /** The active capability at a given beat progress. */
  activeAt: (p: number) => number;
}

/**
 * Builds the beat as an unpinned timeline of length 1 (placed by film.ts), or null.
 * Film & Video *is* the WHO WE ARE film: the same element is carried from fullscreen
 * into the capability window — no second copy, no cut.
 */
export function capabilitiesTimeline(): CapabilitiesBeat | null {
  const root = document.querySelector<HTMLElement>("[data-caps]");
  const studio = document.querySelector<HTMLElement>("[data-studio-stage]");
  const anchor = studio?.querySelector<HTMLElement>("[data-whatwedo-anchor]");
  const doVideo = studio?.querySelector<HTMLElement>("[data-whatwedo-video]");
  const frame = root?.querySelector<HTMLElement>("[data-caps-frame]");
  if (!root || !studio || !anchor || !doVideo || !frame) return null;

  const m = CAPS_MOTION;
  const one = (sel: string) => root.querySelector<HTMLElement>(sel);
  const titles = Array.from(root.querySelectorAll<HTMLElement>("[data-caps-item]"));
  const labels = Array.from(root.querySelectorAll<HTMLElement>("[data-caps-label]"));
  const lines = Array.from(root.querySelectorAll<HTMLElement>("[data-caps-line]"));
  const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-caps-layer]"));
  const nums = Array.from(root.querySelectorAll<HTMLElement>("[data-caps-num]"));
  const n = titles.length;
  if (!n) return null;
  // Tween between real colours (GSAP can't interpolate var() references cleanly)
  const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const LIME = token("--hp-lime");
  const WHITE = token("--hp-off-white");

  // Resting state the timeline builds from: titles quiet and below their masks,
  // captions and media layers hidden (Film & Video is the shared film underneath)
  gsap.set(titles, { opacity: m.title.dim, x: 0 });
  gsap.set(labels, { yPercent: 105, color: WHITE });
  gsap.set(root.querySelectorAll(".caps__index"), { autoAlpha: 0 });
  gsap.set(lines, { autoAlpha: 0, y: 10 });
  gsap.set(nums, { autoAlpha: 0, yPercent: 100 });
  gsap.set([...layers, ...root.querySelectorAll("[data-caps-also]")], { autoAlpha: 0 });
  gsap.set(one("[data-caps-shade]"), { opacity: 0 });

  const tl = gsap.timeline({ defaults: { ease: "none" } });
  const s = m.settle.end;

  // 1 · Settle: the fullscreen film shrinks — framed on her face — into the window,
  //     WHAT WE DO lifts away, the titles rise into place and Film & Video leads
  tl.fromTo(anchor, { clipPath: win("full") }, { clipPath: win("caps"), duration: s, ease: "power2.inOut", immediateRender: false }, 0)
    .to(doVideo, { ...frameSubject(doVideo, studio, "caps", STUDIO_MOTION.subjects.whatWeDoCaps), duration: s, ease: "power2.inOut" }, 0)
    .to(studio.querySelector("[data-whatwedo-shade]"), { opacity: 0.5, duration: s }, 0)
    .to(studio.querySelector("[data-whatwedo-heading]"), { yPercent: -30, autoAlpha: 0, duration: s * 0.5, ease: "power2.in" }, 0)
    .to(one("[data-caps-shade]"), { opacity: 1, duration: s * 0.3 }, s * 0.7)
    .to(labels, { yPercent: 0, duration: s * 0.55, stagger: (s * 0.3) / n, ease: "power3.out" }, s * 0.4)
    .to(root.querySelectorAll(".caps__index"), { autoAlpha: 1, duration: s * 0.3, stagger: (s * 0.3) / n }, s * 0.5)
    .to(titles[0], { opacity: 1, x: m.title.shift, duration: s * 0.25 }, s * 0.75)
    .to(labels[0], { color: LIME, duration: s * 0.25 }, s * 0.75)
    .to(lines[0], { autoAlpha: 1, y: 0, duration: s * 0.25 }, s * 0.75)
    .to(nums[0], { autoAlpha: 1, yPercent: 0, duration: s * 0.25, ease: "power3.out" }, s * 0.75);

  // 2 · The sequence: each capability takes the window in turn, over an equal share of scroll
  const step = (m.handoff.start - s) / n;
  const at: number[] = [0];
  for (let i = 1; i < n; i++) {
    const t = s + step * i - m.change / 2;
    at.push(t + m.change / 2);
    const layer = layers[i];
    const inner = layer.querySelector<HTMLElement>("[data-caps-layer-inner]");
    const [sx, sy] = SHIFTS[i % SHIFTS.length];
    tl.set(layer, { autoAlpha: 1 }, t)
      // the new medium is cut in from an edge over the previous one, which stays put beneath
      .fromTo(layer, { clipPath: EDGES[i % EDGES.length] }, { clipPath: "inset(0% 0% 0% 0%)", duration: m.change, ease: m.reveal.ease, immediateRender: false }, t)
      .fromTo(
        inner,
        { scale: m.mediaFrom.scale, xPercent: sx * m.mediaFrom.shift, yPercent: sy * m.mediaFrom.shift },
        { scale: 1, xPercent: 0, yPercent: 0, duration: m.change * 1.3, ease: m.reveal.ease, immediateRender: false },
        t,
      )
      // emphasis passes from the previous title to this one
      .to(titles[i - 1], { opacity: m.title.dim, x: 0, duration: m.change }, t)
      .to(labels[i - 1], { color: WHITE, duration: m.change }, t)
      .to(titles[i], { opacity: 1, x: m.title.shift, duration: m.change }, t)
      .to(labels[i], { color: LIME, duration: m.change }, t)
      .to(lines[i - 1], { autoAlpha: 0, y: -8, duration: m.change * 0.45 }, t)
      .to(lines[i], { autoAlpha: 1, y: 0, duration: m.change * 0.55 }, t + m.change * 0.45)
      // the folio rolls: the old number rises out of its mask as the new one rises in
      .to(nums[i - 1], { yPercent: -100, duration: m.change * 0.6, ease: m.reveal.ease }, t)
      .set(nums[i - 1], { autoAlpha: 0 }, t + m.change * 0.6)
      .set(nums[i], { autoAlpha: 1 }, t)
      .to(nums[i], { yPercent: 0, duration: m.change * 0.6, ease: m.reveal.ease }, t + m.change * 0.2);

    // A capability with a second still: it cuts in halfway through the capability's share,
    // from the opposite edge, the title staying put
    const also = root.querySelector<HTMLElement>(`[data-caps-also="${titles[i].dataset.capsItem}"]`);
    if (also) {
      const ta = t + step * 0.5;
      const k = (i + 2) % EDGES.length;
      const [ax, ay] = SHIFTS[k];
      tl.set(also, { autoAlpha: 1 }, ta)
        .fromTo(also, { clipPath: EDGES[k] }, { clipPath: "inset(0% 0% 0% 0%)", duration: m.change, ease: m.reveal.ease, immediateRender: false }, ta)
        .fromTo(
          also.querySelector("[data-caps-layer-inner]"),
          { scale: m.mediaFrom.scale, xPercent: ax * m.mediaFrom.shift, yPercent: ay * m.mediaFrom.shift },
          { scale: 1, xPercent: 0, yPercent: 0, duration: m.change * 1.3, ease: m.reveal.ease, immediateRender: false },
          ta,
        );
    }
  }

  // 3 · Hand-off: the titles lift away, the window grows full-bleed, Chapter 03 is announced
  const h = m.handoff;
  const span = h.end - h.start;
  tl.to(one("[data-caps-list]"), { yPercent: -12, autoAlpha: 0, duration: span * 0.6, ease: "power2.in" }, h.start)
    .to(one("[data-caps-caption]"), { autoAlpha: 0, duration: span * 0.3 }, h.start)
    .to(one("[data-caps-folio]"), { autoAlpha: 0, duration: span * 0.3 }, h.start)
    .fromTo(
      frame,
      { top: () => cssVar(root, "--wt"), right: () => cssVar(root, "--wr"), bottom: () => cssVar(root, "--wb"), left: () => cssVar(root, "--wl") },
      { top: "0%", right: "0%", bottom: "0%", left: "0%", duration: span, ease: "power3.inOut", immediateRender: false },
      h.start,
    )
    .add(chapterIndicatorTo(2, 0.05), h.chapterAt)
    .set(one("[data-caps-next]"), { autoAlpha: 1 }, h.titleAt)
    .fromTo(one("[data-caps-next-title]"), { yPercent: 105 }, { yPercent: 0, duration: 0.07, ease: "power3.out", immediateRender: false }, h.titleAt)
    .to({}, { duration: Math.max(0, 1 - tl.duration()) });

  const activeAt = (p: number) => {
    let i = 0;
    for (let k = 0; k < at.length; k++) if (p >= at[k]) i = k;
    return i;
  };
  return { timeline: tl, at, activeAt };
}

/* ------------------------------------------------------------------------- */

let jump: ((index: number) => void) | null = null;
/** film.ts registers how to scroll the film to a capability. */
export function setCapabilityJump(fn: (index: number) => void): void {
  jump = fn;
}

/** Keeps aria-pressed / .is-active in step with the active capability. */
export function markActive(root: HTMLElement, index: number): void {
  root.querySelectorAll<HTMLButtonElement>("[data-caps-item]").forEach((b, k) => {
    b.classList.toggle("is-active", k === index);
    b.setAttribute("aria-pressed", String(k === index));
  });
}

/**
 * Titles are real controls. With motion on, clicking one scrolls the film to that
 * capability (the sequence plays there). Without motion there is no film, so it
 * switches the media and caption directly.
 */
export function initCapabilities(): void {
  const root = document.querySelector<HTMLElement>("[data-caps]");
  if (!root) return;
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-caps-item]"));
  const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-caps-layer]"));
  const lines = Array.from(root.querySelectorAll<HTMLElement>("[data-caps-line]"));
  const nums = Array.from(root.querySelectorAll<HTMLElement>("[data-caps-num]"));

  fitCaptions(root);

  buttons.forEach((button, i) =>
    button.addEventListener("click", () => {
      if (jump && document.documentElement.classList.contains("hp-motion")) return jump(i);
      markActive(root, i);
      layers.forEach((l, k) => l.classList.toggle("is-active", k === i));
      lines.forEach((l, k) => l.classList.toggle("is-active", k === i));
      nums.forEach((l, k) => l.classList.toggle("is-active", k === i));
    }),
  );
}

/**
 * Captions stay on one line: if the longest one is wider than the space inside the media,
 * every caption is scaled down together by just enough (never up, never below 60%).
 */
function fitCaptions(root: HTMLElement): void {
  const caption = root.querySelector<HTMLElement>("[data-caps-caption]");
  const lines = Array.from(root.querySelectorAll<HTMLElement>("[data-caps-line]"));
  if (!caption || !lines.length) return;
  const range = document.createRange();
  const widest = () =>
    Math.max(
      ...lines.map((line) => {
        range.selectNodeContents(line);
        return range.getBoundingClientRect().width;
      }),
    );
  const fit = () => {
    caption.style.removeProperty("--caps-line-scale");
    const room = caption.clientWidth - 1;
    if (!room) return;
    // Text width doesn't shrink exactly in proportion to font size (hinting, rounding),
    // so re-measure and tighten until the widest line truly fits
    let scale = 1;
    for (let i = 0; i < 4; i++) {
      const w = widest();
      if (w <= room) break;
      scale = Math.max(0.6, scale * (room / w) - 0.005);
      caption.style.setProperty("--caps-line-scale", scale.toFixed(4));
      if (scale === 0.6) break;
    }
  };
  let queued = 0;
  const refit = () => {
    cancelAnimationFrame(queued);
    queued = requestAnimationFrame(fit);
  };
  fit();
  document.fonts?.ready.then(refit);
  window.addEventListener("resize", refit);
}

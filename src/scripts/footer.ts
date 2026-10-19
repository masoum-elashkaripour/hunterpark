import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { strokeLength } from "./lifecycle";
import { crossD, phonePlate } from "@/lib/footer-plate";

/**
 * The footer — the last beat of the homepage film. Tune here.
 * Positions are shares of the beat's own timeline (0–1); film.ts gives the beat its scroll
 * length. Scrubbed like everything else: stop and it stops, scroll back and it reverses.
 *
 *   1 · the call to action parts: MAKE and TOGETHER. leave by the left edge, SOMETHING and
 *       the link by the right — each travelling all the way out of frame
 *   2 · the header's wordmark leaves its slot and descends, growing, to sign the page
 *       across the bottom (the preloader's flight into that slot, played the other way)
 *   3 · the night rises over the call to action's blurred frame
 *   4 · the footer settles around the wordmark: the statement word by word from its masks,
 *       then the links and small print, the hairline drawn last
 *   5 · the line field across the whole section is drawn along each shape's measured length
 *       (as in WHO WE ARE) as the footer arrives; then, through the last stretch of scroll,
 *       its curves open out a little about their centres, the guides settle and the glow drifts
 *
 * (Shares of a 4.5-screen beat — film.ts.)
 */
export const FOOTER_MOTION = {
  part: { start: 0, each: 0.264, stagger: 0.0272, charStagger: 0.0093, ease: "power2.in" },
  mark: { start: 0.078, end: 0.56, ease: "power2.inOut" },
  night: { start: 0.233, end: 0.451 },
  marker: { start: 0.039, end: 0.156 }, // the running chapter marker steps aside for the wordmark
  settle: { start: 0.436, words: 0.124, wordStagger: 0.0093, items: 0.109, itemStagger: 0.014, ease: "power3.out" },
  figure: {
    lines: { start: 0.46, end: 0.84, each: 0.5 }, // drawn in direct step with the scroll
    rest: [0.8, 1], // the last stretch: the arcs grow into place, the guides settle
    arcsFrom: 0.96,
  },
};

/** Builds the beat as an unpinned timeline of length 1 (placed by film.ts), or null. */
export function footerTimeline(): gsap.core.Timeline | null {
  const root = document.querySelector<HTMLElement>("[data-footer]");
  const mark = root?.querySelector<HTMLElement>("[data-footer-mark]");
  const headerLogo = document.querySelector<HTMLElement>("[data-header-logo]");
  if (!root || !mark || !headerLogo) return null;

  const m = FOOTER_MOTION;
  const ctaWords = Array.from(document.querySelectorAll<HTMLElement>("[data-work-cta-word]"));
  const ctaChars = Array.from(document.querySelectorAll<HTMLElement>("[data-work-cta-char]"));
  const ctaAction = document.querySelector<HTMLElement>("[data-work-cta-action]");
  const words = Array.from(root.querySelectorAll<HTMLElement>("[data-split-word]"));
  const items = Array.from(root.querySelectorAll<HTMLElement>("[data-footer-item]"));
  const rule = root.querySelector<HTMLElement>("[data-footer-rule]");
  const marker = document.querySelector<HTMLElement>("[data-chapter-index]");
  const glow = root.querySelector<HTMLElement>("[data-footer-glow]");
  const arcs = Array.from(root.querySelectorAll<SVGGElement>("[data-footer-arcs]"));
  const guides = Array.from(root.querySelectorAll<SVGGElement>("[data-footer-guides]"));
  const lines = Array.from(root.querySelectorAll<SVGGeometryElement>("[data-footer-line]"));

  // The phone figure, laid out from where the footer's blocks stand (lib/footer-plate.ts) —
  // redrawn on every refresh; its parts draw on a normalised length, so the reveal holds
  const tallSvg = root.querySelector<SVGSVGElement>("[data-footer-tall]");
  const stageEl = root.querySelector<HTMLElement>("[data-footer-stage]");
  const layPlate = () => {
    if (!tallSvg || !stageEl || !window.matchMedia("(max-width: 767px)").matches) return;
    const plate = phonePlate(stageEl);
    if (!plate) return;
    const set = (name: string, attrs: Record<string, string | number>) => {
      const el = tallSvg.querySelector(`[data-plate="${name}"]`);
      if (el) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
    };
    tallSvg.setAttribute("viewBox", `0 0 ${plate.w} ${plate.h}`);
    tallSvg.setAttribute("preserveAspectRatio", "none");
    set("ring", { cx: plate.ring.cx, cy: plate.ring.cy, r: plate.ring.r });
    set("sweep", { d: plate.sweep });
    set("g0", { d: `M 0 ${plate.yA} H ${plate.w}` });
    set("g1", { d: `M 0 ${plate.yB} H ${plate.w}` });
    set("g2", { d: `M ${plate.vx} ${plate.vTop} V ${plate.vBottom}` });
    set("cross", { d: crossD(plate.crosses, 5) });
    tallSvg.querySelector("[data-footer-arcs]")?.setAttribute("data-origin", `${plate.ring.cx} ${plate.ring.cy}`);
  };
  layPlate();
  ScrollTrigger.addEventListener("refresh", layPlate);

  // Resting state: the footer waits unseen (it is stacked over the whole film)
  gsap.set(mark, { autoAlpha: 0 });
  gsap.set(root.querySelector("[data-footer-glow]"), { autoAlpha: 0 });
  gsap.set(words, { yPercent: 110 });
  gsap.set(items, { autoAlpha: 0 });
  if (rule) gsap.set(rule, { scaleX: 0 });

  const tl = gsap.timeline({ defaults: { ease: "none" } });

  // 1 · The call to action parts to either edge, each piece travelling fully out of frame
  const leave = (el: HTMLElement, dir: 1 | -1, at: number) =>
    tl.fromTo(
      el,
      { x: 0 },
      {
        x: () => {
          const r = el.getBoundingClientRect();
          const left = r.left - (Number(gsap.getProperty(el, "x")) || 0);
          return dir > 0 ? window.innerWidth - left + 24 : -(left + r.width + 24);
        },
        duration: m.part.each,
        ease: m.part.ease,
        immediateRender: false,
      },
      at,
    );
  const P = m.part;
  if (ctaWords[0]) leave(ctaWords[0], -1, P.start); // MAKE ←
  if (ctaWords[1]) leave(ctaWords[1], 1, P.start + P.stagger); // SOMETHING →
  // TOGETHER. ← letter by letter, the first one leading
  ctaChars.forEach((char, i) => leave(char, -1, P.start + P.stagger * 2 + i * P.charStagger));
  if (ctaAction) leave(ctaAction, 1, P.start + P.stagger * 1.5); // the link →

  // 2 · The wordmark leaves the header and descends, growing, into its place on the bottom
  //     edge. It is laid out in its final place; it starts exactly over the header's logo.
  const from = () => {
    const a = headerLogo.getBoundingClientRect();
    const b = mark.getBoundingClientRect();
    // the mark's untransformed box (its scale is about the centre, so the centre only moves by x/y)
    const x = Number(gsap.getProperty(mark, "x")) || 0;
    const y = Number(gsap.getProperty(mark, "y")) || 0;
    const scale = Number(gsap.getProperty(mark, "scale")) || 1;
    const cx = b.left + b.width / 2 - x;
    const cy = b.top + b.height / 2 - y;
    const width = b.width / scale;
    return { x: a.left + a.width / 2 - cx, y: a.top + a.height / 2 - cy, scale: a.width / width };
  };
  tl.fromTo(headerLogo, { visibility: "visible" }, { visibility: "hidden", duration: 0.001, immediateRender: false }, m.mark.start)
    .fromTo(mark, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, immediateRender: false }, m.mark.start)
    .fromTo(
      mark,
      { x: () => from().x, y: () => from().y, scale: () => from().scale },
      { x: 0, y: 0, scale: 1, duration: m.mark.end - m.mark.start, ease: m.mark.ease, immediateRender: false },
      m.mark.start,
    );
  if (marker) tl.fromTo(marker, { opacity: 1 }, { opacity: 0, duration: m.marker.end - m.marker.start, immediateRender: false }, m.marker.start);

  // 3 · The night rises over the call to action's frame
  tl.fromTo(root.querySelector("[data-footer-ground]"), { opacity: 0 }, { opacity: 1, duration: m.night.end - m.night.start, immediateRender: false }, m.night.start);

  // 4 · The footer settles: the statement rises word by word, then the rest in reading order,
  //     each piece uncovered from its baseline as it rises; the hairline is drawn last
  const S = m.settle;
  tl.to(words, { yPercent: 0, duration: S.words, ease: S.ease, stagger: S.wordStagger }, S.start);
  const itemsAt = S.start + S.words * 0.5;
  items.forEach((item, i) => {
    const at = itemsAt + i * S.itemStagger;
    tl.set(item, { autoAlpha: 1 }, at).fromTo(
      item,
      { y: 16, clipPath: "inset(100% 0% 0% 0%)" },
      { y: 0, clipPath: "inset(0% 0% 0% 0%)", duration: S.items, ease: S.ease, immediateRender: false },
      at,
    );
  });
  if (rule) tl.to(rule, { scaleX: 1, duration: S.items * 1.4, ease: "power3.inOut" }, itemsAt + items.length * S.itemStagger * 0.5);

  // 5 · The line figure
  const A = m.figure;
  // Drawn along each shape's real (measured) length, linear and overlapping, like WHO WE ARE
  lines.forEach((el) => {
    const len = el.hasAttribute("pathLength") ? Number(el.getAttribute("pathLength")) : strokeLength(el);
    gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
  });
  const L = A.lines;
  const span = L.end - L.start;
  tl.to(
    lines,
    {
      strokeDashoffset: 0,
      autoRound: false, // sub-pixel precision so the draw is continuous
      duration: span * L.each,
      stagger: (span * (1 - L.each)) / Math.max(lines.length - 1, 1),
      ease: "none",
    },
    L.start,
  );
  if (glow) tl.fromTo(glow, { autoAlpha: 0, xPercent: -20, yPercent: 12 }, { autoAlpha: 1, xPercent: 18, yPercent: -10, duration: 1 - L.start, immediateRender: false }, L.start);
  // the curves open out about their own centre (each field has its own) — and the guides
  // settle — except on a phone: there the figure stands still and only draws, since a 12px
  // drift and a slow swell, scrubbed by a thumb's uneven scroll over the pinned footer, read
  // as the pattern wobbling up and down rather than settling
  const still = window.matchMedia("(max-width: 767px)").matches;
  if (!still) arcs.forEach((g) => {
    const svgOrigin = g.dataset.origin ?? "0 0";
    tl.fromTo(g, { scale: A.arcsFrom, svgOrigin }, { scale: 1, svgOrigin, duration: 1 - L.start, ease: "power2.out", immediateRender: false }, L.start);
  });
  if (!still && guides.length) tl.fromTo(guides, { y: 12 }, { y: 0, duration: A.rest[1] - A.rest[0], ease: "power1.out", immediateRender: false }, A.rest[0]);

  // The footer takes the pointer the moment it owns the frame (the night has fully risen over
  // the call to action) — so its links and hovers work as soon as they're seen, not only at
  // the very end of the scroll
  tl.to({}, { duration: Math.max(0, 1 - tl.duration()) }).eventCallback("onUpdate", () =>
    root.classList.toggle("is-live", tl.progress() >= m.night.end),
  );
  return tl;
}

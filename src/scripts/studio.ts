import { gsap } from "gsap";
import { strokeLength } from "./lifecycle";

/**
 * Chapter 02 stage — tune here. Positions are shares of this beat (0–1).
 * Windows are clip-path insets on full-stage film layers (top right bottom left).
 * The story film is vertical (9:16); the What We Do film (IMG_4642) is landscape.
 */
export const STUDIO_MOTION = {
  open: { end: 0.13 }, // the story film opens out of the hero's shutter line…
  name: { start: 0.03, end: 0.15 }, // HUNTERPARK's letters lift out…
  heading: { start: 0.07, end: 0.23, charRise: 110, charTilt: 8 }, // …as WHO WE ARE rises into the same place
  reframe: { start: 0.22, end: 0.36 }, // the film steps aside to make room for the story
  // Editorial masked reveal, word by word and scrubbed: each word rises out of its own mask
  // from just below its baseline and settles. Sharp, controlled easing — no overshoot,
  // rotation, scale or blur. (No tracking animation: it would change word widths and
  // shift/re-wrap the lines while they settle.)
  story: {
    start: 0.27, // as its place frees up (WHO WE ARE has landed, the film steps aside)
    end: 0.41, // whole sentence in — while the pattern is still drawing (0.15–0.62)
    word: 0.045, // how long one word takes to settle
    fromYPercent: 105, // starts just below its mask
    fromOpacity: 0.7, // barely-there lift, no fade
    ease: "power3.out",
    emphasisAt: 0.44, // key phrases turn lime once the sentence is complete
  },
  // Drawn directly by scroll from the first frame of the chapter, at a constant rate
  // WHO WE ARE's pattern: starts the moment WHO WE ARE begins, drawn directly by scroll
  lines: { drawStart: 0.15, drawEnd: 0.62, each: 0.42 }, // from the moment HUNTERPARK has fully left
  strip: { start: 0.3, end: 0.62 }, // the What We Do film appears as a narrow strip…
  // …then grows, in one continuous move, to cover the whole viewport; WHAT WE DO lands on it.
  // (The next beat — scripts/capabilities.ts — shrinks the same film into the capability window.)
  handover: { start: 0.63, end: 0.86, headingAt: 0.76, headingEnd: 0.9 },
  windows: {
    desktop: {
      line: "inset(50% 36% 50% 36%)", // the hero window's width, shut to a line
      hero: "inset(9% 36% 7% 36%)", // tall, centred — the heading crosses it
      column: "inset(38% 73% 6% 4%)", // lower-left column beside the story
      stripFrom: "inset(78% 5% 4% 76%)", // bottom-right, sized so a face reads
      stripTo: "inset(71% 5% 5% 76%)",
      full: "inset(0% 0% 0% 0%)",
      caps: "inset(11% 5% 11% 52%)", // must match --wt/--wr/--wb/--wl in capabilities.css
    },
    tablet: {
      line: "inset(50% 36% 50% 36%)",
      hero: "inset(9% 30% 9% 30%)",
      column: "inset(55% 62% 6% 4%)",
      stripFrom: "inset(80% 5% 4% 64%)",
      stripTo: "inset(72% 5% 5% 64%)",
      full: "inset(0% 0% 0% 0%)",
      caps: "inset(10% 5% 34% 36%)",
    },
    mobile: {
      line: "inset(50% 18% 50% 18%)",
      hero: "inset(14% 18% 18% 18%)",
      column: "inset(70% 52% 5% 5%)",
      stripFrom: "inset(76% 5% 5% 52%)",
      stripTo: "inset(70% 5% 5% 52%)",
      full: "inset(0% 0% 0% 0%)",
      caps: "inset(13% 5% 45% 5%)",
    },
  },
  /**
   * Subject framing for small windows: where the subject sits in each (uncropped) film,
   * and how much of the film's height to keep in view around it — so a small window
   * shows a whole head, not an arbitrary slice.
   */
  subjects: {
    story: { focusX: 0.5, focusY: 0.36, keep: 0.62 },
    whatWeDo: { focusX: 0.32, focusY: 0.36, keep: 0.62 }, // her face sits in the left third
    // Fullscreen: the whole frame (keep 1 = cover the stage), centred on her where the screen allows
    whatWeDoFull: { focusX: 0.32, focusY: 0.36, keep: 1 },
    // Film & Video's window: wider, so her whole head reads however she moves in the live footage
    whatWeDoCaps: { focusX: 0.32, focusY: 0.36, keep: 0.95 }, // same focus = the film's transform origin
  },
};

export type WindowKey = keyof typeof STUDIO_MOTION.windows.desktop;
type Subject = { focusX: number; focusY: number; keep: number };

const windows = () =>
  window.matchMedia("(max-width: 767px)").matches
    ? STUDIO_MOTION.windows.mobile
    : window.matchMedia("(max-width: 1023px)").matches
      ? STUDIO_MOTION.windows.tablet
      : STUDIO_MOTION.windows.desktop;
export const win = (key: WindowKey) => () => windows()[key];

/** A window's box in stage pixels. */
function windowBox(key: WindowKey, stage: HTMLElement) {
  const [, top, right, bottom, left] = windows()[key].match(/inset\(([\d.]+)% ([\d.]+)% ([\d.]+)% ([\d.]+)%\)/)!.map(Number);
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  return { x: (left / 100) * w, y: (top / 100) * h, w: ((100 - left - right) / 100) * w, h: ((100 - top - bottom) / 100) * h };
}

/**
 * Transform that frames a film's subject inside a window: scales the whole (uncropped)
 * film around its focal point so `keep` of its height fills the window, never smaller
 * than the window's width, then centres the subject in it. Recomputed on resize.
 */
export function frameSubject(video: HTMLElement, stage: HTMLElement, key: WindowKey, subject: Subject) {
  const measure = () => {
    const saved = { x: gsap.getProperty(video, "x"), y: gsap.getProperty(video, "y"), scale: gsap.getProperty(video, "scale") };
    gsap.set(video, { x: 0, y: 0, scale: 1 });
    const v = video.getBoundingClientRect();
    const st = stage.getBoundingClientRect();
    gsap.set(video, saved);
    const box = windowBox(key, stage);
    const scale = Math.max(box.h / (v.height * subject.keep), box.w / v.width);
    const faceX = v.left - st.left + v.width * subject.focusX; // the transform origin sits on the face
    const faceY = v.top - st.top + v.height * subject.focusY;
    // Centre the subject, but never let a film edge show inside the window
    const w = v.width * scale;
    const h = v.height * scale;
    const cover = (want: number, origin: number, size: number, share: number, start: number, span: number) => {
      const edge = origin - size * share; // where the film's leading edge lands with no offset
      return Math.min(start - edge, Math.max(start + span - (edge + size), want));
    };
    return {
      scale,
      x: cover(box.x + box.w / 2 - faceX, faceX, w, subject.focusX, box.x, box.w),
      y: cover(box.y + box.h / 2 - faceY, faceY, h, subject.focusY, box.y, box.h),
    };
  };
  return { scale: () => measure().scale, x: () => measure().x, y: () => measure().y };
}

/**
 * Chapter 02 as one beat: the story film opens out of the hero's lime line,
 * WHO WE ARE lands across it, the film reframes while the story is built word
 * by word among lime linework, then the second film opens from a strip into
 * the frame that anchors WHAT WE DO.
 * Returns an unpinned timeline of length 1 (placed by scripts/film.ts), or null.
 */
export function studioTimeline(): gsap.core.Timeline | null {
  const stage = document.querySelector<HTMLElement>("[data-studio-stage]");
  if (!stage) return null;
  const one = (sel: string) => stage.querySelector<HTMLElement>(sel);
  const all = (sel: string) => stage.querySelectorAll<HTMLElement>(sel);

  const heading = one("[data-studio-heading]");
  const intro = one("[data-studio-intro]");
  const film = one("[data-studio-film]");
  const anchor = one("[data-whatwedo-anchor]");
  if (!heading || !intro || !film || !anchor) return null;

  const s = STUDIO_MOTION;
  // Stacked over the hero. Everything here starts hidden by its own first tween, except the
  // HUNTERPARK wordmark (revealed during the hero beat) — so hold back the story.
  const storyEl = one(".studio__story");
  gsap.set(storyEl, { autoAlpha: 0 });

  const tl = gsap.timeline({ defaults: { ease: "none" } }).set(storyEl, { autoAlpha: 1 }, 0);

  // 1 · The story film opens out of the line
  const video = one("[data-studio-film-video]")!;
  gsap.set(video, { transformOrigin: `${s.subjects.story.focusX * 100}% ${s.subjects.story.focusY * 100}%` });
  tl.fromTo(film, { clipPath: win("line") }, { clipPath: win("hero"), duration: s.open.end, ease: "power3.inOut" }, 0).fromTo(
    video,
    { scale: 1.18 },
    { scale: 1, duration: s.open.end + 0.06, ease: "power2.out" },
    0,
  );

  // 2 · HUNTERPARK gives way to WHO WE ARE in the same place: the name's letters lift out
  //     as the heading's letters rise in behind them
  tl.to(
    all("[data-studio-name] [data-split-char]"),
    { yPercent: -110, duration: (s.name.end - s.name.start) * 0.7, stagger: { each: 0.01, from: "center" }, ease: "power3.in" },
    s.name.start,
  );
  const hd = s.heading.end - s.heading.start;
  tl.fromTo(
    heading.querySelectorAll("[data-split-char]"),
    { yPercent: s.heading.charRise, rotate: s.heading.charTilt },
    { yPercent: 0, rotate: 0, duration: hd * 0.6, stagger: (hd * 0.4) / 8, ease: "power3.out" },
    s.heading.start,
  );

  // 3 · The film steps aside into a column — reframed on the subject, not a random slice;
  //     the heading eases up
  // (clip tweens always state their start — computed insets come back in shorthand and
  //  would mis-pair the sides if interpolated from)
  tl.fromTo(film, { clipPath: win("hero") }, { clipPath: win("column"), duration: s.reframe.end - s.reframe.start, ease: "power3.inOut", immediateRender: false }, s.reframe.start)
    .to(video, { ...frameSubject(video, stage, "column", s.subjects.story), duration: s.reframe.end - s.reframe.start, ease: "power3.inOut" }, s.reframe.start)
    .to(heading, { yPercent: -8, duration: s.handover.start - s.reframe.start }, s.reframe.start);

  // 4 · WHO WE ARE's lime pattern: invisible until WHO WE ARE begins, then drawn along each
  //     shape's real (measured) length in direct step with the scroll — linear, overlapping,
  //     reversible — with its soft glow coming up alongside. It exits with the block.
  const lines = one("[data-studio-lines]");
  const lineEls = Array.from(all("[data-studio-line]")) as unknown as SVGGeometryElement[];
  const lineSpan = s.lines.drawEnd - s.lines.drawStart;
  lineEls.forEach((el) => {
    const len = strokeLength(el);
    gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
  });
  tl.set(lines, { autoAlpha: 1 }, s.lines.drawStart)
    .to(
      lineEls,
      {
        strokeDashoffset: 0,
        autoRound: false, // keep sub-pixel precision so the draw is continuous
        duration: lineSpan * s.lines.each,
        stagger: (lineSpan * (1 - s.lines.each)) / Math.max(lineEls.length - 1, 1),
        ease: "none",
      },
      s.lines.drawStart,
    )
    .fromTo(one("[data-studio-glow]"), { autoAlpha: 0, xPercent: -20, yPercent: 10 }, { autoAlpha: 1, xPercent: 25, yPercent: -15, duration: lineSpan }, s.lines.drawStart);

  // 5 · The story: an editorial masked reveal, word by word, scrubbed with the scroll. Each word
  //     rises out of its mask from just below its baseline and settles — sharp, smooth,
  //     restrained. Then the key phrases turn lime.
  const words = all("[data-split-word]");
  const st = s.story;
  tl.fromTo(
    words,
    { yPercent: st.fromYPercent, opacity: st.fromOpacity },
    {
      yPercent: 0,
      opacity: 1,
      duration: st.word,
      stagger: (st.end - st.start - st.word) / Math.max(words.length - 1, 1),
      ease: st.ease,
    },
    st.start,
  ).to(all("[data-split-word][data-em]"), { color: getComputedStyle(document.documentElement).getPropertyValue("--hp-lime").trim(), duration: 0.04, stagger: 0.004 }, st.emphasisAt);

  // 6 · The What We Do film appears in a bottom-right window, framed on her face (whole head
  //     in view), easing up as the story builds
  const doVideo = one("[data-whatwedo-video]")!;
  gsap.set(doVideo, { transformOrigin: `${s.subjects.whatWeDo.focusX * 100}% ${s.subjects.whatWeDo.focusY * 100}%` });
  tl.fromTo(anchor, { clipPath: win("stripFrom") }, { clipPath: win("stripTo"), duration: s.strip.end - s.strip.start, ease: "power1.inOut" }, s.strip.start)
    .fromTo(
      doVideo,
      frameSubject(doVideo, stage, "stripFrom", s.subjects.whatWeDo),
      { ...frameSubject(doVideo, stage, "stripTo", s.subjects.whatWeDo), duration: s.strip.end - s.strip.start, ease: "power1.inOut" },
      s.strip.start,
    )
    .set(anchor, { autoAlpha: 1 }, s.strip.start);

  // 7 · Handover: WHO WE ARE lifts out while the same film grows, in one continuous move, from
  //     its bottom-right window to cover the whole viewport — WHAT WE DO lands on it
  const h = s.handover;
  const span = h.end - h.start;
  tl.to(intro, { yPercent: -25, autoAlpha: 0, duration: span * 0.7, ease: "power2.in" }, h.start)
    .fromTo(anchor, { clipPath: win("stripTo") }, { clipPath: win("full"), duration: span, ease: "power2.inOut", immediateRender: false }, h.start)
    // the face opens up to full frame — still framed on her, so portrait screens keep her face in view
    .to(doVideo, { ...frameSubject(doVideo, stage, "full", s.subjects.whatWeDoFull), duration: span, ease: "power2.inOut" }, h.start)
    .to(one("[data-whatwedo-shade]"), { opacity: 1, duration: span }, h.start)
    .fromTo(
      all("[data-whatwedo-heading] [data-split-char]"),
      { yPercent: 110, rotate: 6 },
      { yPercent: 0, rotate: 0, duration: h.headingEnd - h.headingAt - 0.064, stagger: 0.008, ease: "power3.out" },
      h.headingAt,
    )
    .to({}, { duration: 1 - h.headingEnd }); // hands straight over to the capabilities beat

  return tl;
}

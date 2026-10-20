import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Chapter 03 — Work: the last beat of the homepage film. Tune here.
 * Positions are shares of the beat's own timeline (0–1); film.ts gives the beat its scroll
 * length. Everything is scrubbed and derived from scroll alone: stop and it stops, scroll
 * back and it reverses exactly.
 *
 *   1 · WORK's letters leave the screen one by one, last letter first (K, R, O, W)
 *   2 · the Production film behind them contracts into the first project's card —
 *       and at the end of that move the <video> itself is carried into the card
 *   3 · the projects that follow come into view far behind it, the title rises
 *   4 · scroll moves a camera forward through the projects, set one behind another in a
 *       real perspective space: each foreground project passes the camera and leaves the
 *       scene as the next one travels up out of the distance to take its place
 *   — behind it all, the foreground project's own media fills the frame, blurred and
 *     darkened, and cross-fades to the next project's as the camera arrives there
 */
export const WORK_MOTION = {
  // Letters in word order (W, O, R, K). -1 leaves by the left edge, 1 by the right.
  // Only W — the first letter — goes left: any other letter leaving left would drag across
  // the letters still standing, and lime over lime merges into one shape.
  // (Shares of a 15.5-screen beat — film.ts. Each project step is ~1.45 screens of scroll.)
  letters: { start: 0, each: 0.0795, stagger: 0.02755, dirs: [-1, 1, 1, 1], ease: "power2.in" },
  morph: { start: 0.018, end: 0.1346, ease: "power3.inOut" },
  arrive: { start: 0.1346, end: 0.2086 }, // the projects behind come into view from deeper still
  titleIn: { start: 0.1472, end: 0.2023 },
  // The camera's journey, one project per equal share of scroll — ending at the finale.
  // `ease` shapes each step: 0 = constant speed, higher = the camera slows (never stops)
  // as a project is in front. Kept gentle, so no step rushes through its middle.
  travel: { start: 0.2145, end: 0.7758, ease: 0.3 },
  // The finale: it arrives like a project, then opens out to fill the frame, comes into its
  // blurred self (the call to action's background), and the headline comes forward out of
  // depth — MAKE SOMETHING word by word, then TOGETHER. letter by letter.
  finale: {
    titleOut: [0.7758, 0.8103], // its "Your Project" title rolls away as it starts to open
    expand: [0.7758, 0.8465], // the card opens out to the full frame
    dissolve: [0.8194, 0.8871], // …and its sharp image gives way to the blurred backdrop
    grow: 0.28, // as it dissolves it keeps growing, to land exactly on the backdrop's framing
    words: { start: 0.8239, each: 0.0677, stagger: 0.0226, from: -1600 }, // depth (px) they come from
    chars: { start: 0.86, each: 0.0587, stagger: 0.00723, from: -2600 },
    action: [0.9458, 0.9774],
  },
  space: {
    perspective: 0.9, // × the viewport's longer side — the camera's focal distance
    gap: 0.8, // distance between projects, × perspective
    fadeIn: [2.6, 1.9], // far projects appear between these distances (× gap)
    pass: [0.25, 0.85], // a passing project fades out between these distances in front (× perspective)
    solid: [0], // projects that stay fully opaque and leave only by passing out of frame
    haze: 0.7, // how much the far projects sink into the night background
    sway: { x: 0.018, y: 0.01 }, // the camera's drift as it travels (× viewport)
  },
  // Each project's place in the space (× viewport), set by its index: even projects on the
  // camera's centre line, odd ones one step to the right. So the next project always waits in
  // the distance beside the current one, every step pans the same distance (the same pace
  // for every transition), and — because a project passing the camera slides out opposite to
  // the camera's pan — the exits strictly alternate: 01 left, 02 right, 03 left, 04 right…
  // (The finale, the 7th, arrives centred.)
  offsets: Array.from({ length: 7 }, (_, k) => (k % 2 ? [0.34, -0.06] : [0, 0])) as Array<[number, number]>,
  spread: { phone: 1.45 }, // wider apart on narrow screens, where the cards fill more of the width
  turn: 22, // cards turn slightly toward the camera's axis: degrees per unit of offset
  parallax: 1.5, // media drift inside a card as it travels, % of its height
  // The blurred backdrop: the incoming project's takes over across this share of each step,
  // and each backdrop grows slightly as the camera moves toward (and past) its project.
  // (fade spans most of each step, so every backdrop changes over as gently as the next)
  backdrop: { in: [0.1653, 0.2267], fade: [0.15, 0.85], depth: 0.08 }, // in: after WORK's last letter has left
  /** The capability whose film becomes project 01 (its film is carried, not copied). */
  carries: "production",
};

interface Geo {
  w: number;
  h: number;
  cx: number;
  cy: number;
  perspective: number;
  gap: number;
  spread: number;
  sizes: Array<{ w: number; h: number }>;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (lo: number, hi: number, v: number) => {
  const t = clamp((v - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};
const easeInOut = gsap.parseEase("power2.inOut");
const easeOut = gsap.parseEase("power3.out");

export interface WorkBeat {
  timeline: gsap.core.Timeline;
  videos: HTMLVideoElement[];
  /** The beat's length in screens (film.ts places it at this length). */
  length: number;
  /** A position on the desktop beat's 0–1 → the same moment on this beat's 0–1. */
  at: (f: number) => number;
  /**
   * The call to action's headline and link, played on a clock rather than the scroll — for a
   * phone coming back up from the footer, where the call to action would otherwise simply be
   * standing there, built, as the footer slid off it. `hideCta` takes it back to before it
   * began; `replayCta` builds it again over `seconds`, in the order and proportions the
   * scroll gives it; `settleCta` finishes a replay at once (the reader scrolled meanwhile).
   */
  hideCta: () => void;
  replayCta: (seconds: number) => void;
  settleCta: () => void;
  /** The phone slider's resting points on this beat's 0–1 (none on a larger screen). */
  slides: number[];
  /** A vertical step taken by the phone slider instead of the page (true: taken). */
  stepSlider: (d: number) => boolean;
  /** What the phone slider's clock does after its last project (film.ts: on to the finale). */
  setSliderEnd: (fn: () => void) => void;
}

/**
 * ON A PHONE the camera's journey is a LIST: the projects stand in one column, alternately
 * left and right, and travel up the frame with the scroll as a page would; one title holds
 * the middle of the screen over them (blended by difference, so it reads on the night and
 * on a picture alike), flanked by the project's number and the count, and it changes —
 * rolling up out of its mask, the next rising in — as each picture reaches the middle.
 * Everything before the journey (WORK, the window landing on project 01) and after it (the
 * finale opening into the call to action) is the desktop's, at the desktop's length.
 */
const PHONE_LIST_QUERY = "(max-width: 767px)";
/** Screens of scroll from one project to the next in the phone list — a picture's pitch.
    (0.53 with the pictures at their present size: the open space between two of them taken
    in a step from where it was — the pictures are sized in `measure`.) */
const LIST_PITCH = 0.53;
/**
 * THE PHONE SLIDER runs on its own clock, not the scroll: the section holds for a short stretch
 * (`hold`, in screens) while the projects change by themselves every `every` seconds, each
 * change a `change`-second wipe — and a sideways swipe moves it by hand at any moment (the
 * clock starting over from it, so the two never meet). The finale's wipe takes the end of the
 * hold, on the way out to the call to action.
 */
const SLIDER = { hold: 1.0, every: 3.6, change: 0.7, ease: "power3.inOut", finale: 0.4 };
/** Time for the centre title to roll from one project's name to the next. */
const TITLE_SWAP = { duration: 0.6, ease: "power3.out" };

/** Builds the beat as an unpinned timeline of length 1 (placed by film.ts), or null. */
export function workTimeline(): WorkBeat | null {
  const root = document.querySelector<HTMLElement>("[data-work]");
  const caps = document.querySelector<HTMLElement>("[data-caps]");
  const frame = caps?.querySelector<HTMLElement>("[data-caps-frame]");
  const carried = caps?.querySelector<HTMLVideoElement>(`[data-caps-video="${WORK_MOTION.carries}"]`);
  // What We Do's own film still sits in its window underneath the capabilities
  const underneath = document.querySelector<HTMLElement>("[data-whatwedo-anchor]");
  const stage = root?.querySelector<HTMLElement>("[data-work-stage]");
  const space = root?.querySelector<HTMLElement>("[data-work-space]");
  if (!root || !caps || !frame || !stage || !space || !carried) return null;

  const m = WORK_MOTION;
  const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-work-card]"));
  const n = cards.length;
  if (!n) return null;

  const list = window.matchMedia(PHONE_LIST_QUERY).matches;
  root.classList.toggle("is-list", list);
  /* The beat in screens, and the desktop fraction → this beat's fraction. On a phone only the
     journey changes length: (n − 1) pitches; the stretches either side keep their screens. */
  const BASE = 15.5; // film.ts's desktop beat
  const ts = m.travel.start;
  const te = m.travel.end;
  const travelScreens = list ? SLIDER.hold : (te - ts) * BASE;
  const length = ts * BASE + travelScreens + (1 - te) * BASE;
  const at = (f: number) => {
    if (!list) return f;
    if (f <= ts) return (f * BASE) / length;
    if (f <= te) return (ts * BASE + ((f - ts) / (te - ts)) * travelScreens) / length;
    return (ts * BASE + travelScreens + (f - te) * BASE) / length;
  };
  /** …and back: this beat's fraction → the desktop's, which `render` is written in. */
  const from = (g: number) => {
    if (!list) return g;
    const d = g * length;
    if (d <= ts * BASE) return d / BASE;
    if (d <= ts * BASE + travelScreens) return ts + ((d - ts * BASE) / travelScreens) * (te - ts);
    return te + (d - ts * BASE - travelScreens) / BASE;
  };
  /** A duration placed at desktop fraction `f0` → this beat's. */
  const dur = (f0: number, d: number) => at(f0 + d) - at(f0);
  const counter = root.querySelector<HTMLElement>("[data-work-count]");
  const visuals = cards.map((c) => c.querySelector<HTMLElement>("[data-work-media]")!);
  const dims = cards.map((c) => c.querySelector<HTMLElement>("[data-work-dim]"));
  const captions = cards.map((c) => c.querySelector<HTMLElement>("[data-work-caption]"));
  const mores = cards.map((c) => c.querySelector<HTMLElement>("[data-work-more]"));
  const slides = cards.map((c) => c.querySelector<HTMLElement>(".work__visual"));
  const titles = Array.from(root.querySelectorAll<HTMLElement>("[data-work-title]"));
  const metas = Array.from(root.querySelectorAll<HTMLElement>("[data-work-meta]"));
  const letters = Array.from(caps.querySelectorAll<HTMLElement>("[data-caps-next-letter]"));
  const backdrop = root.querySelector<HTMLElement>("[data-work-backdrop]");
  const backdrops = Array.from(root.querySelectorAll<HTMLElement>("[data-work-backdrop-layer]"));
  // Each backdrop's blur is drawn once into a small canvas — the same blur and saturation the
  // CSS applied, at the same quarter size — so the compositor only ever scales a finished
  // bitmap. (A live CSS blur on these frame-sized layers re-rasterised in tiles as they moved
  // and faded: the stutter and checkerboarding, worst scrolling back.) A film's backdrop is
  // kept in step with its card's own video.
  const BLUR = "blur(18px) saturate(1.1)"; // must match work.css
  const blurs = backdrops.map((layer, k) => {
    const canvas = layer.querySelector<HTMLCanvasElement>("[data-work-backdrop-canvas]");
    const still = layer.querySelector<HTMLImageElement>("[data-work-backdrop-source]");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !still || !ctx) return null;
    const film = k === 0 ? carried : (cards[k]?.querySelector<HTMLVideoElement>("[data-work-video]:not([data-work-own])") ?? null);
    const [fx, fy] = (still.style.objectPosition || "50% 50%").split(" ").map((v) => parseFloat(v) / 100);
    return { layer, canvas, still, ctx, film, fx: fx ?? 0.5, fy: fy ?? 0.5, live: false };
  });
  type Blur = NonNullable<(typeof blurs)[number]>;
  const canFilter = blurs.some((b) => b && typeof b.ctx.filter === "string");

  /** Draws a source into a backdrop canvas, cover-fitted on its focal point, blurred. */
  function paint(b: Blur, src: CanvasImageSource, sw: number, sh: number) {
    const { canvas, ctx } = b;
    const cw = canvas.width;
    const ch = canvas.height;
    if (!cw || !ch || !sw || !sh) return;
    const s = Math.max(cw / sw, ch / sh);
    const dw = sw * s;
    const dh = sh * s;
    ctx.clearRect(0, 0, cw, ch);
    if (canFilter) ctx.filter = BLUR;
    ctx.drawImage(src, (cw - dw) * b.fx, (ch - dh) * b.fy, dw, dh);
    if (canFilter) ctx.filter = "none";
    b.layer.classList.add("is-drawn");
    b.layer.classList.toggle("is-css-blur", !canFilter); // no canvas filters: blur the canvas in CSS
  }
  const paintStill = (b: Blur) => {
    if (b.still.complete && b.still.naturalWidth) paint(b, b.still, b.still.naturalWidth, b.still.naturalHeight);
  };
  const paintFilm = (b: Blur) => {
    if (b.film && b.film.readyState >= 2) paint(b, b.film, b.film.videoWidth, b.film.videoHeight);
  };
  function sizeBlurs() {
    blurs.forEach((b) => {
      if (!b) return;
      const box = b.canvas.parentElement!; // the quarter-size media box
      b.canvas.width = Math.max(1, Math.round(box.clientWidth));
      b.canvas.height = Math.max(1, Math.round(box.clientHeight));
      paintStill(b);
      if (b.live) paintFilm(b);
    });
  }
  blurs.forEach((b) => b?.still.addEventListener("load", () => paintStill(b)));
  sizeBlurs();
  ScrollTrigger.addEventListener("refreshInit", sizeBlurs);

  // A film's backdrop follows its video while on screen (every other frame is plenty, blurred)
  let tick = 0;
  const followFilms = () => {
    if (tick++ % 2) return;
    blurs.forEach((b) => b?.live && paintFilm(b));
  };
  let following = false;
  const mask = caps.querySelector<HTMLElement>(".caps__next-mask");
  const home = carried.parentElement!;
  const finaleK = cards.findIndex((c) => c.hasAttribute("data-work-finale"));
  const marker = document.querySelector<HTMLElement>("[data-chapter-index]");
  const cta = root.querySelector<HTMLElement>("[data-work-cta]");
  const ctaWords = Array.from(root.querySelectorAll<HTMLElement>("[data-work-cta-word]"));
  const ctaChars = Array.from(root.querySelectorAll<HTMLElement>("[data-work-cta-char]"));
  const ctaAction = root.querySelector<HTMLElement>("[data-work-cta-action]");

  // --- Geometry: every card's size at the foreground (depth 0), and the camera ------------
  let geo: Geo = measure();
  function measure(): Geo {
    const w = window.innerWidth;
    const h = stage!.clientHeight || window.innerHeight;
    const phone = w < 768;
    // (a step larger than they were — the work is what the section is for: phone list ≈ +15%,
    // desktop ≈ +7%, each still capped so a picture never crowds the title or the frame)
    const unit = list ? Math.min(h * 0.41, w * 0.76) : phone ? Math.min(h * 0.32, w * 0.6) : Math.min(h * 0.5, w * 0.36);
    const maxW = w * (list ? 0.76 : phone ? 0.72 : 0.42);
    const maxH = h * (list ? 0.5 : phone ? 0.4 : 0.5);
    // The phone SLIDER: one card for every project, the same size — the site's column wide
    // (gutter to gutter), a portrait frame held clear of the header and the marker
    const gutter = parseFloat(getComputedStyle(root!).getPropertyValue("--hp-gutter")) || Math.max(16, w * 0.053);
    // the card in front is narrower than the column, so the projects either side of it show
    // at the edges — enough of each to read the section as a slider
    void gutter;
    const slideW = Math.round(w * 0.7);
    // under the title and its line (as on desktop, the lockup heads the frame), clear of the
    // invitation and the chapter marker at the foot
    // The whole group — the title and its line, the card, the invitation under it — sits at
    // the middle of the screen on any phone, clear of the header above and the chapter marker
    // below; the card takes what height the group can spare, up to its 4:5.
    const lockup = root!.querySelector<HTMLElement>("[data-work-marquee]");
    let slideTop = h * 0.3;
    let slideH = slideW * 1.25;
    if (list) {
      const headerH = document.querySelector<HTMLElement>(".site-header__inner")?.offsetHeight || 64;
      const lockH = lockup?.offsetHeight ?? 0;
      const gapA = Math.max(14, h * 0.022); // title → card
      // card → the foot of the invitation's line under it, as it actually stands (its offset
      // under the card plus its own height)
      const more = root!.querySelector<HTMLElement>("[data-work-more]");
      const holder = more?.offsetParent as HTMLElement | null;
      const moreH = more && holder ? more.offsetTop - holder.offsetHeight + more.offsetHeight : 42;
      const top = headerH + 8;
      // the chapter marker's own top (it is fixed to the foot of the screen), or its usual band
      const markerTop = marker?.getBoundingClientRect().top;
      const bottom = markerTop && markerTop > h * 0.6 ? h - markerTop + 8 : Math.max(48, h * 0.075);
      const room = h - top - bottom;
      slideH = Math.max(120, Math.min(slideW * 1.25, room - lockH - gapA - moreH));
      const groupH = lockH + gapA + slideH + moreH;
      // centred in the band the eye reads it in — between the header and the chapter marker
      const groupTop = Math.max(top, top + (room - groupH) / 2);
      if (lockup) lockup.style.top = `${groupTop}px`;
      slideTop = groupTop + lockH + gapA;
    } else if (lockup) lockup.style.top = "";
    const sizes = cards.map((card) => {
      if (list) {
        card.style.width = `${slideW}px`;
        card.style.height = `${slideH}px`;
        return { w: slideW, h: slideH };
      }
      const style = getComputedStyle(card);
      const aspect = parseFloat(style.getPropertyValue("--aspect")) || 1;
      const scale = parseFloat(style.getPropertyValue("--scale")) || 1;
      let cw = unit * scale * Math.sqrt(aspect) * 0.9;
      let ch = cw / aspect;
      const fit = Math.min(1, maxW / cw, maxH / ch); // never crop: shrink to fit the frame
      cw *= fit;
      ch *= fit;
      card.style.width = `${cw}px`;
      card.style.height = `${ch}px`;
      return { w: cw, h: ch };
    });
    const perspective = Math.max(w, h) * m.space.perspective;
    space!.style.perspective = `${perspective}px`;
    return { w, h, cx: w / 2, cy: list ? slideTop + slideH / 2 : h * (phone ? 0.58 : 0.6), perspective, gap: perspective * m.space.gap, spread: phone ? m.spread.phone : 1, sizes };
  }
  ScrollTrigger.addEventListener("refreshInit", () => {
    geo = measure();
  });
  // (and again once the fonts are in: the title's height decides where the phone's group sits)
  if (list) document.fonts?.ready.then(() => {
    geo = measure();
    render(lastP);
  });

  /** Project 01's rectangle in the foreground — where the capability window lands. */
  const frontRect = () => {
    const { w, h } = geo.sizes[0];
    const left = geo.cx - w / 2;
    return { top: geo.cy - h / 2, left, bottom: geo.h - (geo.cy + h / 2), right: geo.w - (left + w) };
  };
  /* The phone slider's own state: the project in front (`cur`), the one it is covering
     (`prev`), the change's progress (`t`, 1 at rest) and its direction (1: in from the right). */
  // (every project AND the finale, 07, a slide like the others: it is the last stop of the
  // strip, and only from there does the page go on to the call to action)
  const slideCount = list ? n : 0;
  // (`from`/`to`: the strip's position before and after the change, on an unwrapped count — so
  // round from the last to the first it still moves one step, not back across them all)
  const slider = { cur: 0, prev: -1, t: 1, dir: 1, from: 0, to: 0 };
  let lastP = 0;
  let onSliderEnd: (() => void) | null = null;
  let ended = false;
  let sliderLive = false;
  let change: gsap.core.Tween | null = null;
  let clock = 0;
  const arm = () => {
    window.clearTimeout(clock);
    clock = window.setTimeout(() => {
      // only while the slider is on screen and the page in view; otherwise look again shortly
      if (!sliderLive || document.hidden) return void arm();
      // on through the projects in order; after the last, on out to the finale and the call
      // to action (film.ts carries the page there)
      // (once a visit: a reader who has come back up from there is left to look)
      if (slider.cur < slideCount - 1) goTo(1);
      else if (!ended) {
        ended = true;
        onSliderEnd?.();
      } else arm();
    }, SLIDER.every * 1000);
  };

  /** One step of the strip, `d` (±1): on by its clock, a sideways swipe, or a vertical one. */
  function goTo(d: number) {
    if (!slideCount) return;
    // in order, no wrapping: the strip stops at either end (past the last is the finale's)
    if (slider.cur + d < 0 || slider.cur + d > slideCount - 1) return;
    change?.progress(1).kill(); // a change still running finishes at once, then this one starts
    slider.from = slider.to;
    slider.to = slider.from + d;
    slider.prev = slider.cur;
    slider.cur = slider.to;
    slider.dir = d;
    slider.t = 0;
    change = gsap.to(slider, {
      t: 1,
      duration: SLIDER.change,
      ease: "none",
      onUpdate: () => render(lastP),
      onComplete: () => {
        slider.prev = -1;
        render(lastP);
      },
    });
    arm(); // the clock counts from the latest change, the reader's or its own
  }
  /**
   * A vertical step while the slider holds: through the projects first, one a gesture, and only
   * past the last (or before the first) is it the page's — on to the finale, or back up.
   */
  function stepSlider(d: number) {
    // (a step taken mid-change finishes that change at once and starts this one — see `goTo` —
    // so a reader moving quickly through the projects is never held back)
    if (!sliderLive) return false;
    if (d > 0 && slider.cur < slideCount - 1) return goTo(1), true;
    if (d < 0 && slider.cur > 0) return goTo(-1), true;
    // on from the finale, straight to the call to action (no stop between, where the finale
    // stood still and took no swipe); and its clock will not send the reader there again
    if (d > 0 && onSliderEnd) {
      ended = true;
      onSliderEnd();
      return true;
    }
    return false;
  }
  function resetSlider() {
    change?.kill();
    change = null;
    Object.assign(slider, { cur: 0, prev: -1, t: 1, dir: 1, from: 0, to: 0 });
    ended = false;
  }
  if (list) {
    arm();
    // a sideways swipe over the slider moves it by hand (the vertical stepper leaves those alone)
    let sx = 0;
    let sy = 0;
    let swiping = false;
    window.addEventListener(
      "touchstart",
      (e) => {
        swiping = sliderLive;
        sx = e.touches[0]?.clientX ?? 0;
        sy = e.touches[0]?.clientY ?? 0;
      },
      { capture: true, passive: true },
    );
    window.addEventListener(
      "touchend",
      (e) => {
        if (!swiping || !sliderLive) return;
        const t = e.changedTouches[0];
        if (!t) return;
        const dx = t.clientX - sx;
        const dy = t.clientY - sy;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) goTo(dx < 0 ? 1 : -1);
      },
      { capture: true, passive: true },
    );
  }
  /** The phone list's place along the journey: 0 at project 01, n-1 at the last — linear,
      as a scrolled page is. */
  const listAt = (p: number) => clamp((p - m.travel.start) / (m.travel.end - m.travel.start)) * (n - 1);
  let shownTitle = -1;

  /** The camera's position along the sequence: 0 at project 01, n-1 at the last. */
  function cameraAt(p: number): number {
    const u = clamp((p - m.travel.start) / (m.travel.end - m.travel.start)) * (n - 1);
    const i = Math.min(Math.floor(u), n - 2);
    const f = u - i;
    return i + f - (m.travel.ease * Math.sin(2 * Math.PI * f)) / (2 * Math.PI);
  }

  // Carries the capability window's film into project 01 (and back again when scrolled up)
  function adopt(on: boolean) {
    const target = on ? visuals[0] : home;
    if (carried!.parentElement !== target) target.appendChild(carried!);
  }

  const handoff = m.morph.end;
  const S = m.space;
  function render(p: number) {
    const handed = p >= handoff;
    adopt(handed);
    frame!.style.visibility = handed ? "hidden" : "";

    const a = cameraAt(p);
    const arrive = easeOut(clamp((p - m.arrive.start) / (m.arrive.end - m.arrive.start)));
    const titleIn = easeInOut(clamp((p - m.titleIn.start) / (m.titleIn.end - m.titleIn.start)));
    const { w, h, cx, cy, perspective: P, gap: D } = geo;
    const F = m.finale;
    const opening = easeInOut(clamp((p - F.expand[0]) / (F.expand[1] - F.expand[0])));
    const dissolve = smooth(F.dissolve[0], F.dissolve[1], p);

    // The camera pans to line up with the project it is travelling toward…
    const panAt = (t: number) => {
      const i0 = Math.min(Math.floor(t), n - 1);
      const f = t - i0;
      const [ax0, ay0] = m.offsets[i0 % m.offsets.length];
      const [ax1, ay1] = m.offsets[Math.min(i0 + 1, n - 1) % m.offsets.length];
      return [ax0 + (ax1 - ax0) * f, ay0 + (ay1 - ay0) * f];
    };
    // …and drifts a little as it goes (none at the hand-off, so the landing is exact)
    space!.style.perspectiveOrigin = `${cx + Math.sin(a * 1.1) * w * S.sway.x}px ${cy + (1 - Math.cos(a * 0.8)) * h * S.sway.y}px`;

    const u = listAt(p);
    lastP = p;
    // the phone slider: back to the first project before the hold (so the window from What We Do
    // lands on it), on its clock through the hold
    // (with the same give as `sliderLive`: the carry lands a hair short of the hold's start, and
    // a strict edge there reset the slider on every frame — it never left its first project)
    const holdFrom = m.travel.start - 0.002;
    if (list && p < holdFrom && (slider.cur !== 0 || slider.prev >= 0 || slider.to !== 0)) resetSlider();
    const slide = easeInOut(slider.t);
    // leaving the hold for the call to action the strip stands on the finale — it normally
    // already does (the page only goes on from there), this only makes certain of it
    const leave = list ? easeInOut(clamp((p - (m.travel.start + 0.002)) / (m.travel.end - m.travel.start - 0.002))) : 0;
    const strip = slider.from + (slider.to - slider.from) * slide;
    const pos = strip + (finaleK - strip) * leave;
    sliderLive = list && p >= holdFrom && leave === 0;
    // On a phone the running chapter marker ("03 — Work") steps aside once the finale has
    // opened into the call to action, and comes back on the way up
    marker?.classList.toggle("is-out", list && opening > 0.5);
    cards.forEach((card, k) => {
      if (list) {
        // THE PHONE SLIDER: a strip under the title — the project in front at the centre, the
        // ones before and after it smaller and darker at either edge — moving one card a change,
        // each picture drifting a little inside its frame as it travels. The finale is its last
        // card, and opens out to the call to action from the centre once the page goes on.
        const size = geo.sizes[k];
        const fin = k === finaleK;
        const gap = w * 0.035;
        let o: number;
        const alpha0 = (k === 0 ? (handed ? 1 : 0) : arrive) * (fin ? 1 : 1 - opening);
        let alpha = alpha0;
        o = k - pos;
        const far = Math.min(1, Math.abs(o));
        let x = (w - size.w) / 2 + o * (size.w + gap);
        let y = cy - size.h / 2;
        let shown = alpha > 0.001 && Math.abs(o) < 1.5;
        let scale = 1 - 0.14 * far;
        if (fin) {
          // the finale opens out from its place to the whole frame, as on desktop
          card.style.width = `${size.w + (w - size.w) * opening}px`;
          card.style.height = `${size.h + (h - size.h) * opening}px`;
          x += (0 - x) * opening;
          y += (0 - y) * opening;
          scale = (1 - 0.14 * far) * (1 + F.grow * dissolve);
          alpha *= 1 - dissolve;
          shown = alpha > 0.001 && Math.abs(o) < 1.5 && dissolve < 1;
        }
        gsap.set(card, {
          x,
          y,
          z: 0,
          scale,
          rotationY: 0,
          zIndex: fin ? (opening > 0 ? 3000 : 1200) : 1100 - Math.round(Math.abs(o) * 50),
          opacity: alpha,
          visibility: shown ? "visible" : "hidden",
        });
        const shell = slides[k];
        if (shell) shell.style.clipPath = "";
        gsap.set(visuals[k], { xPercent: clamp(o, -1.5, 1.5) * -10, yPercent: 0 });
        if (dims[k]) dims[k]!.style.opacity = String(0.6 * far);
        if (captions[k]) captions[k]!.style.opacity = "0"; // the title over the slider names it
        const more = mores[k];
        if (more) {
          const near = !fin ? (1 - clamp(Math.abs(o) * 2.5)) * (k === 0 ? titleIn : 1) * (1 - leave) : 0;
          more.style.opacity = String(near);
          more.style.pointerEvents = shown && near > 0.6 ? "auto" : "none";
        }
        return;
      }
      // Depth relative to the camera: 0 = foreground, negative = far away, positive = passing
      let z = (a - k) * D;
      let alpha = 1;
      if (k === 0) alpha = handed ? 1 : 0;
      else {
        z -= (1 - arrive) * D * 1.2; // the projects behind come into view from deeper still
        alpha = arrive;
      }
      alpha *= smooth(-S.fadeIn[0] * D, -S.fadeIn[1] * D, z); // out of the far distance
      const solid = S.solid.includes(k);
      if (!solid) alpha *= 1 - smooth(S.pass[0] * P, S.pass[1] * P, z); // past the camera

      // Once the next project is in front, a project that has passed the camera keeps its
      // line out of frame (the camera's later pans no longer swing it back into view)
      const [camX, camY] = panAt(Math.min(a, k + 1));
      const [wx, wy] = m.offsets[k % m.offsets.length];
      const ox = (wx - camX) * geo.spread;
      const oy = wy - camY;
      const size = geo.sizes[k];
      // A solid project leaves by passing the camera: gone once it is wholly out of frame
      const reach = P / Math.max(P - z, 1);
      const outOfFrame = z > 0 && Math.abs(ox * w) * reach - (size.w / 2) * reach > w / 2;
      let shown = alpha > 0.001 && z < P * 0.92 && !(solid && outOfFrame);
      let x = cx + ox * w - size.w / 2;
      let y = cy + oy * h - size.h / 2;
      let turn = -ox * m.turn;
      let scale = 1;
      if (k === finaleK) {
        // The finale doesn't pass the camera: it opens out from its card to the whole frame…
        const cw = size.w + (w - size.w) * opening;
        const ch = size.h + (h - size.h) * opening;
        card.style.width = `${cw}px`;
        card.style.height = `${ch}px`;
        x += (0 - x) * opening;
        y += (0 - y) * opening;
        z *= 1 - opening;
        turn *= 1 - opening;
        // …then its sharp image gives way to its own blurred backdrop, growing onto its framing
        scale = 1 + F.grow * dissolve;
        alpha *= 1 - dissolve;
        shown = shown && dissolve < 1;
      }
      gsap.set(card, {
        x,
        y,
        z,
        scale,
        rotationY: turn,
        zIndex: 1000 + Math.round(z / 10),
        opacity: alpha,
        visibility: shown ? "visible" : "hidden",
      });
      gsap.set(visuals[k], { yPercent: clamp(z / D, -1, 1) * -m.parallax });
      if (dims[k]) dims[k]!.style.opacity = String(clamp(-z / (2.2 * D)) * S.haze);
      if (captions[k]) {
        const near = 1 - clamp(Math.abs(z) / (0.3 * D));
        captions[k]!.style.opacity = String(near * (k === 0 ? titleIn : 1) * (k === finaleK ? 1 - opening : 1));
      }
      // View Project Details: with the caption, and clickable only while its project is in front
      const more = mores[k];
      if (more) {
        const shownMore = (1 - clamp(Math.abs(z) / (0.3 * D))) * (k === 0 ? titleIn : 1);
        more.style.opacity = String(shownMore);
        more.style.pointerEvents = shown && shownMore > 0.6 ? "auto" : "none";
      }
    });


    // The backdrop: the foreground project's media fills the frame, blurred; the next one's
    // takes over as the camera arrives there (drawn on top, so the frame never dips between
    // the two). In the phone list "arriving" is the list's own position, so the light changes
    // as each picture comes to the middle — the same layers, the same fades.
    if (backdrop) backdrop.style.opacity = String(smooth(m.backdrop.in[0], m.backdrop.in[1], p));
    if (list) {
      // the phone slider's light: the project in front, the incoming one fading in over it
      // with its wipe, and the finale's over both as it comes
      const base = slider.prev >= 0 && slide < 1 ? slider.prev : slider.cur;
      const over = slider.prev >= 0 && slide < 1 ? slider.cur : -1;
      const overO = slide;
      backdrops.forEach((layer, k) => {
        const o = k === over ? overO : k === base ? 1 : 0;
        gsap.set(layer, { opacity: o, scale: 1 + (k === over ? (1 - overO) * m.backdrop.depth : 0), zIndex: k === over ? 2 : k === base ? 1 : 0 });
        const b = blurs[k];
        if (b) b.live = o > 0 && !!b.film;
      });
    } else {
      const along = a;
      const front = Math.min(Math.floor(along), n - 1);
      const step = along - front;
      backdrops.forEach((layer, k) => {
        const o = k === front ? 1 : k === front + 1 ? smooth(m.backdrop.fade[0], m.backdrop.fade[1], step) : 0;
        gsap.set(layer, { opacity: o, scale: 1 + clamp(along - k, -1, 1) * m.backdrop.depth, zIndex: k });
        const b = blurs[k];
        if (b) b.live = o > 0 && !!b.film;
      });
    }
    // Follow the films only while one of their backdrops is on screen
    const live = blurs.some((b) => b?.live);
    if (live && !following) gsap.ticker.add(followFilms);
    else if (!live && following) gsap.ticker.remove(followFilms);
    following = live;

    // The title rolls through its mask with the camera; the first one rises in as the space opens
    // and the finale's rolls away as it opens out into the call to action
    const titleOut = easeInOut(clamp((p - F.titleOut[0]) / (F.titleOut[1] - F.titleOut[0])));
    if (list) {
      // One title at the middle: the project nearest it. While the first rises in and the
      // finale's rolls away it follows the scroll; between, a change of project rolls the old
      // name up out of the mask and the new one in from below, on its own short clock.
      // …taken over by the next project as its picture's top edge reaches the middle line
      // (the next one's name as its picture has half covered the frame)
      // (on the slider: the project the change is bringing in, from the change's start; the
      // finale's once its wipe is half across) — the title and its line roll together
      const active = leave > 0.5 ? finaleK : slider.cur;
      const before = (k: number) => (active === finaleK ? k !== finaleK : slider.dir > 0 ? k !== active && k === slider.prev : k !== active && k !== slider.prev);
      const scrubbed = titleIn < 1 || titleOut > 0;
      if (scrubbed) {
        [titles, metas].forEach((set, j) =>
          set.forEach((el, k) => {
            gsap.killTweensOf(el);
            const v = k === active ? 1 - titleIn - titleOut : before(k) ? -1 : 1;
            gsap.set(el, { yPercent: clamp(v, -1, 1) * (j ? 110 : 105) });
          }),
        );
      } else if (active !== shownTitle) {
        // only the two names in the change move: the one leaving rolls out the way the slider
        // is going, the new one rolls in from the other side; every other waits out of sight
        const fwd = active === finaleK || slider.dir > 0;
        [titles, metas].forEach((set, j) => {
          const off = j ? 110 : 105;
          set.forEach((el, k) => {
            if (k === active) {
              gsap.fromTo(el, { yPercent: (fwd ? 1 : -1) * off }, { yPercent: 0, ...TITLE_SWAP, overwrite: true });
            } else if (k === shownTitle) {
              gsap.to(el, { yPercent: (fwd ? -1 : 1) * off, ...TITLE_SWAP, overwrite: true });
            } else {
              gsap.killTweensOf(el);
              gsap.set(el, { yPercent: off });
            }
          });
        });
      }
      shownTitle = active;
      if (counter) {
        counter.textContent = String(active + 1).padStart(2, "0");
        const counts = counter.parentElement;
        if (counts) counts.style.opacity = String(titleIn * (1 - titleOut));
      }
      return;
    }
    titles.forEach((title, k) => {
      const v = clamp((k - a) * 1.8 + (1 - titleIn) - titleOut, -1, 1);
      gsap.set(title, { yPercent: v * 105 });
      gsap.set(metas[k], { yPercent: v * 110 });
    });
  }

  // Resting state: nothing of the sequence shows until the beat starts
  gsap.set(cards, { autoAlpha: 0 });
  gsap.set(titles, { yPercent: 105 });
  gsap.set(metas, { yPercent: 110 });

  const tl = gsap.timeline({ defaults: { ease: "none" } });

  // 1 · WORK: the last letter leaves first, each one travelling all the way off its edge
  const L = m.letters;
  // Letters travel past their mask's sides — open them for the exit
  if (mask) tl.fromTo(mask, { clipPath: "inset(-0.4em -0.4em 0em -0.4em)" }, { clipPath: "none", duration: 0.001, immediateRender: false }, 0);
  letters.forEach((letter, i) => {
    const order = letters.length - 1 - i; // K first
    const dir = L.dirs[i] ?? 1;
    tl.fromTo(
      letter,
      { x: 0 },
      {
        x: () => {
          const r = letter.getBoundingClientRect();
          const left = r.left - (Number(gsap.getProperty(letter, "x")) || 0);
          return dir > 0 ? window.innerWidth - left + 24 : -(left + r.width + 24);
        },
        duration: dur(L.start + order * L.stagger, L.each),
        ease: L.ease,
        immediateRender: false,
      },
      at(L.start + order * L.stagger),
    );
  });

  // Nothing of the earlier chapters may show around the window once it starts to contract
  if (underneath) tl.fromTo(underneath, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.001, immediateRender: false }, at(m.morph.start));

  // 2 · The capability window contracts into project 01's card, the shade lifting off it
  //   (through custom properties the stylesheet reads, never the edges themselves: a tween on
  //   `top`/`bottom` left its values inline as fixed pixels after every refresh, which then
  //   overrode the window the stylesheet defines — the What We Do pictures sat in a frame of
  //   the height the page had when it was measured, not the one the caption stands in. See
  //   `--caps-to-*` in capabilities.css.)
  const morph = { top: 0, right: 0, bottom: 0, left: 0 };
  const EDGES = ["top", "right", "bottom", "left"] as const;
  // (written from where the tween really stands, not from its callbacks alone: a refresh
  // renders the film through and back with events held, which left the props at its start)
  const syncMorph = () => {
    if (contract.progress() > 0) EDGES.forEach((k) => frame.style.setProperty(`--caps-to-${k}`, `${morph[k]}px`));
    else EDGES.forEach((k) => frame.style.removeProperty(`--caps-to-${k}`));
  };
  const contract = gsap.fromTo(
    morph,
    { top: 0, right: 0, bottom: 0, left: 0 },
    {
      top: () => frontRect().top,
      right: () => frontRect().right,
      bottom: () => frontRect().bottom,
      left: () => frontRect().left,
      duration: dur(m.morph.start, m.morph.end - m.morph.start),
      ease: m.morph.ease,
      immediateRender: false,
      paused: true,
      onUpdate: () => syncMorph(),
      onReverseComplete: () => syncMorph(),
    },
  );
  ScrollTrigger.addEventListener("refresh", syncMorph);
  tl.add(contract.paused(false), at(m.morph.start)).to(caps.querySelector("[data-caps-shade]"), { opacity: 0, duration: dur(m.morph.start, (m.morph.end - m.morph.start) * 0.6) }, at(m.morph.start));

  // 5 · The call to action: the headline comes forward out of depth behind the opening card —
  //     MAKE SOMETHING a word at a time, then TOGETHER. a letter at a time from further back,
  //     every piece landing flat and sharp in its place; then the way to get in touch
  const F = m.finale;
  gsap.set(ctaWords, { z: F.words.from, autoAlpha: 0 });
  gsap.set(ctaChars, { z: F.chars.from, autoAlpha: 0 });
  if (ctaAction) gsap.set(ctaAction, { autoAlpha: 0, y: 18 });
  ctaWords.forEach((word, i) => {
    const f = F.words.start + i * F.words.stagger;
    tl.to(word, { z: 0, duration: dur(f, F.words.each), ease: "power3.out" }, at(f)).to(word, { autoAlpha: 1, duration: dur(f, F.words.each * 0.45) }, at(f));
  });
  ctaChars.forEach((char, i) => {
    const f = F.chars.start + i * F.chars.stagger;
    tl.to(char, { z: 0, duration: dur(f, F.chars.each), ease: "power3.out" }, at(f)).to(char, { autoAlpha: 1, duration: dur(f, F.chars.each * 0.45) }, at(f));
  });
  if (ctaAction)
    tl.to(ctaAction, {
      autoAlpha: 1,
      y: 0,
      duration: dur(F.action[0], F.action[1] - F.action[0]),
      ease: "power3.out",
      // the link only takes the pointer once it has arrived
      onUpdate: () => cta?.classList.toggle("is-live", Number(gsap.getProperty(ctaAction, "opacity")) > 0.9),
    }, at(F.action[0]));

  let replay: gsap.core.Timeline | null = null;
  const settleCta = () => {
    replay?.progress(1).kill();
    replay = null;
  };
  const hideCta = () => {
    settleCta();
    gsap.set(ctaWords, { z: F.words.from, autoAlpha: 0 });
    gsap.set(ctaChars, { z: F.chars.from, autoAlpha: 0 });
    if (ctaAction) gsap.set(ctaAction, { autoAlpha: 0, y: 18 });
    cta?.classList.remove("is-live");
  };
  const replayCta = (seconds: number) => {
    settleCta();
    const f0 = F.words.start;
    const k = seconds / (F.action[1] - f0);
    const r = gsap.timeline({ onComplete: () => void (replay = null) });
    ctaWords.forEach((word, i) => {
      const t = i * F.words.stagger * k;
      r.to(word, { z: 0, duration: F.words.each * k, ease: "power3.out" }, t).to(word, { autoAlpha: 1, duration: F.words.each * 0.45 * k }, t);
    });
    ctaChars.forEach((char, i) => {
      const t = (F.chars.start - f0 + i * F.chars.stagger) * k;
      r.to(char, { z: 0, duration: F.chars.each * k, ease: "power3.out" }, t).to(char, { autoAlpha: 1, duration: F.chars.each * 0.45 * k }, t);
    });
    if (ctaAction)
      r.to(ctaAction, {
        autoAlpha: 1,
        y: 0,
        duration: (F.action[1] - F.action[0]) * k,
        ease: "power3.out",
        onComplete: () => cta?.classList.add("is-live"),
      }, (F.action[0] - f0) * k);
    replay = r;
  };

  // 3–4 · Everything else is placed from the beat's progress
  const state = { p: 0 };
  tl.fromTo(
    state,
    { p: 0 },
    {
      p: 1,
      duration: 1,
      immediateRender: false,
      onUpdate: () => render(from(state.p)),
      onReverseComplete: () => render(0),
    },
    0,
  );

  const videos = Array.from(root.querySelectorAll<HTMLVideoElement>("[data-work-video]:not([data-work-own])"));
  const rests = list ? [at(m.travel.start), at(m.travel.end)] : [];
  return { timeline: tl, videos, length, at, hideCta, replayCta, settleCta, slides: rests, stepSlider, setSliderEnd: (fn: () => void) => void (onSliderEnd = fn) };
}

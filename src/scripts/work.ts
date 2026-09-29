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
  // (Shares of a 14-screen beat — film.ts. Each project step is ~1.2 screens of scroll.)
  letters: { start: 0, each: 0.088, stagger: 0.0305, dirs: [-1, 1, 1, 1], ease: "power2.in" },
  morph: { start: 0.02, end: 0.149, ease: "power3.inOut" },
  arrive: { start: 0.149, end: 0.231 }, // the projects behind come into view from deeper still
  titleIn: { start: 0.163, end: 0.224 },
  // The camera's journey, one project per equal share of scroll — ending at the finale.
  // `ease` shapes each step: 0 = constant speed, higher = the camera slows (never stops)
  // as a project is in front.
  travel: { start: 0.2375, end: 0.752, ease: 0.5 },
  // The finale: it arrives like a project, then opens out to fill the frame, comes into its
  // blurred self (the call to action's background), and the headline comes forward out of
  // depth — MAKE SOMETHING word by word, then TOGETHER. letter by letter.
  finale: {
    titleOut: [0.752, 0.79], // its "Your Project" title rolls away as it starts to open
    expand: [0.752, 0.83], // the card opens out to the full frame
    dissolve: [0.8, 0.875], // …and its sharp image gives way to the blurred backdrop
    grow: 0.28, // as it dissolves it keeps growing, to land exactly on the backdrop's framing
    words: { start: 0.805, each: 0.075, stagger: 0.025, from: -1600 }, // depth (px) they come from
    chars: { start: 0.845, each: 0.065, stagger: 0.008, from: -2600 },
    action: [0.94, 0.975],
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
  // Each project's place in the space (× viewport), alternating sides so the next one is seen
  // waiting in the distance beside the current one rather than hidden behind it. The camera
  // pans to line up with each project as it travels, so the foreground project always sits
  // centred — and the one passing the camera slides out past its own edge of the frame.
  offsets: [
    [0, 0],
    [0.34, -0.07],
    [-0.33, 0.05],
    [0.34, -0.06],
    [-0.34, 0.06],
    [0.33, -0.05],
  ],
  spread: { phone: 1.45 }, // wider apart on narrow screens, where the cards fill more of the width
  turn: 22, // cards turn slightly toward the camera's axis: degrees per unit of offset
  parallax: 1.5, // media drift inside a card as it travels, % of its height
  // The blurred backdrop: the incoming project's takes over across this share of each step,
  // and each backdrop grows slightly as the camera moves toward (and past) its project.
  backdrop: { in: [0.183, 0.251], fade: [0.25, 0.75], depth: 0.08 }, // in: after WORK's last letter has left
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
}

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
  const visuals = cards.map((c) => c.querySelector<HTMLElement>("[data-work-media]")!);
  const dims = cards.map((c) => c.querySelector<HTMLElement>("[data-work-dim]"));
  const captions = cards.map((c) => c.querySelector<HTMLElement>("[data-work-caption]"));
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
    const unit = phone ? Math.min(h * 0.32, w * 0.6) : Math.min(h * 0.5, w * 0.36);
    const maxW = w * (phone ? 0.72 : 0.42);
    const maxH = h * (phone ? 0.4 : 0.5);
    const sizes = cards.map((card) => {
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
    return { w, h, cx: w / 2, cy: h * (phone ? 0.58 : 0.6), perspective, gap: perspective * m.space.gap, spread: phone ? m.spread.phone : 1, sizes };
  }
  ScrollTrigger.addEventListener("refreshInit", () => {
    geo = measure();
  });

  /** Project 01's rectangle in the foreground — where the capability window lands. */
  const frontRect = () => {
    const { w, h } = geo.sizes[0];
    return { top: geo.cy - h / 2, left: geo.cx - w / 2, bottom: geo.h - (geo.cy + h / 2), right: geo.w - (geo.cx + w / 2) };
  };

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

    cards.forEach((card, k) => {
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
    });

    // The backdrop: the foreground project's media fills the frame; the next one's takes over
    // as the camera arrives there (drawn on top, so the frame never dips between the two)
    if (backdrop) backdrop.style.opacity = String(smooth(m.backdrop.in[0], m.backdrop.in[1], p));
    const front = Math.min(Math.floor(a), n - 1);
    const step = a - front;
    backdrops.forEach((layer, k) => {
      const o = k === front ? 1 : k === front + 1 ? smooth(m.backdrop.fade[0], m.backdrop.fade[1], step) : 0;
      gsap.set(layer, { opacity: o, scale: 1 + clamp(a - k, -1, 1) * m.backdrop.depth, zIndex: k });
      const b = blurs[k];
      if (b) b.live = o > 0 && !!b.film;
    });
    // Follow the films only while one of their backdrops is on screen
    const live = blurs.some((b) => b?.live);
    if (live && !following) gsap.ticker.add(followFilms);
    else if (!live && following) gsap.ticker.remove(followFilms);
    following = live;

    // The title rolls through its mask with the camera; the first one rises in as the space opens
    // and the finale's rolls away as it opens out into the call to action
    const titleOut = easeInOut(clamp((p - F.titleOut[0]) / (F.titleOut[1] - F.titleOut[0])));
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
        duration: L.each,
        ease: L.ease,
        immediateRender: false,
      },
      L.start + order * L.stagger,
    );
  });

  // Nothing of the earlier chapters may show around the window once it starts to contract
  if (underneath) tl.fromTo(underneath, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.001, immediateRender: false }, m.morph.start);

  // 2 · The capability window contracts into project 01's card, the shade lifting off it
  tl.fromTo(
    frame,
    { top: 0, right: 0, bottom: 0, left: 0 },
    {
      top: () => frontRect().top,
      right: () => frontRect().right,
      bottom: () => frontRect().bottom,
      left: () => frontRect().left,
      duration: m.morph.end - m.morph.start,
      ease: m.morph.ease,
      immediateRender: false,
    },
    m.morph.start,
  ).to(caps.querySelector("[data-caps-shade]"), { opacity: 0, duration: (m.morph.end - m.morph.start) * 0.6 }, m.morph.start);

  // 5 · The call to action: the headline comes forward out of depth behind the opening card —
  //     MAKE SOMETHING a word at a time, then TOGETHER. a letter at a time from further back,
  //     every piece landing flat and sharp in its place; then the way to get in touch
  const F = m.finale;
  gsap.set(ctaWords, { z: F.words.from, autoAlpha: 0 });
  gsap.set(ctaChars, { z: F.chars.from, autoAlpha: 0 });
  if (ctaAction) gsap.set(ctaAction, { autoAlpha: 0, y: 18 });
  ctaWords.forEach((word, i) => {
    const at = F.words.start + i * F.words.stagger;
    tl.to(word, { z: 0, duration: F.words.each, ease: "power3.out" }, at).to(word, { autoAlpha: 1, duration: F.words.each * 0.45 }, at);
  });
  ctaChars.forEach((char, i) => {
    const at = F.chars.start + i * F.chars.stagger;
    tl.to(char, { z: 0, duration: F.chars.each, ease: "power3.out" }, at).to(char, { autoAlpha: 1, duration: F.chars.each * 0.45 }, at);
  });
  if (ctaAction)
    tl.to(ctaAction, {
      autoAlpha: 1,
      y: 0,
      duration: F.action[1] - F.action[0],
      ease: "power3.out",
      // the link only takes the pointer once it has arrived
      onUpdate: () => cta?.classList.toggle("is-live", Number(gsap.getProperty(ctaAction, "opacity")) > 0.9),
    }, F.action[0]);

  // 3–4 · Everything else is placed from the beat's progress
  const state = { p: 0 };
  tl.fromTo(
    state,
    { p: 0 },
    {
      p: 1,
      duration: 1,
      immediateRender: false,
      onUpdate: () => render(state.p),
      onReverseComplete: () => render(0),
    },
    0,
  );

  const videos = Array.from(root.querySelectorAll<HTMLVideoElement>("[data-work-video]:not([data-work-own])"));
  return { timeline: tl, videos };
}

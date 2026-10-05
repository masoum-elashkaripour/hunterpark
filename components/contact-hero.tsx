"use client";

import { useEffect, useRef } from "react";
import { m, useSpring, useTransform } from "motion/react";
import { ScrollChars } from "@/components/scroll-chars";
import { useScrollY } from "@/components/use-beat";
import { GLOBE_PICTURES, globeSrc } from "@/lib/contact-globe";

/**
 * The opening of /contact — A GLOBE OF PICTURES.
 *
 * On load the reader sees a sphere made of the studio's photographs, turning
 * slowly. Then the words arrive in the middle of it, and as they do the
 * sphere OPENS — its radius grows until the pictures ring the edges of the
 * screen and the contact lines sit inside it.
 *
 * HOW. No WebGL and no CSS 3D: each picture is an ordinary <img>, placed on a
 * sphere computed here (a Fibonacci spread, so they are even without rows) and
 * projected to the screen every frame. They always face the reader, like
 * prints pinned to a turning ball; depth sets their size, their stacking and
 * how bright they are, so the far side reads as far. Only `transform` and
 * `opacity` change per frame — compositor work, nothing laid out.
 *
 * Once open, any picture that swings across the middle fades as it passes the
 * words, so the title is never behind a photograph. The loop skips its work
 * once the opening has scrolled out of play, and under reduced motion the
 * globe is simply drawn open and still.
 *
 * The words move both ways as on /about and /news: on load they rise in as
 * the globe opens; on scroll the title's letters leave one at a time and the
 * rest fades and lifts, while the globe itself fades back.
 */


/** How many tiles — the pictures, then round again, for an even surface. */
const COUNT = 40;
/** Seconds before the globe begins to open, and how long opening takes. */
const OPEN_AT = 1.6;
const OPEN_FOR = 2.2;
/**
 * The words arrive WITH the opening, ON THE GLOBE'S CLOCK: the globe marks the
 * section `data-opening` at the instant it starts to spread, and only then do
 * the words' animations start (see `.contact-hero__rise` in CSS). A CSS delay
 * alone counted from first paint while the globe counts from hydration, and
 * the gap between those — a second in development, more on a slow phone — put
 * the words ahead of the pictures. Each word takes the opening's own length
 * (2.2s), so words and globe finish arriving together, as one gesture.
 */
const WORDS_AT = 0;
/** The stagger between eyebrow, title, standfirst and call to action. */
const WORDS_STEP = 0.28;
/** Radians per second, and the axis's lean toward the reader. */
const SPIN = 0.16;
const LEAN = 0.32;

const TITLE = ["Let’s talk."];

/** The tiles' places on a unit sphere — Fibonacci, so evenly spread. */
const POINTS = Array.from({ length: COUNT }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / COUNT;
  const r = Math.sqrt(1 - y * y);
  const a = i * Math.PI * (3 - Math.sqrt(5));
  return { x: Math.cos(a) * r, y, z: Math.sin(a) * r };
});

const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The words' departure, in screens of scroll from the top. */
const LEAVE = { from: 0.03, to: 0.75 };

export function ContactHero() {
  const globeRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const section = globe.closest("section");
    let opened = false;
    const tiles = tileRefs.current;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let start = 0;
    let angle = 0;
    let last = 0;
    /* The pointer leans the globe a little — eased, so it drifts, never snaps. */
    const lean = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (e: PointerEvent) => {
      lean.tx = (e.clientX / window.innerWidth - 0.5) * 0.5;
      lean.ty = (e.clientY / window.innerHeight - 0.5) * 0.35;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      /* Out of play once the opening has scrolled well away — skip the work. */
      if (window.scrollY > window.innerHeight * 1.4) {
        last = now;
        return;
      }
      const vw = globe.clientWidth;
      const vh = globe.clientHeight;
      if (!start) start = now;
      const t = (now - start) / 1000;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;

      if (!still) angle += dt * SPIN;
      lean.x += (lean.tx - lean.x) * 0.04;
      lean.y += (lean.ty - lean.y) * 0.04;

      const open = still
        ? 1
        : ease(Math.min(1, Math.max(0, (t - OPEN_AT) / OPEN_FOR)));
      /* The words' cue — see `WORDS_AT`. */
      if (!opened && (still || t >= OPEN_AT)) {
        opened = true;
        section?.setAttribute("data-opening", "");
      }
      const short = Math.min(vw, vh);
      const narrow = vw < 700;
      /* Closed: a ball in the middle. Open: wide enough that the pictures ring
         the screen's edges around the words. */
      const R0 = short * (narrow ? 0.34 : 0.3);
      const R1 = Math.max(vw * (narrow ? 0.62 : 0.52), vh * 0.62);
      const R = R0 + (R1 - R0) * open;
      const D = R1 * 2.6;

      const ay = angle + lean.x;
      const ax = LEAN + lean.y;
      const cy = Math.cos(ay);
      const sy = Math.sin(ay);
      const cx = Math.cos(ax);
      const sx = Math.sin(ax);

      for (let i = 0; i < tiles.length; i++) {
        const el = tiles[i];
        if (!el) continue;
        const p = POINTS[i];
        const x1 = p.x * cy + p.z * sy;
        const z1 = -p.x * sy + p.z * cy;
        const y2 = p.y * cx - z1 * sx;
        const z2 = p.y * sx + z1 * cx;

        const k = D / (D - z2 * R);
        const px = x1 * R * k;
        const py = y2 * R * k;

        /* Arrival: each tile fades and grows in, staggered round the ball. */
        const appear = still ? 1 : smooth(0, 1, (t - 0.15 - i * 0.022) / 0.7);
        /* Depth: the far side smaller and dimmer. */
        const depth = (z2 + 1) / 2;
        let alpha = (0.28 + 0.72 * depth) * appear;
        /* Open: clear the middle for the words. */
        const d = Math.hypot(px / (vw * 0.5), py / (vh * 0.5));
        alpha *= 1 - open * (1 - smooth(0.42, 0.85, d)) * 0.94;

        const s = k * (0.55 + 0.45 * appear) * (narrow ? 1.35 : 1);
        el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
        el.style.opacity = alpha.toFixed(3);
        el.style.zIndex = String(Math.round(depth * 100));
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  const scrollY = useScrollY();
  const screens = useTransform(() => {
    /* Read first, always: a function transform subscribes to what it reads
       on its first run. */
    const y = scrollY.get();
    return typeof window === "undefined" ? 0 : y / window.innerHeight;
  });
  /* Followed through a soft spring, as the section below is. */
  const soft = useSpring(screens, { stiffness: 90, damping: 24, restDelta: 0.0002 });
  const leave = useTransform(soft, [LEAVE.from, LEAVE.to], [1, 0]);
  const fade = useTransform(soft, [LEAVE.from, LEAVE.to * 0.8], [1, 0]);
  const lift = useTransform(soft, [LEAVE.from, LEAVE.to], [0, -36]);
  /* The globe recedes as the next section's picture takes the frame. */
  const globeFade = useTransform(soft, [0.08, 1.25], [1, 0]);

  return (
    <section className="contact-hero" aria-labelledby="contact-heading">
      <m.div
        ref={globeRef}
        className="contact-globe"
        style={{ opacity: globeFade }}
        aria-hidden
      >
        {POINTS.map((_, i) => {
          const index = i % GLOBE_PICTURES.length;
          const pic = GLOBE_PICTURES[index];
          return (
            <span
              key={i}
              ref={(el) => {
                tileRefs.current[i] = el;
              }}
              className="contact-globe__tile"
              /* Which picture — `ContactReveal` reads it when it picks a
                 tile to fill the screen. */
              data-pic={index}
              style={{ aspectRatio: `${pic.w} / ${pic.h}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small
                  pre-sized thumbnails, positioned per frame; the optimiser
                  would only add forty requests */}
              <img
                src={globeSrc.thumb(pic)}
                alt=""
                width={pic.w}
                height={pic.h}
                decoding="async"
              />
            </span>
          );
        })}
      </m.div>

      <div className="contact-hero__content">
        <m.p className="hp-eyebrow" style={{ opacity: fade, y: lift }}>
          <span
            className="hero-rise contact-hero__rise"
            style={{ animationDelay: `${WORDS_AT}s` }}
          >
            Contact
          </span>
        </m.p>

        {/* Two motions, two elements, as on /about: the mask rises once on
            load; the glyphs inside it are driven by scroll. */}
        <h1 id="contact-heading" className="hp-display contact-hero__title">
          <span className="contact-hero__mask">
            <span
              className="hero-mask-rise contact-hero__rise"
              style={{ animationDelay: `${WORDS_AT + WORDS_STEP}s` }}
            >
              <ScrollChars lines={TITLE} progress={leave} from={-40} />
            </span>
          </span>
        </h1>

        <m.p
          className="hp-copy contact-hero__standfirst"
          style={{ opacity: fade, y: lift }}
        >
          <span
            className="hero-rise contact-hero__rise"
            style={{ animationDelay: `${WORDS_AT + WORDS_STEP * 2}s` }}
          >
            An idea, a brief, or just the urge to talk it through.
          </span>
        </m.p>

        {/* THE HEADER'S TICKET, markup and all, so it cannot drift. */}
        <m.div style={{ opacity: fade, y: lift }}>
          <div
            className="hero-rise contact-hero__rise"
            style={{ animationDelay: `${WORDS_AT + WORDS_STEP * 3}s` }}
          >
            {/* Glides to the form rather than jumping — a native anchor jump
                would cut straight across the whole opening. */}
            <a
              href="#contact-form"
              className="header-cta"
              onClick={(event) => {
                const target = document.getElementById("contact-form");
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "auto"
                    : "smooth",
                  block: "start",
                });
              }}
            >
              <span className="header-cta__label">
                <span className="header-cta__roll" data-text="Send a brief">
                  <span>Send a brief</span>
                </span>
              </span>
              <span className="header-cta__arrow" aria-hidden>
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  {/* Down, not across: it goes down the page, to the form. */}
                  <path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" />
                </svg>
              </span>
            </a>
          </div>
        </m.div>
      </div>
    </section>
  );
}

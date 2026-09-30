"use client";

import { useEffect, useRef, useState } from "react";
import {
  m,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { type Work } from "@/lib/works";
import { ScrollCharSwap } from "@/components/scroll-char-swap";

/**
 * Hero after charlesalexandertv.com: a full-viewport film with the lockup sat
 * on its bottom edge.
 *
 * Its mechanism is `position: sticky; top: 0` on a `100svh` block inside a
 * taller driver — the hero holds the frame while the page scrolls past it, and
 * that travel is what closes the chapter. The reference drives this with
 * ScrollTrigger; we read scroll position directly, so there is no second
 * animation library on the page.
 *
 * The reel is several clips shown as one film: every clip is mounted and only
 * the live one is opaque, so the next is already decoded when its turn comes
 * and the cut lands without a black frame. With a handful of clips that is
 * cheaper than it sounds and far steadier than swapping one element's `src`.
 */

/**
 * How much scrolling the chapter takes, in viewports.
 *
 * The driver is this plus the one screen the hero occupies, and the progress
 * mapping below reads the same number — change it in one place and the pinned
 * distance and the choreography stay in step.
 *
 * It used to be a full extra screen, which left a stretch of black nothing to
 * scroll through after the film had already gone. Half a screen is enough for
 * the close to breathe: past the point where the film has faded there is
 * nothing left to watch, so every pixel of scroll after it is dead.
 */
const CHAPTER = 0.5;

export function Work2Hero({ reel }: { reel: Work[] }) {
  const reduced = useReducedMotion();
  const driverRef = useRef<HTMLElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [live, setLive] = useState(0);

  /**
   * Progress is derived from RAW PAGE SCROLL, not from measuring an element.
   *
   * `useScroll({ target })` has to resolve the target's box against whatever
   * it decides the scroll container is, and in this layout it was not
   * resolving — progress never left 0, which is why the eyebrow and standfirst
   * kept sitting there through the whole chapter while the pieces that happen
   * to look right at 0 seemed fine. `scrollY` is the window's own scroll
   * position: nothing to measure, nothing to get wrong.
   *
   * The hero pins for exactly one viewport of scroll, so that distance IS the
   * chapter, and 0 → vh maps straight onto 0 → 1.
   */
  const { scrollY } = useScroll();
  const [viewport, setViewport] = useState(1);

  useEffect(() => {
    const read = () => setViewport(Math.max(window.innerHeight, 1));
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const scrollYProgress = useTransform(
    scrollY,
    [0, viewport * CHAPTER],
    [0, 1],
  );

  /**
   * The contraction, in two acts.
   *
   * At rest the film is full bleed — `inset: 0`, `object-fit: cover`, exactly
   * as `.hero__bg` is on the live site. Then:
   *
   *   1. the sides draw in and it becomes a centred panel;
   *   2. the panel shuts vertically until only a hairline of it is left.
   *
   * That hairline is the point: it lands on the same `hero__shutter` rule the
   * live site draws across the middle of the frame, so the chapter does not
   * fade out, it closes to a line and the next one opens from there.
   *
   * 49.6 rather than 50 on purpose — a true 50 is zero height and the line
   * disappears altogether.
   *
   * Five stops rather than three, weighted so the sides drift in slowly and
   * only close in the last stretch. A three-stop ramp read as a snap.
   */
  const insetY = useTransform(
    scrollYProgress,
    [0, 0.3, 0.55, 0.75, 0.9],
    [0, 2, 6, 22, 49.6],
  );
  const insetX = useTransform(
    scrollYProgress,
    [0, 0.3, 0.55, 0.75, 0.9],
    [0, 9, 20, 29, 34],
  );
  const clipPath = useMotionTemplate`inset(${insetY}% ${insetX}%)`;

  /* The panel rides up as it shuts, so the film leaves towards the title
     rather than collapsing where it stands. */
  const filmY = useTransform(scrollYProgress, [0.3, 0.9], ["0%", "-14%"]);

  /* Once it IS the line, the line goes too — otherwise a lit hairline is left
     sitting across the frame for the rest of the chapter. It finishes right at
     the end rather than early: the stretch between the film going and the
     chapter ending is a black frame with nothing in it. */
  const filmOpacity = useTransform(scrollYProgress, [0.86, 1], [1, 0]);

  /* The film itself eases back as the frame closes in, so the shot inside the
     panel is not the same crop blown up. */
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  /**
   * Everything around the title — eyebrow, standfirst, reel index — leaves
   * together, but late enough that the reel is still there to be used while
   * the hero is the hero. An earlier pass took it at 5%, which is why the
   * slider looked like it had been dropped.
   */
  const furnitureOpacity = useTransform(scrollYProgress, [0.28, 0.55], [1, 0]);

  /**
   * The lockup's clearance closes as the chapter does.
   *
   * At rest it sits well off the bottom edge so the type has air. By the end
   * that clearance is the gap between the title and the index arriving beneath
   * it, so it is given back.
   *
   * This replaces an earlier `titleY` that lifted the lockup as the chapter
   * closed. That was backwards: raising the title only widened the space
   * between it and the grid, which is the space it was supposed to be closing.
   */
  const lockupPad = useTransform(scrollYProgress, [0.45, 1], [112, 20]);

  /**
   * The standfirst also has to stop TAKING UP ROOM, not just stop being
   * visible: at `opacity: 0` it still holds its place, and that reserved space
   * was most of the gap between the title and the grid.
   *
   * Their natural height is measured once and then driven to zero, so the
   * collapse is exact rather than a guessed number.
   */
  const furnitureRef = useRef<HTMLDivElement>(null);
  const [furnitureHeight, setFurnitureHeight] = useState(0);

  useEffect(() => {
    const el = furnitureRef.current;
    if (!el) return;

    const read = () => setFurnitureHeight(el.offsetHeight);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /**
   * Reclaimed with a negative margin rather than by clipping a fixed height.
   *
   * The height version clipped the standfirst in half: it was measured before
   * the webfont landed, and `useTransform` only recomputes when its SOURCE
   * moves — so until the reader scrolled, the box kept the stale, too-short
   * height and `overflow: hidden` cut the second line through the glyphs.
   *
   * A margin cannot cut anything. If the measurement is stale the worst case
   * is that some space is not reclaimed, which nobody sees, instead of a
   * sentence sliced in half, which everybody does.
   */
  const furnitureMargin = useTransform(
    scrollYProgress,
    [0.28, 0.55],
    [0, -furnitureHeight],
  );

  useEffect(() => {
    const el = videoRefs.current[live];
    if (!el) return;

    el.currentTime = 0;
    void el.play().catch(() => {
      /* Autoplay refused — the poster holds. */
    });

    // Warm the next clip so its first frame is ready at the cut.
    const next = videoRefs.current[(live + 1) % reel.length];
    next?.load();
  }, [live, reel.length]);

  return (
    /* Two screens tall: the first is the hero at rest, the second is the
       distance the chapter takes to close. The hero pins for both. */
    <section ref={driverRef} className="relative h-[150svh]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-end overflow-hidden">
        <m.div
          className="absolute inset-0 -z-10"
          style={{ clipPath, scale, y: filmY, opacity: filmOpacity }}
        >
          {reel.map((work, i) => (
            <video
              key={work.slug}
              ref={(el) => {
                videoRefs.current[i] = el;
              }}
              src={work.video}
              poster={work.poster}
              muted
              playsInline
              // No `loop`: the reel advances on `ended` and wraps itself.
              preload={i === 0 ? "auto" : "none"}
              aria-hidden
              onEnded={() => setLive((n) => (n + 1) % reel.length)}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-hp-out ${
                i === live ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}

          {/* The lockup sits on footage, so it needs its own ground to stay
            legible whatever frame is under it. */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to top, var(--hp-night) 0%, color-mix(in oklab, var(--hp-night) 55%, transparent) 38%, transparent 70%)",
            }}
          />
        </m.div>

        {/* Sat well clear of the bottom edge rather than tight against it.
            The frame has the room — using it is what lets the title and the
            standfirst stay at full size without crowding the reel below.
            Below `lg` the reel drops under the lockup rather than beside it,
            so there the clearance has to be larger still. */}
        <m.div
          className="relative px-gutter"
          style={{ paddingBottom: lockupPad }}
        >
          <m.p className="hp-eyebrow" style={{ opacity: furnitureOpacity }}>
            Selected films
          </m.p>

          {/* On load the words rise out of their masks — the hero lockup's own
            treatment on the live site. On scroll the line then trades itself
            for the next chapter's, a glyph at a time.
            The swap itself always runs: it is coupled to scroll, so the reader
            drives it. Only the one-off rise on load is a reduced-motion call. */}
          <h1 className="hp-display mt-4 text-[clamp(2.75rem,8vw,7rem)]">
            {/* Two motions on one line, so they are kept on separate elements:
                the wrapper rises out of its mask once, on load; the glyphs
                inside it are driven by scroll. Putting both on the same node
                would have them fight over `y`. */}
            <span className="block overflow-hidden">
              <m.span
                className="block"
                initial={{ y: reduced ? "0%" : "110%" }}
                animate={{ y: "0%" }}
                transition={{
                  duration: reduced ? 0 : 1,
                  ease: [0.19, 1, 0.22, 1],
                  delay: reduced ? 0 : 0.35,
                }}
              >
                <ScrollCharSwap
                  from="Work that moves"
                  to="Selected cases"
                  progress={scrollYProgress}
                  /* After the standfirst has cleared, so the two changes read
                     one after the other rather than on top of each other. */
                  start={0.42}
                />
              </m.span>
            </span>
          </h1>

          {/* Fades, then pulls the space back under itself so the filters
              below arrive against the title. Nothing is clipped — see
              `furnitureMargin`. */}
          <m.div
            style={{
              opacity: furnitureOpacity,
              marginBottom: furnitureHeight ? furnitureMargin : 0,
            }}
          >
            <div ref={furnitureRef}>
              {/* The live site's standfirst voice: full size, full strength,
                  with the accent carrying the words that matter. */}
              {/* Kept as supporting text rather than a second statement: the
                  title is already doing the shouting, and at display size in
                  two colours this was competing with it. */}
              <p className="hp-sub mt-5 max-w-xl text-h5 text-off-white/70">
                Brand, healthcare, culture and impact — made by Hunterpark.
              </p>
            </div>
          </m.div>
        </m.div>

        {/* The reel index sits BESIDE the lockup, bottom-aligned, which is what
            `.hero__content` does on the live site (`minmax(0,1fr) auto`).
            Stacked under the standfirst it was the first thing pushed out of
            the frame once the standfirst grew to its proper size — which is
            why the slider looked like it vanished on load. */}
        <m.div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-start px-gutter pb-8 lg:justify-end lg:pb-14"
          style={{ opacity: furnitureOpacity }}
        >
          <div className="pointer-events-auto flex items-center gap-3">
            {reel.map((work, i) => (
              <button
                key={work.slug}
                type="button"
                onClick={() => setLive(i)}
                aria-label={`Play ${work.client} — ${work.title}`}
                aria-current={i === live ? "true" : undefined}
                className={`h-px w-10 transition-colors duration-500 ease-hp-out ${
                  i === live
                    ? "bg-lime"
                    : "bg-off-white/25 hover:bg-off-white/60"
                }`}
              />
            ))}
            <span className="label-xs ml-2 text-off-white/45">
              {reel[live]?.client}
            </span>
          </div>
        </m.div>
      </div>
    </section>
  );
}

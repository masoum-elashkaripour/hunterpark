"use client";

import { useEffect, useRef, useState } from "react";
import {
  m,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { useScrollY } from "@/components/use-beat";
import { ScrollChars } from "@/components/scroll-chars";
import { type Work } from "@/lib/works";

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

/**
 * The line leaves the way the next chapter's arrives — a glyph at a time,
 * against scroll, and it has to be gone before the hero is.
 *
 * `ScrollChars` builds a line as its progress runs 0→1, so this hands it a
 * progress that runs the other way: the glyphs are all in place at the top of
 * the hero, and the reader takes them away. Its run now always ends exactly at
 * 1 — the stagger is derived from the glyph count — so a flat 1 is the right
 * place to start from and none of this window is dead scroll.
 *
 * It ends at 0.8 of the chapter, not at 1: the film is a lit hairline by then
 * and the last thing that should still be on the screen is a stray letter.
 */
const LEAVE = { from: 0.12, to: 0.8 };

/**
 * The lockup, in three layers that make ONE sentence.
 *
 *   eyebrow   what this is, and what it is not
 *   title     the stance that follows from that
 *   standfirst  who, when, and what the stance cost to get
 *
 * Every claim in it is the studio's own. "An Emmy Award winning full-service
 * creative production agency"; "Bethanie Schwartz and Lauren Tuttman left the
 * corporate environment behind to launch HunterPark in 2018"; "we're not big on
 * imposing massive fees or layers" — all from hunterpark.tv/about. Nothing here
 * is a flourish the brand would not recognise.
 *
 * It replaces a hero built on the name joke ("We do not hunt."), which is the
 * live site's own opening and reads as a riddle a visitor has to be let in on
 * before anything is said. The name is still here — it is the first thing
 * chapter 02 says — but it is no longer what the page leads with.
 *
 * TWO LINES, and short ones: measured against `soehne-breit-900` at every width
 * from 390 to 1920, the longer line is 728px at a 1440 page against 1332 of
 * room, and the tightest margin anywhere is +64px. The title it replaces
 * already wrapped on a phone.
 */
const TITLE = ["Answerable", "to the work."];

/**
 * The reel's cadence.
 *
 * `HOLD` is how long a clip is on screen, and it is a HOLD rather than a
 * duration: the clips run eight to twelve seconds, so left to `ended` the hero
 * sat on one shot long enough to read as a still. Six seconds is long enough to
 * watch a shot and short enough to still be a cut.
 *
 * `CROSS` is the crossfade, and it has to match the `duration-700` the stacked
 * videos carry in their class list — it is what decides when the outgoing clip
 * can safely be stopped. Retire it any earlier and the reader watches it jump
 * to its first frame half way through the dissolve.
 */
const REEL = { hold: 6000, cross: 700 };

/**
 * The hero ARRIVES. All of it.
 *
 * Only the title had an entrance before, so on first paint the eyebrow, the
 * standfirst and the reel index were simply there — a still photograph with one
 * animated line in it, which reads as a page that has not finished loading
 * rather than as a film starting.
 *
 * It starts with the page and it starts WITHOUT JAVASCRIPT — see
 * `@keyframes hp-hero-rise`. Nothing waits on the video either: the clips carry
 * posters and the lockup has its own ground, so there is no layout shift to
 * guard against and no reason for words to be held back by bytes.
 */
const RISE = { each: 0.1 };

/** How far the furniture drifts up as it goes. */
const LIFT = -64;

/**
 * The stagger, now expressed as a CSS `animation-delay`.
 *
 * `RISE.duration` lives in the stylesheet with the keyframes; this is only the
 * order. Near-simultaneous on purpose — a long stagger would make four separate
 * entrances; 0.1 between them is enough that the eye reads an order and not
 * enough that it reads a queue.
 */
const rise = (order: number) => ({ animationDelay: `${order * RISE.each}s` });

export function AboutHero({ reel }: { reel: Work[] }) {
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
  /* This page's own scroll value, not `useScroll` — see `useScrollY`, which
     documents the cold-load gap that one has and this one does not. */
  const scrollY = useScrollY();
  const [viewport, setViewport] = useState(1);
  /**
   * The film receding — and the hero's run is LINEAR again.
   *
   * It was eased, with a middle stop at 0.72, to get the blur most of the way
   * done early. That is no longer this value's job: the focus pull now has its
   * own window inside this run, exactly as it does in the closing sequence, so
   * the shape of the move belongs to `FOCUS` below and this is just the clock
   * it is read against. An easing here would bend that window out of step with
   * the one it is meant to match.
   *
   * It spans 0.02 → 0.5 of a screen: from the first notch of a wheel to exactly
   * where the next chapter's stage pins — the studio section is pulled up a
   * screen, so it takes the window at 0.5vh of scroll. The focus pull occupies
   * the middle of that, which puts its start around 250px and its finish around
   * 390px, comfortably before the handover.
   */
  const recede = useTransform(
    scrollY,
    [viewport * 0.02, viewport * 0.55],
    [0, 1],
  );

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
   * THE FILM DOES NOT COLLAPSE ANY MORE.
   *
   * It used to shut to a hairline across the middle of the frame and go, and
   * the next chapter then opened a blurred still of its own from the right
   * edge — which left a hard vertical seam travelling across the screen, and
   * two different pictures doing the same job a screen apart.
   *
   * Now there is one picture. The clip the reader was watching STAYS, pulled
   * out of focus and graded down, and the next chapter is read on it. So the
   * hero does not end so much as recede, and nothing has to be revealed to
   * take its place.
   *
   * The grade is measured against the worst case a video can produce — a
   * blown-out white frame — because a clip is not a known colour the way a
   * photograph is. At brightness 0.55 under a 0.55 scrim the body copy still
   * reads 5.4:1 against it and the lime 8.6:1; on real footage, far more.
   *
   * THE BLUR IS NOT WHAT KEEPS THE TEXT LEGIBLE — the brightness and the scrim
   * are, and that guarantee is per-pixel, so it holds at any radius. Which is
   * why the blur and the darkening could both come down without touching the
   * readability floor: the clip had stopped being a picture of something and
   * become a dark haze.
   *
   * And it runs on `recede`, not on the hero's own chapter — a page-level read
   * of raw scroll over a whole screen, where the chapter is half of one. The
   * same move, twice as slow, and it keeps going after the hero has handed
   * over rather than stopping dead at the chapter's edge.
   */
  /**
   * THE FOCUS PULL, ported from the closing sequence.
   *
   * `AboutFinale` runs the same move and these are its numbers, unchanged: the
   * blur over 0.49 → 0.85 of the run, the glass over 0.57 → 0.85, and the chain
   * ending on `blur(34px) brightness(0.6) saturate(0.62)`. Two sequences doing
   * the same thing to the same kind of layer should not have two sets of
   * numbers, and the only way to be sure they feel alike is to give them one.
   *
   * What that buys, against what was here before: the pull no longer begins on
   * the first pixel of scroll. It waits until the reader is half way through
   * the hero's travel and then comes on over a third of it — late, gradual, and
   * finished before the next chapter takes the screen, which is exactly the
   * shape of the closing move.
   */
  const FOCUS = { glass: [0.45, 0.95] as const };

  /**
   * The focus pull runs the WHOLE travel, and it is eased so that it barely
   * registers at first.
   *
   * It used to own only 0.49 → 0.85 of the run, which is a third of the hero's
   * movement — late, but then all at once. Three stops across the full travel
   * instead, weighted so a quarter of the scroll has produced an eighth of the
   * blur: the reader sees it start, not arrive.
   *
   * One chain rather than three declarations: the compositor resolves a chain
   * in a single pass.
   */
  const pull = useTransform(
    recede,
    [0, 0.45, 1],
    [
      "blur(0px) brightness(1) saturate(1)",
      "blur(7px) brightness(0.82) saturate(0.86)",
      "blur(42px) brightness(0.6) saturate(0.62)",
    ],
  );

  /**
   * AND IT IS `none` UNTIL IT IS SOMETHING.
   *
   * `blur(0px) brightness(1) saturate(1)` is the identity chain — it is defined
   * to change not one pixel — but it is still a filter, so the browser builds a
   * filter pass over the whole viewport on every frame to produce the picture it
   * already had. Measured on this layer: an identity chain costs 29ms a frame.
   *
   * `none` is not a value in the chain; it is the absence of one, and the
   * absence of one means no pass. So the hero's first screen — the one screen on
   * this page where the footage is the subject and sharpness is the whole point
   * — is now rendered with no filter in front of it at all, which is both
   * cheaper and more faithful than asking for a no-op.
   *
   * The swap happens at `recede === 0`, where by construction there is nothing
   * to see on either side of it.
   */
  const grade = useTransform(pull, (chain) =>
    recede.get() <= 0 ? "none" : chain,
  );

  /**
   * AND IT BUILDS FROM THE BOTTOM.
   *
   * A second blur, on its own layer, under a mask whose edge climbs the frame.
   * It is additive to the one above rather than instead of it, and that is the
   * whole correction: a masked blur ALONE leaves most of the picture sharp
   * until very late, which is what read as "a gradient rather than a blur" —
   * and a uniform blur alone has no direction in it at all. Together, the lower
   * part of the frame goes soft first and the softness travels up while the
   * whole picture is also, gradually, going.
   *
   * `backdrop-filter` rather than a second copy of the clip: it blurs whatever
   * is behind it inside this layer, so the mask decides how much of the frame
   * it covers without another video to pay for. The radius is CONSTANT and the
   * mask is what moves — a changing radius re-renders a full-screen gaussian on
   * every scroll event; a moving mask only re-composites a layer already
   * rasterised.
   */
  const bandLow = useTransform(recede, [0, 1], [-40, 104]);
  const bandHigh = useTransform(recede, [0, 1], [-6, 140]);
  const band = useMotionTemplate`linear-gradient(to top, #000 ${bandLow}%, transparent ${bandHigh}%)`;

  /**
   * And the clip swells as it softens — 1 to 1.14.
   *
   * A gaussian always leaves a soft, thinning edge where it runs out of pixels
   * to sample, so a blurred layer at exactly viewport size shows a pale band
   * down all four margins. The usual fix is to oversize the element, but a
   * permanently oversized video is a permanently UPSCALED one, and the hero
   * spends its first screen perfectly sharp. Tying the swell to the same curve
   * the blur runs on gives both: rendered all but 1:1 for the whole of the time
   * there is nothing to hide, and pushed past the edges as the edges appear.
   */
  const swell = useTransform(recede, [0, 0.45, 1], [1, 1.01, 1.1]);

  /* The scrim stays, but only as what it always was — the readability floor
     under the next chapter's words. It is not the effect; the blur is. It comes
     on late and slowly, for the same reason the closing sequence holds its
     glass back: darkening a sharp picture reads as a dimmer, darkening one that
     is already going soft reads as depth. */
  const scrim = useTransform(
    recede,
    [FOCUS.glass[0], FOCUS.glass[1]],
    [0, 0.55],
  );

  /**
   * And how long it stays: the whole of the next chapter, going as that
   * chapter's last screen leaves.
   *
   * Measured from the studio section's BOTTOM edge, which is the one piece of
   * geometry that says "this chapter is over" without this component having to
   * know anything about how that chapter is built. `useBeat` reaches 1 exactly
   * when that edge reaches the bottom of the window, so the fade begins on the
   * frame the chapter finishes and is done before the next one is in view.
   */
  const presence = useMotionValue(1);
  /* At zero it is not merely transparent, it STOPS BEING PAINTED. A
     transparent full-screen layer with a blur and a backdrop-filter still costs
     the whole of what it would cost visible. */
  const filmVisibility = useTransform(presence, (v) =>
    v <= 0.001 ? "hidden" : "visible",
  );
  /**
   * The reel only stops when the layer is INVISIBLE — not when the hero ends.
   *
   * It used to be held the moment the reader was most of the way through the
   * chapter, on the argument that a paused frame under a constant blur is
   * cheaper than a playing one. It is, but it is also a film stopping dead
   * behind a page that is still moving: the hero's words leave over a picture
   * that has just frozen, which is exactly the wrong half-second to do it in.
   *
   * So it plays through the whole exit and through the chapter it becomes the
   * ground for, and stops only once `presence` has taken it to zero — where
   * there is nothing to see and nothing to pay for.
   */
  const [dormant, setDormant] = useState(false);

  useEffect(() => {
    /**
     * The chapter's bottom edge, in DOCUMENT space, found once.
     *
     * This used to run a `querySelector` and a `getBoundingClientRect` on every
     * scroll tick — a DOM search and a forced layout, per event, to learn
     * something that only changes when the page is laid out. Cached, the tick
     * below is two subtractions.
     */
    let top = 0;
    const measure = () => {
      const chapter = document.querySelector<HTMLElement>(
        '[data-chapter-section="1"]',
      );
      if (!chapter) return;
      const r = chapter.getBoundingClientRect();
      top = r.top + window.scrollY;
    };

    /**
     * IT LEAVES WHEN THE NEXT CHAPTER LIGHTS ITS OWN ROOM, not at the end of it.
     *
     * This was read off the chapter's BOTTOM edge, which on a thirteen-screen
     * chapter does not come near the window until the very end — so a
     * full-screen video under a 42px blur, with a backdrop-filtered scrim over
     * it, carried on painting for the whole act while the Talent aura sat
     * opaquely on top of it. Measured, it was 37% of the frame cost of a
     * chapter in which it is not visible at all.
     *
     * Read off the TOP instead, it goes where it stops being the ground: the
     * film is the hero's floor and act one's, and by three screens into the pin
     * the aura has taken over. Everything after that is paid for and unseen.
     */
    const read = () => {
      const view = window.innerHeight;
      const seen = top - window.scrollY;
      /* Full while the chapter is arriving and through its first screens;
         gone by the time act two's own light is up. */
      presence.set(Math.min(1, Math.max(0, (seen + 5.5 * view) / (2 * view))));
    };

    measure();
    const frame = requestAnimationFrame(() => {
      measure();
      read();
    });
    const observer = new ResizeObserver(() => {
      measure();
      read();
    });
    observer.observe(document.documentElement);

    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", () => {
      measure();
      read();
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [presence]);

  useEffect(() => {
    const read = (v: number) => setDormant(v <= 0.001);
    read(presence.get());
    return presence.on("change", read);
  }, [presence]);

  /**
   * Everything around the title — eyebrow, standfirst, reel index — leaves
   * together, but late enough that the reel is still there to be used while
   * the hero is the hero. An earlier pass took it at 5%, which is why the
   * slider looked like it had been dropped.
   */
  const furnitureOpacity = useTransform(scrollYProgress, [0.28, 0.55], [1, 0]);

  /**
   * And the direction they go in: UP, on exactly the window they fade on.
   *
   * They only faded before, which reads as the page dimming rather than as the
   * hero leaving. Travelling the same way the scroll is pushing them — out
   * through the top of the frame — is what makes the chapter feel like it is
   * being left behind rather than switched off.
   */
  const furnitureLift = useTransform(scrollYProgress, [0.28, 0.55], [0, LIFT]);

  /* One pair of values for every piece — they all leave together. The ARRIVAL
     is a CSS animation on the inner element; see `rise`. */
  const leaves = { opacity: furnitureOpacity, y: furnitureLift };

  /* The title's own progress, running DOWN — see `LEAVE`. */
  const leave = useTransform(scrollYProgress, [LEAVE.from, LEAVE.to], [1, 0]);

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

  /**
   * The cut, on a clock — see `REEL`.
   *
   * Three things have to happen in order for a dissolve to be clean, and only
   * one of them is the swap itself:
   *
   *   now            the incoming clip starts from its first frame
   *   now            the one after it is warmed, so its first frame is decoded
   *                  before it is ever asked for
   *   + CROSS        the outgoing clip is stopped and rewound — AFTER the fade,
   *                  not with it
   *   + HOLD         the swap
   *
   * Both timers are cleared on the way out, so a `live` that changes early —
   * the reader clicking the index, or the layer going dormant once it is off
   * screen — never leaves a stale cut queued behind it.
   */
  useEffect(() => {
    const el = videoRefs.current[live];
    if (!el) return;

    /* Off screen entirely — see `dormant`. */
    if (dormant) {
      el.pause();
      return;
    }

    /**
     * SEEK ONLY IF IT IS NOT ALREADY AT THE TOP.
     *
     * Assigning `currentTime` is a seek, and a seek on a clip the browser has
     * not buffered is a fresh range request. Written unconditionally it fired
     * on every cut, including on clips already sitting at zero — measured, the
     * reel's 3.72MB clip was being pulled down twice in a single pass.
     */
    if (el.currentTime > 0.05) el.currentTime = 0;
    void el.play().catch(() => {
      /* Autoplay refused — the poster holds. */
    });

    /**
     * Warm the next clip by letting it BUFFER, not by seeking it.
     *
     * This used to poke `currentTime = 0`, which warms nothing: the clip is
     * already at zero, and on one that has played it is another seek and
     * another request. Raising `preload` is the actual instruction to go and
     * fetch, and it costs nothing on a clip that has already done so.
     */
    const next = videoRefs.current[(live + 1) % reel.length];
    if (next && next.preload !== "auto") next.preload = "auto";

    const previous = (live - 1 + reel.length) % reel.length;
    const retire = window.setTimeout(() => {
      if (previous === live) return;
      const old = videoRefs.current[previous];
      if (!old) return;
      /* Paused and left where it is. Rewinding it here threw away everything
         it had buffered, so coming round again cost the whole file a second
         time; it is rewound when it next becomes live, which is the only
         moment the position matters. */
      old.pause();
    }, REEL.cross);

    const cut = window.setTimeout(
      () => setLive((n) => (n + 1) % reel.length),
      REEL.hold,
    );

    return () => {
      window.clearTimeout(retire);
      window.clearTimeout(cut);
    };
  }, [live, dormant, reel.length]);

  return (
    /* Two screens tall: the first is the hero at rest, the second is the
       distance the chapter takes to close. The hero pins for both. */
    <section ref={driverRef} className="relative h-[150svh]">
      {/* FIXED, and outside the pinned stage — so it is not this chapter's
          backdrop, it is the page's. It outlives the hero because nothing
          unmounts it and nothing moves it: a fixed layer at a negative
          z-index sits above the page's own black and below every section's
          content, which is exactly where a ground belongs. */}
      <m.div
        className="about-film"
        aria-hidden
        style={{ opacity: presence, visibility: filmVisibility }}
      >
        {/**
         * THE SWELL AND THE GRADE ARE ON SEPARATE ELEMENTS.
         *
         * They were on one, and a blur is not a composited property — an
         * element that is both blurred and transformed is re-blurred on every
         * frame the transform moves it. This is the whole viewport with a
         * playing video in it, so the hero was re-running a 42px Gaussian
         * across it for the length of the chapter: measured over the hero and
         * the studio, 171ms a frame, and 69 with the filter off.
         *
         * The closing sequence had the identical bug and the identical fix.
         * Parent moves, child blurs; a blurred raster can then be composited as
         * the parent travels, which is the one thing a GPU does for free.
         */}
        <m.div className="about-film__media" style={{ scale: swell }}>
          <m.div className="about-film__grade" style={{ filter: grade }}>
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
                /* `loop` now, where it used to be deliberately absent: the reel
                 is advanced by the clock in the effect above rather than by
                 `ended`, so a clip shorter than the hold would otherwise freeze
                 on its last frame and wait. It repeats instead. */
                loop
                /* ONE clip fetched in full, not two. The others get their
                 headers and are warmed six seconds before their turn by the
                 effect above, which is ample. Two were competing with the
                 JavaScript bundle for the connection on first load — 1.5MB of
                 video ahead of the code that makes the page work. */
                preload={i === 0 ? "auto" : "metadata"}
                aria-hidden
                /* No `onEnded`. It was what advanced the reel; the clock in the
                 effect above does that now, and with `loop` on the clips this
                 would never fire anyway. */
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
        </m.div>

        {/* The band that climbs — see `band`. */}
        <m.div
          className="about-film__soft"
          style={{ maskImage: band, WebkitMaskImage: band }}
        />

        <m.div className="about-film__scrim" style={{ opacity: scrim }} />
      </m.div>

      <div className="sticky top-0 flex h-[100svh] flex-col justify-end overflow-hidden">
        {/* Sat well clear of the bottom edge rather than tight against it.
            The frame has the room — using it is what lets the title and the
            standfirst stay at full size without crowding the reel below.
            Below `lg` the reel drops under the lockup rather than beside it,
            so there the clearance has to be larger still. */}
        <m.div
          className="relative px-gutter"
          style={{ paddingBottom: lockupPad }}
        >
          <m.p className="hp-eyebrow" style={leaves}>
            <span className="hero-rise inline-block" style={rise(0)}>
              A studio, not an agency
            </span>
          </m.p>

          {/* On load the words rise out of their masks — the hero lockup's own
            treatment on the live site. On scroll the glyphs then leave one at a
            time, which is the same motion the next chapter's heading arrives
            on, run backwards. Only the one-off rise on load is a reduced-motion
            call; the departure is coupled to scroll, so the reader drives it. */}
          <h1 className="hp-display mt-4 text-[clamp(2.75rem,8vw,7rem)]">
            {/* Two motions on one line, so they are kept on separate elements:
                the wrapper rises out of its mask once, on load; the glyphs
                inside it are driven by scroll. Putting both on the same node
                would have them fight over `y`. */}
            <span className="block overflow-hidden">
              <span className="hero-mask-rise" style={rise(1)}>
                <ScrollChars
                  lines={TITLE}
                  progress={leave}
                  /* Negative: the glyphs go UP and out. See `from` there —
                     a run reversed through the default positive offset drops
                     the letters out of the lockup instead. */
                  from={-40}
                />
              </span>
            </span>
          </h1>

          {/* Fades, then pulls the space back under itself so the filters
              below arrive against the title. Nothing is clipped — see
              `furnitureMargin`. */}
          <m.div
            style={{
              ...leaves,
              marginBottom: furnitureHeight ? furnitureMargin : 0,
            }}
          >
            <div ref={furnitureRef} className="hero-rise" style={rise(2)}>
              {/* The third layer: who said it, and what saying it cost.
                  `hp-copy`, the same declaration the studio's paragraphs and the
                  staircase's lines use — one prose size for the whole page.

                  It no longer explains the name. That was the old title's
                  punchline and needed its own footnote; this one needs none, so
                  the room goes to the fact that two people walked out of the
                  agency world to be able to say it. */}
              <p className="hp-copy mt-5 max-w-md">
                Emmy-winning and female-founded. Two people left the agency
                floor in 2018 and did not take the layers with them.
              </p>

              {/**
               * The site's ONE button, not a second one that resembles it.
               *
               * `.header-cta` is the whole treatment — the lime rule, the flood
               * from the left on hover, the label rolling over its own copy,
               * the arrow — and it is already what the navbar's Contact button
               * and the closing lockup's Start a Project both wear. Writing
               * another set of rules that looked the same would be a second
               * button to keep in step with the first.
               *
               * Inside the standfirst's block on purpose: it leaves with the
               * rest of the furniture, on the same fade and the same lift, and
               * the space it takes is reclaimed by the same measurement. No new
               * animation, no new timing.
               */}
              <div className="mt-7">
                <Link href="/work" className="header-cta">
                  <span className="header-cta__label">
                    <span className="header-cta__roll" data-text="See the work">
                      <span>See the work</span>
                    </span>
                  </span>
                  <span className="header-cta__arrow" aria-hidden="true">
                    <svg
                      viewBox="0 0 16 16"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M4 12L12 4M5.5 4H12v6.5" />
                    </svg>
                  </span>
                </Link>
              </div>
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
          style={leaves}
        >
          <div
            className="hero-rise pointer-events-auto flex items-center gap-3"
            style={rise(3)}
          >
            {reel.map((work, i) => (
              /**
               * The bar is 2px; the TARGET is 48×42.
               *
               * The reach comes from a pseudo-element, not from padding or a
               * taller box, and that is the whole point: a `::before` is laid
               * out by its own insets and contributes nothing to the flow, so
               * the bars stay exactly where the design puts them — same gap,
               * same baseline against the label, same distance off the bottom
               * edge. Padding would have grown the row and lifted the whole
               * index off the foot of the frame.
               *
               * Hover and click both answer over the full target: a pseudo
               * element is part of its originating element for hit-testing, so
               * `:hover` and the click land on the button itself and the lime
               * selected state needs no change at all.
               */
              <button
                key={work.slug}
                type="button"
                onClick={() => setLive(i)}
                aria-label={`Play ${work.client} — ${work.title}`}
                aria-current={i === live ? "true" : undefined}
                className={`relative h-0.5 w-10 transition-colors duration-500 ease-hp-out before:absolute before:-inset-x-1 before:-inset-y-5 before:content-[''] ${
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

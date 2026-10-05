"use client";

import Image from "next/image";
import { useEffect } from "react";
import {
  animate,
  cubicBezier,
  m,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";

/**
 * The portraits beside the Talent list, each opening out of the frame.
 *
 * Taken from the live build's own services section rather than described from a
 * screenshot: driven and measured, its inactive panels sit at
 * `clip-path: inset(50% 31%)` with opacity 0 and the live one at `inset(0)`
 * with opacity 1. So the move is a rectangle growing from a narrow band at the
 * centre of the frame outward in BOTH axes — much further vertically than
 * horizontally — while it fades up. Not a carousel, not a slide, and not a
 * single-axis wipe; the two insets are what give it its particular unfolding.
 *
 * NOTHING LEAVES. A panel opens and stays; the next opens ON TOP of it. The
 * reference closes its old panels instead, which looks identical at rest and
 * differs only in the middle of a move — closing one while opening another puts
 * both at half strength at the midpoint, which is exactly where a dip would be.
 * Stacking has no midpoint to dip at.
 *
 * Every value is a pure function of scroll POSITION. There is no "active index"
 * anywhere, because an index is a state and a state cannot be scrubbed; scroll
 * back and the rectangles close again through the same numbers.
 */

/**
 * How much of the run one picture takes to open.
 *
 * It has to fit inside a stage with room to spare — a stage is the gap between
 * two card arrivals in the column beside this one, and the settle needs a
 * position where a picture is whole and still. The narrowest here is 0.0510; at
 * 0.042 the rectangle grows over about half a screen of scroll and then holds
 * open for the rest of its stage, which is the reference's rhythm: a panel that
 * arrives, and then simply is.
 */
const REVEAL = 0.042;

/**
 * The closed rectangle, as insets — measured off the live build.
 *
 * 50% top and bottom is a line of no height; 31% left and right leaves a narrow
 * column of it. Opening both to 0 grows that band into the whole frame, and the
 * asymmetry is the character of the move: it travels much further vertically
 * than horizontally, so it reads as unfolding rather than as a box being scaled.
 */
const SHUT = { y: 50, x: 31 };

/**
 * How still the page has to be before a picture finishes opening.
 *
 * Short enough that letting go and watching is one gesture rather than two,
 * long enough that it does not fire between the frames of an ordinary scroll.
 */
const SETTLE_AFTER = 160;

/** The auto-complete. Long and soft — this is the move's whole character. */
const SETTLE = { duration: 1.1, ease: [0.22, 1, 0.3, 1] as const };

/**
 * How much scroll the parked offset is handed back over once the reader moves.
 *
 * Long enough that the hand-back is never the thing being watched, short enough
 * that it is spent before the next picture is due.
 */
const DECAY = 0.03;

/** The curve it opens on — the staircase's, so the page has one accent. */
const EASE = cubicBezier(0.62, 0, 0.3, 1);

export type Shot = { src: string; alt?: string };

/**
 * The scroll position, plus however far the frame has carried itself past it.
 *
 * A pure function of scroll position cannot finish anything: it has no idea the
 * reader has let go, so wherever they stop is where it stays — which on this
 * move means a rectangle frozen part-open. This keeps the scrubbing exactly as
 * it was and adds one thing: a PARKED offset, normally zero, which is animated
 * when the page goes still so the composed value lands where a picture is whole.
 *
 * THE HAND-BACK IS A FUNCTION OF SCROLL, not a second animation. Two animations
 * on one value is two things that can be mid-flight at once, and when that was
 * tried they were: a settle superseding a release left the release's callback
 * unfired and its flag set for good, so the offset stopped being handed back and
 * accumulated from one stop to the next. Expressed as a decay against distance
 * travelled there is nothing to co-ordinate — continuous in both directions,
 * with no state to get wrong.
 */
function useSettled(progress: MotionValue<number>, bounds: number[]) {
  const park = useMotionValue(0);
  const anchor = useMotionValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    /**
     * The nearest position at which a picture is whole.
     *
     * A panel opens across `[edge - REVEAL, edge]` and holds open after, so
     * both ends of that window are complete states: back to the start leaves
     * the previous picture whole, on through the end leaves this one whole.
     * Outside a window nothing is moving and there is nothing to finish.
     *
     * The last edge is excluded as a forward target — it is where the act hands
     * over, and pushing through it would open a seventh panel that does not
     * exist, leaving an empty frame.
     */
    const last = bounds.length - 1;
    const complete = (v: number) => {
      for (let i = 1; i < bounds.length; i += 1) {
        const edge = bounds[i];
        if (v > edge - REVEAL && v < edge) {
          if (i === last) return edge - REVEAL;
          return v - (edge - REVEAL) < edge - v ? edge - REVEAL : edge;
        }
      }
      return v;
    };

    /* What the offset is worth right now, after the decay. */
    const effective = () => {
      const fade = Math.max(
        0,
        1 - Math.abs(progress.get() - anchor.get()) / DECAY,
      );
      return park.get() * fade;
    };

    let idle = 0;
    let settling: { stop: () => void } | null = null;

    const rest = () => {
      const held = effective();
      const here = progress.get() + held;
      const target = complete(here);
      if (target === here) return;
      /* Re-anchor WITHOUT moving anything: park what the decay currently makes
         it worth, at the position it is worth it at, so the composed value is
         the same on both sides of this line. */
      park.set(held);
      anchor.set(progress.get());
      settling = animate(
        park,
        target - progress.get(),
        reduced ? { duration: 0 } : SETTLE,
      );
    };

    const moved = () => {
      window.clearTimeout(idle);
      settling?.stop();
      settling = null;
      idle = window.setTimeout(rest, SETTLE_AFTER);
    };

    idle = window.setTimeout(rest, SETTLE_AFTER);
    const stop = progress.on("change", moved);
    return () => {
      window.clearTimeout(idle);
      settling?.stop();
      stop();
    };
  }, [progress, park, anchor, bounds, reduced]);

  return useTransform<number, number>(
    [progress, park, anchor],
    ([p, k, a]: number[]) => p + k * Math.max(0, 1 - Math.abs(p - a) / DECAY),
  );
}

/** One picture, growing out of the band at the centre of the frame. */
function Panel({
  shot,
  from,
  first,
  progress,
  priority,
}: {
  shot: Shot;
  /** Where this picture finishes opening, on the chapter's own 0→1. */
  from: number;
  /** The first is the ground the rest open over — always whole. */
  first: boolean;
  progress: MotionValue<number>;
  priority: boolean;
}) {
  const window_ = [from - REVEAL, from];

  const insetY = useTransform(progress, window_, [SHUT.y, 0], { ease: EASE });
  const insetX = useTransform(progress, window_, [SHUT.x, 0], { ease: EASE });
  const clipPath = useMotionTemplate`inset(${insetY}% ${insetX}%)`;

  /**
   * Up with the rectangle, and finished before it is.
   *
   * The reference carries opacity alongside the insets rather than relying on
   * the clip alone. Finished early on purpose: a picture that is still gaining
   * opacity as its last edge lands reads as two moves ending at once, where
   * this reads as one picture arriving and then being revealed the rest of the
   * way.
   */
  const opacity = useTransform(
    progress,
    [window_[0], from - REVEAL * 0.25],
    [0, 1],
  );

  return (
    <m.div
      className="talent-stack__panel"
      style={first ? undefined : { clipPath, opacity }}
    >
      <Image
        src={shot.src}
        alt={shot.alt ?? ""}
        fill
        sizes="(max-width: 1023px) 86vw, 34vw"
        quality={90}
        priority={priority}
        className="talent-stack__img"
      />
    </m.div>
  );
}

export function TalentStack({
  shots,
  bounds,
  progress,
}: {
  shots: Shot[];
  /** `shots.length + 1` stage edges on the chapter's own progress. */
  bounds: number[];
  progress: MotionValue<number>;
}) {
  /* Scrubbed exactly as before, and able to finish — see `useSettled`. */
  const shown = useSettled(progress, bounds);

  return (
    <div className="talent-stack" aria-hidden>
      {shots.map((shot, i) => (
        <Panel
          key={shot.src}
          shot={shot}
          from={bounds[i]}
          first={i === 0}
          progress={shown}
          /* Only the first is worth the priority: the rest are several screens
             of scroll away and fetching them all up front would compete with
             the chapter the reader is actually in. */
          priority={i === 0}
        />
      ))}
    </div>
  );
}

"use client";

import { m, type MotionValue, useTransform } from "motion/react";

/**
 * Swaps one line of type for another, a glyph at a time, against scroll.
 *
 * Each character owns a slice of the scroll range: the outgoing letter drops
 * out of its mask while the incoming one climbs into it, and because the
 * slices are staggered the change sweeps across the word rather than happening
 * to the whole line at once.
 *
 * Every letter is a pure function of scroll POSITION, so the line is fully
 * defined at any point of the page — scrub back and it unswaps. Nothing here
 * can be left half-finished by a missed trigger.
 */

/**
 * Scroll span one glyph takes to travel, before its own stagger offset. Wide
 * on purpose: the whole point is that the line turns over slowly enough to
 * watch.
 *
 * These two have a budget. The last glyph of the INCOMING line finishes at
 * `start + 0.06 + (n - 1) * STEP + SPAN`, and that has to land inside 1 or the
 * tail of the new title never arrives. At `start: 0.42` over a 13-glyph line
 * these come to 0.95 — close to the edge deliberately, so the change uses the
 * whole chapter, but inside it.
 */
const SPAN = 0.28;
/** Added per glyph, so the change reads left to right. */
const STEP = 0.016;

export function ScrollCharSwap({
  from,
  to,
  progress,
  start = 0.22,
  className,
}: {
  from: string;
  to: string;
  progress: MotionValue<number>;
  /** Scroll progress at which the first glyph begins to leave. */
  start?: number;
  className?: string;
}) {
  return (
    <span className={className}>
      {/* The live text for assistive tech; the glyph machinery is decorative. */}
      <span className="sr-only">{to}</span>

      <span aria-hidden className="relative block">
        {/* In flow, so it sets the height both lines are measured against. */}
        <Line
          text={from}
          progress={progress}
          start={start}
          fromY="0%"
          toY="-115%"
        />

        <span className="absolute inset-0 block">
          <Line
            text={to}
            progress={progress}
            /* A beat behind the exit, so the two never occupy the same slot. */
            start={start + 0.06}
            fromY="115%"
            toY="0%"
          />
        </span>
      </span>
    </span>
  );
}

function Line({
  text,
  progress,
  start,
  fromY,
  toY,
}: {
  text: string;
  progress: MotionValue<number>;
  start: number;
  fromY: string;
  toY: string;
}) {
  let index = -1;

  return (
    <>
      {text.split(" ").map((word, w, words) => {
        const glyphs = (
          <span className="split__word">
            {[...word].map((char, c) => {
              index += 1;
              return (
                <Glyph
                  key={`${char}-${c}`}
                  char={char}
                  progress={progress}
                  start={start + index * STEP}
                  fromY={fromY}
                  toY={toY}
                />
              );
            })}
          </span>
        );

        return (
          <span key={`${word}-${w}`}>
            {glyphs}
            {/* A NON-BREAKING space, and outside the word box. `.split__word`
                is an inline-block with `nowrap`, which trims an ordinary
                trailing space — that is what ran the title together as
                "SELECTEDCASES". */}
            {w < words.length - 1 ? " " : null}
          </span>
        );
      })}
    </>
  );
}

function Glyph({
  char,
  progress,
  start,
  fromY,
  toY,
}: {
  char: string;
  progress: MotionValue<number>;
  start: number;
  fromY: string;
  toY: string;
}) {
  const y = useTransform(progress, [start, start + SPAN], [fromY, toY]);

  return (
    <span className="split__mask">
      <m.span className="split__char" style={{ y }}>
        {char}
      </m.span>
    </span>
  );
}

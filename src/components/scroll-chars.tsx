"use client";

import { m, useTransform, type MotionValue } from "motion/react";

/**
 * A heading that arrives one letter at a time, against scroll.
 *
 * Sibling to `ScrollCharSwap`, which trades one line for another. This one has
 * nothing to trade — it builds a line out of nothing — so each glyph owns a
 * slice of the scroll range and climbs into place when the reader reaches it.
 *
 * Every letter is a pure function of scroll POSITION. The line is fully defined
 * at any point of the page: stop half way and half the heading is there, scrub
 * back and it takes itself apart. Nothing is a transition that runs itself out
 * once something triggers it.
 *
 * THE BLUR IS ON THE LINE, NOT THE LETTER, and that is not a detail. At these
 * sizes the letters are set tight enough that their boxes overlap; giving each
 * one a `filter` promotes it to its own compositing layer, and overlapping
 * layers composite independently — which draws visible seams down through the
 * glyphs. Three line-layers instead of sixty, and the seams have nowhere to be.
 */

/**
 * How long ONE glyph takes to arrive — `OPEN.letter` from `WorkCta`, verbatim.
 *
 * The homepage's closing lockup is the reference for this motion and this is
 * the number that defines it. Read it against the stagger below, never alone:
 * their ratio is how many glyphs are in the air at once, and that ratio IS the
 * character of the move. `WorkCta`'s own comment puts it plainly — at fourteen
 * in flight a line reads as one block fading up however long you give it; at
 * three it assembles letter by letter.
 */
const SPAN = 0.17;

/**
 * The stagger is DERIVED, not fixed, and that is the whole trick.
 *
 * A fixed step cannot serve both a fifteen-glyph hero line and a fifty-seven
 * glyph heading: the step that assembles the short one crisply puts the long
 * one's tail at 2.0 on a scale that stops at 1, where the clamp piles the last
 * thirty letters onto the same slot and they arrive together. Spreading the run
 * across the whole window instead keeps the letter duration fixed and lets the
 * crowding fall where the line length puts it — three in flight for the hero,
 * about eleven for the heading, and a tail that always lands exactly at 1.
 */
const stepFor = (n: number) => (1 - SPAN) / Math.max(1, n - 1);

function Char({
  ch,
  order,
  step,
  from,
  progress,
}: {
  ch: string;
  order: number;
  /** The run's derived stagger — see `stepFor`. */
  step: number;
  /** Where a glyph sits before its slice, in px — see `from` on `ScrollChars`. */
  from: number;
  progress: MotionValue<number>;
}) {
  const at = order * step;
  const to = at + SPAN;

  const opacity = useTransform(progress, [at, to], [0, 1]);
  const y = useTransform(progress, [at, to], [from, 0]);

  return (
    <m.span className="chars__char" style={{ opacity, y }}>
      {/* A plain space inside an `inline-block` collapses to nothing, which
          runs the words together. A no-break space keeps its width. */}
      {ch === " " ? " " : ch}
    </m.span>
  );
}

function Line({
  text,
  first,
  last,
  step,
  from,
  progress,
  className,
}: {
  text: string;
  /** Order of this line's first and last glyphs, for its own focus pull. */
  first: number;
  last: number;
  step: number;
  from: number;
  progress: MotionValue<number>;
  className?: string;
}) {
  /* This line's own window: its first glyph's slice to its last one's. */
  const opens = first * step;
  const closes = last * step + SPAN;
  /* 12px, as the lockup's lines are pulled. */
  const filter = useTransform(
    progress,
    [opens, closes],
    ["blur(12px)", "blur(0px)"],
  );

  return (
    <m.span className={`chars__line ${className ?? ""}`} style={{ filter }}>
      {Array.from(text).map((ch, i) => (
        <Char
          key={i}
          ch={ch}
          order={first + i}
          step={step}
          from={from}
          progress={progress}
        />
      ))}
    </m.span>
  );
}

/**
 * `lines` are counted as ONE run, so the stagger carries across the break
 * rather than restarting — three lines each starting over reads as three
 * headings, not one.
 *
 * `accent` marks a line for the house lime.
 */
export function ScrollChars({
  lines,
  progress,
  accent,
  from = 40,
}: {
  lines: string[];
  progress: MotionValue<number>;
  /** Index of the line that carries the accent, if any. */
  accent?: number;
  /**
   * Where a glyph sits before its slice, in px — and therefore which way the
   * run travels.
   *
   * The default is positive: a glyph waits BELOW its place and rises into it,
   * which is what an arrival is. A caller running this backwards — the hero's
   * line coming apart as the chapter closes — wants the opposite, because a run
   * reversed through a positive offset makes the letters drop out of the
   * lockup, and content leaving a page downwards reads as content falling over
   * rather than content making way. A negative value takes them up and out.
   */
  from?: number;
}) {
  /* Each line's place in the one continuous run, derived rather than
     accumulated: a counter reassigned while mapping is a variable mutated
     during render, which React cannot guarantee is the same on the next one. */
  const starts = lines.map((_, i) =>
    lines.slice(0, i).reduce((n, t) => n + t.length, 0),
  );
  const step = stepFor(lines.reduce((n, t) => n + t.length, 0));

  return (
    <>
      {/* The whole heading, once, for anything that reads rather than looks —
          the glyphs below are decoration to it. */}
      <span className="visually-hidden">{lines.join(" ")}</span>

      <span aria-hidden>
        {lines.map((text, i) => (
          <Line
            key={i}
            text={text}
            first={starts[i]}
            last={starts[i] + text.length - 1}
            step={step}
            from={from}
            progress={progress}
            className={i === accent ? "chars__line--accent" : undefined}
          />
        ))}
      </span>
    </>
  );
}

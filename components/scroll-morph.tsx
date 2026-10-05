"use client";

import {
  m,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";

/**
 * One heading becoming another, a glyph at a time, against scroll.
 *
 * `ScrollChars` builds a line out of nothing and the hero runs it backwards to
 * take one apart. This is both at once: the outgoing line leaves letter by
 * letter while the incoming one arrives the same way, overlapping in the middle
 * so the two are briefly interleaved rather than cutting. That overlap is the
 * whole effect — with a gap between them the reader sees a title disappear and
 * a different title appear, which is two events, not a morph.
 *
 * The constants are `ScrollChars`', which are `WorkCta`'s: one glyph takes 0.17
 * of its run, and the stagger is derived from the glyph count so the tail
 * always lands exactly at the end. Read `SPAN` against the derived step and it
 * is the number of letters in the air at once, which is what the move's
 * character actually is.
 *
 * BOTH LINES ARE ALWAYS MOUNTED, stacked in one grid cell. Swapping the text
 * would make the browser re-layout mid-move and would give the morph nothing to
 * interleave; holding both and driving their opacity from position means every
 * point of the scroll has one answer, and scrubbing back runs it in reverse.
 */

/** Scroll span one glyph takes, before its stagger offset. */
const SPAN = 0.17;
/** The stagger, derived so a run of any length ends exactly at 1. */
const stepFor = (n: number) => (1 - SPAN) / Math.max(1, n - 1);

/**
 * Where the two halves sit on the progress.
 *
 * The outgoing run owns 0 → 0.62 and the incoming 0.38 → 1, so they share the
 * middle quarter. Leaving is also made the faster of the two: a line that is
 * going needs less time than one that is being read for the first time.
 */
const OUT = [0, 0.62] as const;
const IN = [0.38, 1] as const;

const slice = (
  progress: MotionValue<number>,
  [a, b]: readonly [number, number],
  at: number,
  to: number,
) => ({
  from: a + (b - a) * at,
  until: a + (b - a) * to,
});

function Glyph({
  ch,
  order,
  step,
  progress,
  enter,
  leaving,
}: {
  ch: string;
  order: number;
  step: number;
  progress: MotionValue<number>;
  /**
   * The outgoing line's OWN arrival, a chapter earlier.
   *
   * Two different scrolls on one piece of type: the claim assembles on the
   * section's entry long before the chapter starts, and comes apart on the
   * chapter's own beat. COMPOSED rather than chosen between — one answer per
   * property at every scroll position, which is the rule the rest of this page
   * runs on, and the reason the claim did not lose its letter-by-letter
   * entrance when it gained a letter-by-letter exit.
   */
  enter: MotionValue<number>;
  /** Leaving runs its slice backwards: present at 0, gone by the end. */
  leaving: boolean;
}) {
  const band = leaving ? OUT : IN;
  const { from, until } = slice(
    progress,
    band,
    order * step,
    order * step + SPAN,
  );

  const arriveAt = Math.min(order * step, 1 - SPAN);
  const arrived = useTransform(enter, [arriveAt, arriveAt + SPAN], [0, 1]);
  /* 54 rather than 40 — the same lift the subtitle under it was given, so the
     two read as one column arriving rather than two with different manners. */
  const arriveY = useTransform(enter, [arriveAt, arriveAt + SPAN], [54, 0]);

  const departed = useTransform(
    progress,
    [from, until],
    leaving ? [1, 0] : [0, 1],
  );
  /* Out through the top, in from below — so the two runs pass each other
     rather than crossing in the same direction, which is what makes the
     exchange legible at the frames where both are on screen. */
  const departY = useTransform(
    progress,
    [from, until],
    leaving ? [0, -38] : [38, 0],
  );

  const opacity = useTransform(
    [arrived, departed],
    ([a, d]: number[]) => a * d,
  );
  const y = useTransform([arriveY, departY], ([a, d]: number[]) => a + d);

  return (
    <m.span className="chars__char" style={{ opacity, y }}>
      {/* A plain space inside an `inline-block` collapses to nothing, which
          ran the words together — WHATWEDO. A no-break space keeps its
          width. */}
      {ch === " " ? " " : ch}
    </m.span>
  );
}

function Run({
  lines,
  progress,
  enter,
  leaving,
  accent,
}: {
  lines: string[];
  progress: MotionValue<number>;
  enter: MotionValue<number>;
  leaving: boolean;
  accent?: number;
}) {
  const total = lines.reduce((n, t) => n + t.length, 0);
  const step = stepFor(total);
  const starts = lines.map((_, i) =>
    lines.slice(0, i).reduce((n, t) => n + t.length, 0),
  );

  return (
    <span className="morph__run" aria-hidden>
      {lines.map((text, i) => {
        const first = starts[i];
        const last = first + text.length - 1;
        const band = leaving ? OUT : IN;
        const { from } = slice(progress, band, first * step, 0);
        const { until } = slice(
          progress,
          band,
          last * step,
          last * step + SPAN,
        );
        return (
          <Line
            key={i}
            text={text}
            first={first}
            step={step}
            progress={progress}
            enter={enter}
            leaving={leaving}
            from={from}
            until={until}
            className={i === accent ? "chars__line--accent" : undefined}
          />
        );
      })}
    </span>
  );
}

/** One line, and the only thing carrying a `filter` — see `ScrollChars`. */
function Line({
  text,
  first,
  step,
  progress,
  enter,
  leaving,
  from,
  until,
  className,
}: {
  text: string;
  first: number;
  step: number;
  progress: MotionValue<number>;
  enter: MotionValue<number>;
  leaving: boolean;
  from: number;
  until: number;
  className?: string;
}) {
  const filter = useTransform(
    progress,
    [from, until],
    leaving ? ["blur(0px)", "blur(12px)"] : ["blur(12px)", "blur(0px)"],
  );

  return (
    <m.span className={`chars__line ${className ?? ""}`} style={{ filter }}>
      {Array.from(text).map((ch, i) => (
        <Glyph
          key={i}
          ch={ch}
          order={first + i}
          step={step}
          progress={progress}
          enter={enter}
          leaving={leaving}
        />
      ))}
    </m.span>
  );
}

export function ScrollMorph({
  from,
  to,
  progress,
  enter,
  fromAccent,
  toAccent,
}: {
  /** The lines on screen at progress 0. */
  from: string[];
  /**
   * The lines on screen at progress 1 — OPTIONAL, and that is what lets three
   * states chain.
   *
   * Two of these stacked in one cell carry a heading through three texts: the
   * first takes the opening lines away and renders nothing in their place, and
   * the second holds the middle text, arriving on the first's progress and
   * leaving on its own. Without this the middle text would be rendered twice —
   * once as the first's destination and once as the second's origin — and two
   * copies fading up together compound into something neither of them is.
   */
  to?: string[];
  /** The exchange. */
  progress: MotionValue<number>;
  /** The outgoing line's own arrival, which happens long before — see `Glyph`. */
  enter: MotionValue<number>;
  fromAccent?: number;
  toAccent?: number;
}) {
  /* The incoming line has no earlier arrival to compose with: it is already
     "arrived" as far as that half is concerned, and its whole entrance is the
     morph. A constant value, so both halves run the same code path. */
  const settled = useMotionValue(1);

  return (
    <span className="morph">
      {/* The destination, once, for anything that reads rather than looks — the
          glyph runs are decoration to it. A link in the middle of a chain has
          no destination of its own and says nothing here; the last one speaks
          for all of them. */}
      {to ? <span className="visually-hidden">{to.join(" ")}</span> : null}

      <Run
        lines={from}
        progress={progress}
        enter={enter}
        leaving
        accent={fromAccent}
      />
      {to ? (
        <Run
          lines={to}
          progress={progress}
          enter={settled}
          leaving={false}
          accent={toAccent}
        />
      ) : null}
    </span>
  );
}

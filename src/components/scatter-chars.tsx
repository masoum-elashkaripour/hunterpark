"use client";

import { cubicBezier, m, useTransform, type MotionValue } from "motion/react";

/**
 * A title that starts scattered and sorts itself out, against scroll.
 *
 * Every glyph begins somewhere it does not belong — thrown off its place,
 * turned a little — and settles onto the baseline one after another as the
 * reader pushes the page. By the end they are flat, square and exactly where
 * the type sets them, because the end state is simply "no transform" rather
 * than a position anyone had to calculate.
 *
 * THE SCATTER IS DETERMINISTIC. `Math.random()` here would scatter the glyphs
 * differently on the server and on the client and React would throw out the
 * markup it was given; it would also re-roll on every re-render, so a title
 * would jump the moment anything above it changed. A hash of the glyph's own
 * index gives a different-looking number per letter, the same one every time.
 *
 * Nothing moves in the layout: each glyph is an `inline-block` and everything
 * done to it is `transform` and `opacity`, so the line occupies its final width
 * from the first frame and the scattered letters have nowhere to push.
 */

/**
 * How much of the run one glyph takes to find its place — and therefore HOW
 * MANY ARE IN THE AIR AT ONCE, which is the thing actually being set here.
 *
 * Because the stagger is derived (`stepFor`), those two are the same number
 * read two ways: in-flight = (n − 1) · SPAN / (1 − SPAN). At 0.52 that came to
 * 11.9 letters for a twelve-letter title and 18.4 for an eighteen-letter one —
 * every glyph of every title moving simultaneously. The stagger was in the code
 * and invisible on the screen: there was no sequence to watch, only one mass
 * settling at once, which is why the move read as a fast blur rather than as an
 * animation anybody could name.
 *
 * 0.26 puts about six letters in flight on the longest title and under three
 * on the shortest — still a wave travelling along the line rather than a chord,
 * and each letter now owns a longer stretch of it.
 *
 * The two halves of "slower, and more staggered" pull against each other at a
 * fixed length: a longer slice per glyph means more of them overlapping, and a
 * bigger gap between them means each is quicker. They can only both improve if
 * the whole run grows, so it did — see \`useRun\` in \`AboutCapabilities\`,
 * which now spans about a third more scroll than it did. Within that, this buys
 * the travel and the derived stagger keeps the sequence legible.
 */
const SPAN = 0.26;

/**
 * And how it spends that stretch.
 *
 * Linear, a glyph crossed its distance at one rate and stopped dead on the
 * baseline — correct, and the reason the titles read as fast however much
 * scroll they were given: nothing about the move told the eye it was ending.
 * Eased, almost all of the travel happens early and the last tenth of the
 * distance takes a third of the stretch, so each letter drifts the final few
 * pixels onto its place. That drift is what "settling" is.
 *
 * Shared with the pictures and the lines — see `EASE` in `about-capabilities`,
 * which documents why this pair of numbers and not the ones that were here
 * before.
 */
const EASE = cubicBezier(0.62, 0, 0.3, 1);
/** The stagger, derived so a title of any length finishes exactly at the end. */
const stepFor = (n: number) => (1 - SPAN) / Math.max(1, n - 1);

/**
 * How far out of true a glyph starts: px, px, degrees.
 *
 * Further than before, and that is the other half of making the move legible.
 * A letter now has fewer neighbours moving with it, so its own path is what the
 * eye follows; a longer path over the same stretch is a slower-LOOKING arrival,
 * which is the thing being asked for, and it costs no scroll.
 */
const THROW = { x: 150, y: 104, rotate: 38 };

/**
 * A hash, not a random number.
 *
 * The classic sine-fract trick: deterministic, cheap, and uncorrelated enough
 * between salts that the three axes of one glyph do not move together — which
 * they would if a single value were reused, and the scatter would read as a
 * neat diagonal rather than as a mess.
 */
const noise = (i: number, salt: number) => {
  const v = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
};

/**
 * The thrown distance, ROUNDED to four decimals — and that is a hydration fix,
 * not tidiness.
 *
 * Motion serialises transforms to four decimal places when it renders on the
 * server and computes them at full precision in the browser. For every other
 * component on this page that is invisible, because their values are round
 * numbers that survive the trip: 40 is 40. These come out of a sine hash, so a
 * glyph's resting offset is 19.31853830064938 — which the server writes as
 * `19.3185px` and the client recomputes in full, and React reports a tree that
 * "hydrated but some attributes did not match" and declines to patch it.
 *
 * Measured: `/work` logs no hydration warning and this page logged exactly one,
 * from here. Rounding at the source makes both sides compute the same string;
 * four decimals is Motion's own precision, and a ten-thousandth of a pixel was
 * never going to be seen.
 */
const thrown = (i: number, salt: number, distance: number) =>
  Math.round(noise(i, salt) * distance * 1e4) / 1e4;

function Glyph({
  ch,
  order,
  step,
  progress,
}: {
  ch: string;
  order: number;
  step: number;
  progress: MotionValue<number>;
}) {
  const at = order * step;
  const to = at + SPAN;

  const ease = { ease: EASE };
  const x = useTransform(
    progress,
    [at, to],
    [thrown(order, 1, THROW.x), 0],
    ease,
  );
  const y = useTransform(
    progress,
    [at, to],
    [thrown(order, 2, THROW.y), 0],
    ease,
  );
  const rotate = useTransform(
    progress,
    [at, to],
    [thrown(order, 3, THROW.rotate), 0],
    ease,
  );
  /**
   * Up over most of the travel, not the first half of it.
   *
   * At half, a letter was solid for the whole second half of its journey —
   * fully present and still sliding, which reads as type being nudged rather
   * than type arriving. Carrying the fade to 0.78 means a glyph is still
   * gathering while it is still moving and is only completely there once it has
   * stopped. Carried further out to 0.88, so a glyph spends almost all of its
   * travel still arriving — which is most of what reads as an unhurried settle.
   * Not the whole span: a letter that finishes fading exactly as it lands has no
   * moment of simply being on the line before the next one does.
   */
  const opacity = useTransform(progress, [at, at + SPAN * 0.88], [0, 1]);

  return (
    <m.span className="scatter__char" style={{ x, y, rotate, opacity }}>
      {/* A plain space inside an `inline-block` collapses to nothing, which
          ran the words together — WHATWEDO. A no-break space keeps its
          width. */}
      {ch === " " ? " " : ch}
    </m.span>
  );
}

export function ScatterChars({
  text,
  progress,
}: {
  text: string;
  progress: MotionValue<number>;
}) {
  const glyphs = Array.from(text);
  const step = stepFor(glyphs.length);

  return (
    <span className="scatter">
      {/* The title, once, for anything that reads rather than looks. */}
      <span className="visually-hidden">{text}</span>

      <span aria-hidden>
        {glyphs.map((ch, i) => (
          <Glyph key={i} ch={ch} order={i} step={step} progress={progress} />
        ))}
      </span>
    </span>
  );
}

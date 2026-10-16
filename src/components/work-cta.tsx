"use client";

import Link from "next/link";
import { m, useTransform, type MotionValue } from "motion/react";

/**
 * The closing call to action, ported from `Work.tsx` in the source repo.
 *
 * Markup and class names are that component's, so the stylesheet rules carry
 * over unchanged. Three deliberate departures:
 *
 * 1. The backdrop. The reference blurs a still of its finale project behind
 *    this. Here it is not a still: the index's last card is taken to fullscreen
 *    and blurred where it plays, so what softens under the words is the actual
 *    work, still running. See `WorkFinale` — this component owns none of it.
 * 2. The staging. On the reference this sits inside a pinned 3D space and waits
 *    in depth behind the last card. There is no such space here, so it is a
 *    sticky section that arrives on its own and parts on the footer's beat.
 * 3. The words. The homepage closes a film about the studio; this closes an
 *    index of finished work, so the line points at the next piece.
 *
 * The parting IS the reference's: `FOOTER_MOTION.part` reserved the first
 * quarter of the footer beat for exactly this. One line leaves by the left
 * edge, the other by the right, each letter travelling out of frame on its own.
 */

/**
 * `FOOTER_MOTION.part` from `src/scripts/footer.ts`, with one number changed.
 *
 * `start` is 0 there because that beat begins where the WORK chapter ends — by
 * then the lockup has been on screen for the whole of it, and the reader has
 * long since read it. Here the lockup arrives inside this same beat, so a start
 * of 0 had it leaving on the frame it appeared: the letters were never still
 * long enough to be a sentence. It now sits for a quarter of the beat first.
 */
const PART = {
  start: 0.26,
  each: 0.264,
  stagger: 0.0272,
  charStagger: 0.0093,
};

/**
 * The section's own opening, before any of the parting.
 *
 * `from + (n-1) * stagger + letter` MUST stay under 1, or the clamp in `Piece`
 * stacks the tail of the lockup on the last slot and five letters arrive
 * together. At stagger 0.047 that is exactly what happened. The pace comes
 * from `letter` and from the length of the run instead — see `ENTRY.tail`.
 *
 * Read `letter` against `stagger`, never alone: their ratio is how many
 * letters are in the air at once. At 0.30 against 0.022 that was fourteen —
 * two thirds of the lockup moving together, which reads as one block fading up
 * however long it takes. At 0.12 against 0.038 it is a little over three, and
 * the line assembles letter by letter the way it is meant to.
 *
 * The whole run still has to finish inside the rise: the last letter lands at
 * 0.976, just before the section reaches the top of the window.
 *
 *
 * Read off the three stages the reference plays: the closing film arrives
 * SHARP and full screen, the lockup comes over it letter by letter while it is
 * still sharp, and the blur deepens under the words as they finish. Only then
 * does it hold, and only after that does it part.
 *
 * Scrubbed, deliberately. A half-arrived lockup over a half-blurred film is a
 * real state here — the reference shows it — because the section is pinned and
 * the reader is holding it there themselves.
 */
const OPEN = { letter: 0.17, stagger: 0.036, from: 0.02 };

export type CtaLine = { text: string; dir: 1 | -1; key?: boolean };

/**
 * The lockup. Both lines come apart letter by letter, in opposite directions.
 *
 * This is the WORK page's closing and it stays the default, because that is the
 * page this component was built for. `/about` passes its own — a reel of films
 * ends by asking for the next one; an argument about how a studio works ends
 * somewhere else entirely, and one closing cannot be both. See `AboutClosing`.
 */
const LINES: CtaLine[] = [
  { text: "Let's Make", dir: -1 },
  { text: "The Next One.", dir: 1, key: true },
];

/**
 * Which letter leads the way out — and it has to be the one nearest the edge
 * it is heading for.
 *
 * Leaving left, that is the FIRST letter; leaving right, the LAST. Get it the
 * wrong way round and the leader runs straight through everything still
 * standing behind it: the line does not come apart, it piles into a solid
 * block against the far edge, which is what the key line was doing. The source
 * only ever sends its lettered line left, so the question never arises there.
 */
const leadOrder = (i: number, length: number, dir: 1 | -1) =>
  dir === 1 ? length - 1 - i : i;

const ACTION = "Start a Project";

/** The copy, defaulting to the work page's — see `LINES`. */
type Copy = { lines?: CtaLine[]; action?: string };

/** How far out of frame a piece travels, as a share of the viewport width. */
const OUT = 140;

/**
 * One piece of the lockup: it arrives once, then leaves with the film.
 *
 * Two mechanisms on one element, and they do not collide — the arrival is an
 * `animate` on opacity and y, the departure a scroll-bound `x`. Motion keeps a
 * style MotionValue and an animated property quite happily apart.
 */
function Piece({
  p,
  e,
  at,
  order,
  dir,
  className,
  children,
}: {
  p: MotionValue<number>;
  /** The section's rise; drives the arrival. */
  e: MotionValue<number>;
  /** Where this piece sits in the departure, as a share of the beat. */
  at: number;
  /** Where it sits in the arrival. */
  order: number;
  dir: 1 | -1;
  className?: string;
  children: React.ReactNode;
}) {
  /* Arrives on the section's RISE and leaves on the footer's beat — two
     different scrolls, because they happen a screen apart. Both scrubbed, so a
     piece is wherever the reader has put it. */
  /**
   * Capped so that every piece finishes inside the rise.
   *
   * The rise tops out at 1 and never goes past it, so a slot computed beyond
   * `1 - letter` is a slot that is never reached — the piece simply stays at
   * opacity 0 for ever. That is what happened to the link the moment the
   * stagger was widened: its place in the order put it at 1.046, and it
   * vanished. A clamp makes the whole class of bug impossible rather than
   * fixing this one instance of it.
   */
  const inAt = Math.min(OPEN.from + order * OPEN.stagger, 1 - OPEN.letter);
  const to = inAt + OPEN.letter;

  /**
   * Transform and opacity only — no `filter` and no `will-change` here.
   *
   * The lockup is set at `letter-spacing: -0.045em`, so neighbouring letter
   * boxes OVERLAP. Giving each of the twenty-three its own filter and pinning
   * it with `will-change` promoted every one to its own compositing layer, and
   * overlapping layers composite independently — which is exactly the seam
   * running down through the glyphs. The focus pull moved up to the line.
   */
  const opacity = useTransform(e, [inAt, to], [0, 1]);
  const y = useTransform(e, [inAt, to], [40, 0]);

  const from = PART.start + at;
  const x = useTransform(
    p,
    [from, from + PART.each],
    ["0vw", `${dir * OUT}vw`],
  );

  return (
    <m.span className={className} style={{ x, y, opacity }}>
      {children}
    </m.span>
  );
}

/**
 * One line of the lockup, and the only thing that carries a `filter`.
 *
 * Two layers instead of twenty-three, and a line's box does not overlap its
 * neighbour's glyphs — so the focus can be pulled without cutting seams
 * through the type. It resolves over the line's OWN window: from the moment
 * its first letter starts to the moment its last one lands.
 */
function Line({
  e,
  first,
  last,
  className,
  children,
}: {
  e: MotionValue<number>;
  /** Order of this line's first and last letters. */
  first: number;
  last: number;
  className: string;
  children: React.ReactNode;
}) {
  const from = Math.min(OPEN.from + first * OPEN.stagger, 1 - OPEN.letter);
  const to =
    Math.min(OPEN.from + last * OPEN.stagger, 1 - OPEN.letter) + OPEN.letter;
  const blur = useTransform(e, [from, to], ["blur(12px)", "blur(0px)"]);

  return (
    <m.span className={className} style={{ filter: blur }}>
      {children}
    </m.span>
  );
}

const Arrow = () => (
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
);

export function WorkCta({
  progress,
  reveal,
  lines = LINES,
  action = ACTION,
}: Copy & {
  /** The footer's beat. Drives the parting. */
  progress: MotionValue<number>;
  /**
   * The lockup's own window on the closing progress, remapped to 0–1.
   *
   * Not `entry` itself any more. The closing run now has a film to take to
   * fullscreen and pull out of focus before there is anything for words to
   * stand on, and the letters own only the last stretch of it — but they still
   * want the whole of 0–1 to lay themselves out over. The remapping is done
   * where the ranges live, in WorkCarousel.
   */
  reveal: MotionValue<number>;
}) {
  /* Counted across BOTH lines, so the arrival reads as one sentence rather
     than two lines each starting over. */
  let order = 0;

  return (
    <section className="work__cta" aria-labelledby="cta-heading">
      <h2 className="work__cta-title" id="cta-heading">
        {lines.map((line, l) => {
          const first = order;
          const last = order + line.text.length - 1;
          return (
            <Line
              key={line.text}
              e={reveal}
              first={first}
              last={last}
              className={`work__cta-line${line.key ? " work__cta-line--key" : ""}`}
            >
              {/* The whole line, once, for anything that reads rather than
                looks — the letters below are decoration to it. */}
              <span className="visually-hidden">{line.text}</span>

              {Array.from(line.text).map((ch, i) => (
                <Piece
                  key={`${l}-${i}`}
                  p={progress}
                  e={reveal}
                  /* The line's own place first, then the letter's within it, so
                   the second line follows the first rather than racing it. */
                  at={
                    PART.stagger * l * 2 +
                    leadOrder(i, line.text.length, line.dir) * PART.charStagger
                  }
                  order={order++}
                  dir={line.dir}
                  className="work__cta-char"
                >
                  {/* A plain space inside an `inline-block` collapses to nothing,
                    which ran the words together — THENEXTONE. A no-break space
                    keeps its width and travels with the rest. */}
                  {ch === " " ? " " : ch}
                </Piece>
              ))}
            </Line>
          );
        })}
      </h2>

      <div className="work__cta-action">
        {/* Goes right WITH the key line, not a beat ahead of it — the two are
            the same thought, so they leave together. Arrives last, though: it
            is what there is to do once the line has been read. */}
        <Piece
          p={progress}
          e={reveal}
          at={PART.stagger * (lines.length - 1) * 2}
          /* Straight after the last letter — no arbitrary gap. */
          order={order}
          dir={1}
          /* `inline-block`, and it matters: a transform has NO effect on a
             non-replaced inline element, so without this the link neither rose
             with the lockup nor left with it — and its hit box did not follow
             what was drawn, which is why the hover felt broken. The letters
             get the same from `.work__cta-char`. */
          className="inline-block"
        >
          <Link href="/contact" className="header-cta work__cta-link">
            <span className="header-cta__label">
              <span className="header-cta__roll" data-text={action}>
                <span>{action}</span>
              </span>
            </span>
            <span className="header-cta__arrow" aria-hidden="true">
              <Arrow />
            </span>
          </Link>
        </Piece>
      </div>
    </section>
  );
}

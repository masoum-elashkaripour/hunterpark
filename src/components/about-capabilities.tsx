"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  cubicBezier,
  m,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRun } from "@/components/use-beat";
import { LazyVideo } from "@/components/lazy-video";
import { ScatterChars } from "@/components/scatter-chars";

/**
 * Chapter 03 — What we do: one reveal, chained across five pictures.
 *
 * The five steps are not animated independently. A SINGLE scroll progress
 * runs a point along a polyline laid over their real geometry, and every piece
 * of the chapter owns one stretch of it, in the order the reader meets them:
 *
 *   TL₁ ─▶ BR₁ ─▶ words₁ ─▶ TL₂ ─▶ BL₂ ─▶ words₂ ─▶ TR₃ ─▶ … ─▶ words₅
 *
 * While the point crosses a picture's diagonal, that picture's visible area
 * grows from one corner — and the growing rectangle's own opposite corner IS
 * the point, so it arrives at the far corner exactly as the diagonal ends. The
 * point then spends that step's WORDS segment on its title and line, and only
 * after those have landed does the next picture begin. Nothing is ever in two
 * places at once.
 *
 * THE PICTURES TOUCH, and every join is a SINGLE POINT rather than two corners
 * near each other. Two things make that true, both in the stylesheet and both
 * load-bearing: the rows are flush, so the y of a join matches, and the columns
 * are exact halves, so the x does.
 *
 *   01  LEFT    opens TL              ends bottom-RIGHT  ● at x = 50%
 *   02  RIGHT   opens TL at 01's BR   ends bottom-LEFT   ● at x = 50%
 *   03  LEFT    opens TR at 02's BL   ends bottom-RIGHT  ● at x = 50%
 *   04  RIGHT   opens TL at 03's BR   ends bottom-LEFT   ● at x = 50%
 *   05  LEFT    opens TR at 04's BL
 *
 * The side alternates strictly and the picture always has its words opposite
 * it. Which corner a step opens from is then not a choice at all: the join is
 * always on the 50% line — the only line two half-columns share — so it is
 * whichever bottom corner of the step above happens to sit there.
 *
 * The handover is the geometry itself. An earlier pass drew a lime connector
 * across a gap instead, and a later one carried each frame along a path from
 * the step above; a line is what you need when the corners do not meet, and a
 * path is what you need when the picture is not born at one.
 *
 * The apportioning is MEASURED, not counted: every stretch gets the share of
 * the run that matches how far DOWN THE PAGE it carries the reader — the
 * picture's own height, and the words' own height weighted a little. That is
 * what makes this read as one path rather than as several reveals that happen
 * to be in order.
 *
 * Geometry is read on mount, on resize and whenever the container changes size
 * (`ResizeObserver`), never per frame. Per frame there is one rect read for the
 * container and then arithmetic. Nothing but `clip-path` and `transform` is
 * touched, so no frame triggers layout.
 */

/**
 * Where the words ride inside their OWN segment — not inside the picture's.
 *
 * They used to sit at 0.62 → 1 of the image's diagonal, which is why the title
 * was already arriving while the picture was still opening. Now the image
 * finishes first, by construction: these are stops on a stretch of the route
 * that does not begin until the image's does.
 *
 * The title's share widened from 0.62 to 0.72 and the line's start moved with
 * it, which keeps the two in the same relationship — the line still opens while
 * the title is about three quarters sorted — while handing the title more of
 * the segment. Read against `WORDS_WEIGHT` below, that is where the slower
 * settle comes from.
 */
/**
 * The curve every piece of this chapter is read through.
 *
 * The share a step gets of the run is fixed by the layout. What a curve CAN do
 * is spend that distance differently: eased, a reveal gives its middle to the
 * fast part of the move and its ends to the slow part, so the corner creeps
 * away from its origin, crosses, and decelerates into place instead of
 * travelling the diagonal at one rate.
 *
 * SYMMETRIC, and the previous value was not — it was `0.16, 0, 0.16, 1`, with a
 * note here claiming it was "flatter at both ends". Evaluated, it is the
 * opposite: 0.141 at an input of 0.1 and 0.835 by 0.5, so five sixths of the
 * move happened in the first half of the stretch and the rest crawled. That is
 * what "the animation is too fast and you cannot tell what it is" actually was
 * — not a stretch too short, a stretch spent almost entirely before the eye had
 * arrived. Measuring the curve was the only way to see it; it reads like a
 * slow-out curve in the source.
 *
 * `0.62, 0, 0.3, 1` passes through roughly 0.5 at 0.5 and is gentle at both
 * ends, so the move is slowest exactly where the reader is looking: at the
 * start, and at the landing.
 */
const EASE = cubicBezier(0.62, 0, 0.3, 1);

/**
 * Now that the words share the picture's stretch, these are shares of the SAME
 * span the reveal runs on — so the numbers say directly how the two track.
 *
 * The title now owns the WHOLE of it. With fewer letters in the air at a time
 * (see `SPAN` in `ScatterChars`) each one's own slice is shorter, and the only
 * place the time to spend on it can come from is the stretch the title is given
 * — so it is given all of it, and the last glyph lands as the last corner does.
 * The line closes under it over the final quarter.
 */
const TITLE: [number, number] = [0, 1];
const LINE: [number, number] = [0.72, 1];

/**
 * How much longer a step's words run than their own height.
 *
 * See `measure` — the only number in the route that is a judgement rather than
 * a reading. At 1.0 the title and the line share about 8% of the chapter, which
 * is enough to draw them and not enough to read them.
 *
 * 2.4 rather than 1.6, and this is where the titles slowed down. The scatter is
 * bounded by its slice of the words segment, so the only way to give a glyph
 * longer to find its place is to make the segment longer — the animation itself
 * is untouched, it simply has half again as much scroll to happen over. With
 * the wider `TITLE` share above, a title now settles over 2.7× the scroll it
 * used to.
 */
const WORDS_WEIGHT = 3.2;

/**
 * And the same lever for the pictures.
 *
 * A picture's share of the run was its own height — the distance the reader
 * scrolls while it is on screen — which makes its window open at roughly the
 * speed the page is moving. That is correct and it is also brisk. 1.8 gives
 * each reveal nearly twice the scroll to open across, so the corner travels its
 * diagonal at the pace the homepage's chapters move rather than the pace the
 * layout happens to.
 */
const IMAGE_WEIGHT = 1.8;

/**
 * Scroll the run holds back, as a share of the staircase's own height.
 *
 * Spent on nothing: it exists so the last step has landed and been read before
 * the closing sequence takes its picture — see `measure`.
 *
 * It has to GROW WITH THE RUN, which is the trap.
 *
 * And it is a trap with no way through: the zoom is armed by the last step's
 * words crossing the header, which is fixed by the LAYOUT and does not move
 * when the run gets longer. So lengthening the run pushes the last step past
 * the trigger, and the only cure is more slack here — which shrinks every
 * step's share of the longer run by about as much as the extra length added.
 * Measured both ways: at `to: -1.35` with this at 0.78 the clearance went to
 * −0.23 screens, and raising it far enough to recover left each step with LESS
 * scroll than it started with. The staircase's budget is set by its own height,
 * and that is a layout fact, not a timing one. Lengthening the run to slow
 * the steps down pushes the last of them later in absolute scroll while the
 * zoom's trigger — the words crossing the header — does not move at all; at
 * 0.36 against the longer run the clearance went to −0.03 screens and the fifth
 * step was being taken mid-arrival again. Measured back to +0.26 here. Any
 * future change to `useRun` has to be checked against this number, not assumed
 * safe.
 */
const TAIL = 0.55;

/**
 * The title's two states, after the studio chapter on the live build.
 *
 * There the list of disciplines stands in a dormant grey and the one the reader
 * is on is lime; here there is one title per step, so the step's own title goes
 * from dormant to live as its line lands under it. Scroll-driven like
 * everything else — the colour is a position on the run, not a hover or a class
 * that gets toggled.
 *
 * Both measured against the page's ground (#0d0d0d) rather than judged: the
 * dormant grey is 3.59:1 and the lime 17.6:1, so the title clears AA for large
 * text at BOTH ends and a reader who stops half way is never left with a
 * heading they cannot read. #5a5a5a, which is nearer the reference, is 2.82:1
 * and does not.
 */
const TITLE_INK = { dormant: "#6a6a6a", live: "#eeff41" };

export type Capability = {
  /**
   * A moving step. When present the frame plays this instead of showing `src`,
   * and `src` becomes its poster — the frame it holds until the first decoded
   * picture, and the still anything without video falls back to.
   */
  video?: string;
  id: string;
  title: string;
  line: string;
  src: string;
  /**
   * The corner the reveal grows FROM, and it is not a style choice — it is
   * whichever corner the step above finished on. See the chain in the file
   * header; get one wrong and that step is born somewhere nothing arrived.
   */
  open: "tl" | "tr";
};

/**
 * The five disciplines.
 *
 * TITLES, ORDER AND PICTURES are the live build's own, lifted from
 * `hunterpark.vercel.app` rather than invented — the page carries them as
 * `data-caps-item` buttons and `data-caps-layer` media, five of each.
 *
 * THE LINES ARE NOT. The homepage runs a single clause per discipline, which
 * reads as a caption to a photograph rather than as an answer to "what do you
 * actually do"; these say one thing more than that and then stop. Two sentences
 * is the size the layout wants — a column beside a half-width picture, read in
 * the time it takes the next step to arrive — and each is built differently
 * from the others, so five in a row do not read as a template with the nouns
 * swapped.
 */
export const CAPABILITIES: Capability[] = [
  {
    id: "film",
    title: "Film & Video",
    line: "Commercials, branded films and fashion work, boarded, crewed, shot and cut by one team — so what was promised in the pitch is what lands in the edit. Every project leaves with the full set of ratios a modern buy consumes.",
    src: "/poster/sample-2.jpg",
    video: "/video/sample-2.mp4",
    open: "tl",
  },
  {
    id: "direction",
    title: "Creative Direction",
    line: "Everything decided before a camera is switched on: the idea, then what it has to look like to be believed. Concept, casting, styling, location and movement — each one a decision rather than a default.",
    src: "/capabilities/direction.jpg",
    open: "tl",
  },
  {
    id: "campaigns",
    title: "Campaigns",
    line: "Campaign worlds built to survive every placement they will meet — broadcast, social, retail, out of home. Work for CoverGirl, Saks OFF 5TH and Joe Fresh is made this way: one shoot, one visual language, assets cut per channel.",
    src: "/capabilities/campaigns.jpg",
    open: "tr",
  },
  {
    id: "photography",
    title: "Photography",
    line: "Stills shot on the same days and the same sets as the film, by people who light for motion. It is what keeps a campaign's photography and its film looking like one piece of work rather than two shoots.",
    src: "/capabilities/photography.jpg",
    open: "tl",
  },
  {
    id: "production",
    title: "Production",
    line: "The machinery under all of it: crewing, casting, locations and permits, schedule, insurance, budget. Studio or location, two people or a full unit — the part a client should never have to think about.",
    src: "/poster/sample-11.jpg",
    video: "/video/sample-11.mp4",
    open: "tr",
  },
];

/** One stretch of the route: where it starts and how long it runs. */
type Seg = { at: number; len: number };
/** The measured route: each picture and each step's words, end to end. */
type Route = { img: Seg[]; txt: Seg[]; total: number };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ---------------------------------------------------------------- step --- */

function Step({
  item,
  index,
  reveal,
  words,
  onFrame,
  onBody,
  last,
}: {
  item: Capability;
  index: number;
  /** This image's own 0→1, carved out of the shared run. */
  reveal: MotionValue<number>;
  /** Its words' own 0→1, which does not start until the image's has ended. */
  words: MotionValue<number>;
  onFrame: (index: number, el: HTMLElement | null) => void;
  onBody: (index: number, el: HTMLElement | null) => void;
  /** The one the closing sequence takes to fullscreen. */
  last: boolean;
}) {
  /**
   * The picture is BORN AT A CORNER and grows out of it.
   *
   * An `inset()` anchored at one corner with the two opposite sides falling to
   * zero keeps the box pinned to that corner while its own opposite corner
   * travels the diagonal — so the moving corner IS the point on the chain, by
   * construction rather than by coincidence.
   *
   * It was a travelling frame for a while: the whole picture carried along a
   * line from the step above. That reads as something being delivered, not as
   * something unfolding, and it left a visible gap between a picture's final
   * edge and the next one's starting point. Growing from the shared corner is
   * the only version where there is nothing between them to see.
   */
  /* Eased before anything reads it, so the clip, the scale and the words all
     share one curve rather than each getting its own — see `EASE`. */
  const opening = useTransform(reveal, [0, 1], [0, 1], { ease: EASE });

  const clip = useTransform(
    opening,
    [0, 1],
    [
      item.open === "tr" ? "inset(0% 0% 100% 100%)" : "inset(0% 100% 100% 0%)",
      "inset(0% 0% 0% 0%)",
    ],
  );
  /* The picture settles back as its window opens, so it arrives moving. */
  const scale = useTransform(opening, [0, 1], [1.1, 1]);

  /** The title's own slice of this step's words — see `ScatterChars`. */
  const sort = useTransform(words, TITLE, [0, 1], { ease: EASE });
  /* Dormant until its own line lands under it — see `TITLE_INK`. */
  const titleInk = useTransform(words, LINE, [
    TITLE_INK.dormant,
    TITLE_INK.live,
  ]);
  const lineOpacity = useTransform(words, LINE, [0, 1], { ease: EASE });
  const lineY = useTransform(words, LINE, [18, 0], { ease: EASE });

  return (
    <li className="stair" data-step={index}>
      <m.figure
        ref={(el) => onFrame(index, el)}
        className="stair__frame"
        style={{ clipPath: clip }}
        /* The handle the closing sequence opens its window on. On the LAST
           step only — see `AboutFinale`, which measures this box and lifts the
           picture out of it. */
        {...(last ? { "data-about-finale": "" } : {})}
      >
        <m.div className="stair__media" style={{ scale }}>
          {item.video ? (
            /**
             * It plays from the moment it is mounted and is never paused — not
             * when it leaves the window, and not when the closing sequence
             * lifts it to fullscreen.
             *
             * The handle is what the closing layer reads: it continues THIS
             * playhead rather than starting a second one, so the picture that
             * fills the screen is the frame the reader was already watching.
             * See `AboutFinale`.
             */
            <LazyVideo
              data-about-finale-video={last ? "" : undefined}
              className="stair__img"
              src={item.video}
              poster={item.src}
            />
          ) : (
            <Image
              src={item.src}
              alt=""
              fill
              sizes="(max-width: 767px) 92vw, 46vw"
              quality={90}
              className="stair__img"
            />
          )}
        </m.div>
      </m.figure>

      <div
        ref={(el) => onBody(index, el)}
        className="stair__body"
        /* TIMING for the closing zoom, as distinct from its PICTURE — see
           `AboutClosing`. The brief is "when the words have landed and the
           title reaches the header", and the title is in here, not in the
           frame: the frame's top edge crosses the header the better part of a
           hundred pixels earlier, because the words are centred against it. */
        {...(last ? { "data-about-finale-mark": "" } : {})}
      >
        {/* The mask is the parent; the motion is on the child. One element
            cannot both clip and be clipped. */}
        {/* The glyphs arrive from everywhere and sort themselves onto the
            line. NO MASK around them, unlike the chapter heading above: a mask
            is `overflow: hidden`, and every letter here begins outside the box
            it ends in. */}
        <m.h3 className="stair__title" style={{ color: titleInk }}>
          <ScatterChars text={item.title} progress={sort} />
        </m.h3>

        <m.p
          className="hp-copy stair__line"
          style={{ opacity: lineOpacity, y: lineY }}
        >
          {item.line}
        </m.p>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------- chapter --- */

export function AboutCapabilities() {
  /**
   * The widest passage the container has.
   *
   * `useRun`'s default is "top at 0.88 of the viewport" to "bottom at 0.55" —
   * a third of a screen of lead-in and a late finish, which suits a block that
   * does one thing. This chapter does ten, and the run is the only scroll they
   * have to divide between them, so it is opened to very nearly the container's
   * whole passage: from the moment the first picture's corner clears the fold
   * to the moment the last line leaves the top. That is a quarter again as
   * much distance for the same choreography.
   */
  const [runRef, run] = useRun(1.02, -0.28);
  const container = useRef<HTMLOListElement | null>(null);
  const frames = useRef<(HTMLElement | null)[]>([]);
  const bodies = useRef<(HTMLElement | null)[]>([]);

  /* Written on mount and on resize, never per frame. */
  const [route, setRoute] = useState<Route | null>(null);

  /** One value per picture and one per set of words. */
  const r0 = useMotionValue(0);
  const r1 = useMotionValue(0);
  const r2 = useMotionValue(0);
  const r3 = useMotionValue(0);
  const r4 = useMotionValue(0);
  const t0 = useMotionValue(0);
  const t1 = useMotionValue(0);
  const t2 = useMotionValue(0);
  const t3 = useMotionValue(0);
  const t4 = useMotionValue(0);
  /* Grouped once. The MotionValues are stable for the component's life; a fresh
     array literal each render would re-subscribe the walker below for nothing. */
  const reveals = useMemo(() => [r0, r1, r2, r3, r4], [r0, r1, r2, r3, r4]);
  const texts = useMemo(() => [t0, t1, t2, t3, t4], [t0, t1, t2, t3, t4]);

  const onFrame = useCallback((i: number, el: HTMLElement | null) => {
    frames.current[i] = el;
  }, []);
  const onBody = useCallback((i: number, el: HTMLElement | null) => {
    bodies.current[i] = el;
  }, []);

  /**
   * Measure the route.
   *
   * Everything is read relative to the container, so the numbers survive the
   * page scrolling under them, and nothing is hard-coded: the staircase's
   * offsets, the gaps and the breakpoint that collapses it to one column all
   * come out in the rects.
   */
  const measure = useCallback(() => {
    const host = container.current;
    const els = frames.current.filter(Boolean) as HTMLElement[];
    if (!host || els.length < 2) return;

    /* Heights only. The corners no longer need to be known here: the steps
       TOUCH, so where one ends and the next begins is a fact of the layout
       rather than a pair of points to join up at runtime. */
    const tall = (el: HTMLElement) => el.getBoundingClientRect().height;
    const rects = els.map((el) => ({ h: tall(el) }));
    const words = bodies.current.map((el) => (el ? { h: tall(el) } : null));

    const img: Seg[] = [];
    const txt: Seg[] = [];
    let at = 0;

    rects.forEach((r, i) => {
      /**
       * ONE STRETCH PER STEP, and the words ride it with the picture.
       *
       * They used to queue: the picture opened over its own length, and only
       * once it had finished did the title begin. Two consecutive moves out of
       * what the eye reads as one event — and it cost double, because a step's
       * share of the run was the sum of the two rather than the longer of them.
       * Half the chapter's scroll was being spent putting things in a line.
       *
       * Sharing it buys the reveal about half again as much distance at no
       * cost in layout, and the step now behaves the way a step looks: the
       * window opens, the title sorts itself out across it, the line lands
       * under the title. One thing arriving, not three things taking turns.
       */
      const b = words[i];
      const len = Math.max(
        r.h * IMAGE_WEIGHT,
        (b ? b.h : r.h * 0.4) * WORDS_WEIGHT,
      );
      img.push({ at, len });
      txt.push({ at, len });
      at += len;

      /* And nothing between the steps: they touch, so the corner this one
         finishes on is the corner the next one opens from. */
    });

    /**
     * SLACK AT THE END, and it is what stops the closing eating the last step.
     *
     * The zoom is armed by the last step's words crossing the header — it is
     * not on this run and cannot be, because it belongs to the sequence after
     * it. So the two have to be made not to collide, and the only way that
     * holds at every window size is to leave the run some distance it does not
     * spend: the fifth step finishes here, and the rest is quiet before the
     * picture is taken to fullscreen.
     *
     * Without it the fifth title was still assembling as its own frame began
     * to zoom — the one step the reader never got to read.
     */
    at += host.getBoundingClientRect().height * TAIL;

    setRoute({ img, txt, total: at });
  }, []);

  useEffect(() => {
    const host = container.current;
    if (!host) return;

    /* Deferred a frame: the figures have just been committed and may not be
       laid out, and a route built from zero-sized rects is a route of zeroes. */
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  /** Walk the point along the route and hand each piece its own share. */
  useEffect(() => {
    if (!route || route.total <= 0) return;

    const paint = (v: number) => {
      const d = v * route.total;
      const share = (seg: Seg) => clamp01((d - seg.at) / seg.len);
      route.img.forEach((seg, i) => reveals[i]?.set(share(seg)));
      route.txt.forEach((seg, i) => texts[i]?.set(share(seg)));
    };

    paint(run.get());
    return run.on("change", paint);
  }, [run, route, reveals, texts]);

  return (
    <section className="caps-section px-gutter" aria-labelledby="caps-heading">
      {/**
       * THE HEADING IS DRAWN HERE, and it SCROLLS.
       *
       * It used to be `visually-hidden`, on the reasoning that chapter 02's
       * crossing title already delivers these words and a second copy would be
       * the same words twice. That was right about the duplication and wrong
       * about what happens next: the chapter above is a PINNED stage, so its
       * title can only fade where it stands. It cannot travel with the pictures
       * it names, and fading is what the reader was seeing.
       *
       * Drawn here it is in ordinary flow — it sits above the first film and
       * moves with it, which is what a section heading does. The crossing title
       * above still performs the exchange; this is the thing it hands to.
       */}
      <h2 id="caps-heading" className="caps-section__head">
        What we do
      </h2>

      <ol
        ref={(el) => {
          container.current = el;
          runRef(el);
        }}
        className="caps-stairs"
      >
        {CAPABILITIES.map((item, i) => (
          <Step
            key={item.id}
            item={item}
            index={i}
            reveal={reveals[i]}
            words={texts[i]}
            onFrame={onFrame}
            onBody={onBody}
            last={i === CAPABILITIES.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}

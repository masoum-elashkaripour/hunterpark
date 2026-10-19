"use client";

import Image from "next/image";
import { useEffect, useRef, useSyncExternalStore } from "react";
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
/* Slower blinds: 0.07 of the chapter (~740px of scroll at 900px) where the
   iris had 0.042. The tightest gap between two pictures is ~0.10, so this
   still leaves each one a stretch of standing still after it lands. */
export const REVEAL = 0.07;

/**
 * The closed rectangle, as insets — measured off the live build.
 *
 * 50% top and bottom is a line of no height; 31% left and right leaves a narrow
 * column of it. Opening both to 0 grows that band into the whole frame, and the
 * asymmetry is the character of the move: it travels much further vertically
 * than horizontally, so it reads as unfolding rather than as a box being scaled.
 */
/**
 * THE BLINDS — this replaced the inset iris above. The next picture is let in
 * through horizontal slats, a venetian blind opening over the one before (the
 * way tokonoma.xyz changes its pictures). Every slat opens from its own top
 * edge at once, so the change reads as one shutter rather than a wipe.
 */
const SLATS = 7;
const BAND = 100 / SLATS;

/**
 * How still the page has to be before a picture finishes opening.
 *
 * Short enough that letting go and watching is one gesture rather than two,
 * long enough that it does not fire between the frames of an ordinary scroll.
 */
const SETTLE_AFTER = 160;

/** The auto-complete. Long and soft — this is the move's whole character. */
const SETTLE = { duration: 1.8, ease: [0.25, 0.8, 0.3, 1] as const };

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

/**
 * ON A PHONE the pictures change as the home page's What We Do media do (scripts/
 * capabilities.ts): each new picture is cut in from an edge — top, right, bottom, left in turn —
 * over the one before, which stays put beneath it, and the picture inside settles as it comes,
 * from a slight zoom and a few per cent toward the edge it enters from. Desktop keeps the blinds.
 */
const EDGES = ["inset(0% 0% 100% 0%)", "inset(0% 0% 0% 100%)", "inset(100% 0% 0% 0%)", "inset(0% 100% 0% 0%)"];
const SHIFTS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
/** The settle, as there: from 1.16× and 6% off, over 1.3 times the cut's own stretch. */
const SETTLE_FROM = { scale: 1.16, shift: 6, span: 1.3 };
/** A change, played whole: its length (s) and curve — a long, soft in-out, unhurried. */
const PLAY = { cut: 1.8, ease: [0.65, 0, 0.35, 1] as const };
/**
 * …and how long a picture, once whole, is left standing before the next may begin. The scroll
 * says which picture SHOULD be in front; the pictures follow it one at a time on this clock, so
 * however fast the cards above them arrive, every picture is seen whole before the next cuts in.
 */
const PLAY_HOLD = 1.1;
const PHONE_Q = "(max-width: 767px)";
const subscribePhone = (change: () => void) => {
  const mq = window.matchMedia(PHONE_Q);
  mq.addEventListener("change", change);
  return () => mq.removeEventListener("change", change);
};
const usePhone = () =>
  useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_Q).matches, () => false);

/** One picture, growing out of the band at the centre of the frame. */
function Panel({
  shot,
  from,
  order,
  front,
  first,
  progress,
  priority,
}: {
  shot: Shot;
  /** Where this picture finishes opening, on the chapter's own 0→1. */
  from: number;
  /** Its place in the stack — which edge it is cut in from. */
  order: number;
  /** On a phone: the picture the sequencer has brought to the front (see `TalentStack`). */
  front: MotionValue<number>;
  /** The first is the ground the rest open over — always whole. */
  first: boolean;
  progress: MotionValue<number>;
  priority: boolean;
}) {
  const window_ = [from - REVEAL, from];
  const phone = usePhone();

  /* The phone's cut: PLAYED, not scrubbed. Scrubbed, a change stopped wherever the page did —
     a picture left half cut in. Here the scroll only decides WHICH picture is in front (past
     the middle of its stretch: this one; short of it: the one before), and the change itself
     runs whole on its own clock — the frame opened from its edge, the picture inside settling
     from its zoom and offset over a little longer — and back the same way. */
  const edgeFrom = EDGES[order % EDGES.length];
  const [shx, shy] = SHIFTS[order % SHIFTS.length];
  const cut = useMotionValue(first ? 1 : 0);
  const settle = useMotionValue(first ? 1 : 0);
  const shownRef = useRef(first);
  useEffect(() => {
    if (first) return;
    const toward = (v: number) => {
      const want = v >= order;
      if (want === shownRef.current) return;
      shownRef.current = want;
      animate(cut, want ? 1 : 0, { duration: PLAY.cut, ease: PLAY.ease });
      animate(settle, want ? 1 : 0, { duration: want ? PLAY.cut * SETTLE_FROM.span : PLAY.cut, ease: PLAY.ease });
    };
    // where the sequence already stands, at once (no change played on arrival mid-chapter)
    const now = front.get() >= order;
    shownRef.current = now;
    cut.set(now ? 1 : 0);
    settle.set(now ? 1 : 0);
    return front.on("change", toward);
  }, [first, order, front, cut, settle]);
  const clip = useTransform(cut, (v) => {
    const m = edgeFrom.match(/[\d.]+/g)!.map(Number);
    const k = 1 - v;
    return `inset(${m[0] * k}% ${m[1] * k}% ${m[2] * k}% ${m[3] * k}%)`;
  });
  const innerScale = useTransform(settle, [0, 1], [SETTLE_FROM.scale, 1]);
  const innerX = useTransform(settle, [0, 1], [`${shx * SETTLE_FROM.shift}%`, "0%"]);
  const innerY = useTransform(settle, [0, 1], [`${shy * SETTLE_FROM.shift}%`, "0%"]);

  /* How far each slat has opened, as a share of its band — 0 shut, BAND
     fully open (a hair past it, so no seam is left between slats). */
  const open = useTransform(progress, window_, [0, BAND + 0.05], {
    ease: EASE,
  });
  const mask = useMotionTemplate`repeating-linear-gradient(to bottom, #000 0%, #000 ${open}%, transparent ${open}%, transparent ${BAND}%)`;

  if (phone) {
    return (
      <m.div className="talent-stack__panel talent-stack__panel--cut" style={first ? undefined : { clipPath: clip }}>
        <m.div className="absolute inset-0" style={first ? undefined : { scale: innerScale, x: innerX, y: innerY }}>
          <Image
            src={shot.src}
            alt={shot.alt ?? ""}
            fill
            sizes="100vw"
            quality={90}
            priority={priority}
            /* every picture fetched up front: a cut must never open on an empty frame */
            loading="eager"
            className="talent-stack__img"
          />
        </m.div>
      </m.div>
    );
  }

  return (
    <m.div
      className="talent-stack__panel"
      style={
        first ? undefined : { maskImage: mask, WebkitMaskImage: mask }
      }
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

/**
 * ON A PHONE: a SLIDESHOW. The act stands on screen for a swipe or two, far too short for the
 * portraits to be tied to the cards arriving (they were still turning after the act had gone).
 * So while the act is on screen the portraits take turns on their own clock, round and round:
 * each one cut in from an edge — top, right, bottom, left in turn — over the one before (which
 * stays put beneath it), the picture inside settling from a slight zoom and offset, then left
 * whole for a moment before the next. Off screen the clock stops; back on, it carries on.
 */
const SHOW = { cut: 1.3, hold: 1.7 };
function PhoneStack({ shots, progress, bounds }: { shots: Shot[]; progress: MotionValue<number>; bounds: number[] }) {
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const els = panels.current;
    const n = shots.length;
    if (n < 2) return;
    let cur = 0;
    let z = n;
    let timer = 0;
    let run: { stop: () => void } | null = null;
    const live = () => {
      const v = progress.get();
      return v >= bounds[0] && v <= bounds[bounds.length - 1] && !document.hidden;
    };
    const paint = (el: HTMLDivElement, k: number, order: number) => {
      const m = EDGES[order % EDGES.length].match(/[\d.]+/g)!.map(Number);
      const r = 1 - k;
      el.style.clipPath = `inset(${m[0] * r}% ${m[1] * r}% ${m[2] * r}% ${m[3] * r}%)`;
      const inner = el.firstElementChild as HTMLElement | null;
      if (inner) {
        const [sx, sy] = SHIFTS[order % SHIFTS.length];
        const e = 1 - Math.pow(1 - k, 3);
        const sc = 1 + (SETTLE_FROM.scale - 1) * (1 - e);
        inner.style.transform = `translate(${sx * SETTLE_FROM.shift * (1 - e)}%, ${sy * SETTLE_FROM.shift * (1 - e)}%) scale(${sc})`;
      }
    };
    // the first standing, whole; the rest waiting, shut
    els.forEach((el, i) => {
      if (!el) return;
      el.style.zIndex = String(i === 0 ? n : 0);
      paint(el, i === 0 ? 1 : 0, i);
    });
    const next = () => {
      if (!live()) {
        timer = window.setTimeout(next, 500);
        return;
      }
      const to = (cur + 1) % n;
      const el = els[to];
      if (!el) return;
      z += 1;
      el.style.zIndex = String(z);
      paint(el, 0, to);
      run = animate(0, 1, {
        duration: SHOW.cut,
        ease: PLAY.ease,
        onUpdate: (k) => paint(el, k, to),
      });
      cur = to;
      timer = window.setTimeout(next, (SHOW.cut + SHOW.hold) * 1000);
    };
    timer = window.setTimeout(next, SHOW.hold * 1000);
    return () => {
      window.clearTimeout(timer);
      run?.stop();
    };
  }, [shots.length, progress, bounds]);

  return (
    <div className="talent-stack" aria-hidden>
      {shots.map((shot, i) => (
        <div
          key={shot.src}
          ref={(el) => {
            panels.current[i] = el;
          }}
          className="talent-stack__panel talent-stack__panel--cut"
        >
          <div className="absolute inset-0">
            <Image
              src={shot.src}
              alt={shot.alt ?? ""}
              fill
              sizes="100vw"
              quality={90}
              priority={i === 0}
              loading="eager"
              className="talent-stack__img"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TalentStack(props: {
  shots: Shot[];
  bounds: number[];
  progress: MotionValue<number>;
}) {
  const phone = usePhone();
  return phone ? <PhoneStack {...props} /> : <DeskStack {...props} />;
}

function DeskStack({
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

  /* ON A PHONE, the sequencer: the scroll says how many pictures should be up (one per stage
     edge passed — a change counts from the middle of its stretch), and `front` steps toward
     that one picture at a time, a change and a hold apart (`PLAY`, `PLAY_HOLD`) — up or down. */
  const front = useMotionValue(0);
  useEffect(() => {
    const target = (v: number) => {
      let k = 0;
      for (let i = 1; i < shots.length; i += 1) if (v >= bounds[i] - REVEAL / 2) k = i;
      return k;
    };
    front.set(target(progress.get()));
    let timer = 0;
    let busy = false;
    const step = () => {
      const want = target(progress.get());
      const at = front.get();
      if (want === at) {
        busy = false;
        return;
      }
      busy = true;
      front.set(at + Math.sign(want - at));
      // forward, each picture is left whole a while; back, the pictures close at a change's pace
      timer = window.setTimeout(step, (PLAY.cut + (want > at ? PLAY_HOLD : 0)) * 1000);
    };
    const off = progress.on("change", () => {
      if (!busy) step();
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, [progress, bounds, shots.length, front]);

  return (
    <div className="talent-stack" aria-hidden>
      {shots.map((shot, i) => (
        <Panel
          key={shot.src}
          shot={shot}
          from={bounds[i]}
          order={i}
          front={front}
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

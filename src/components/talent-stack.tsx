"use client";

import Image, { getImageProps } from "next/image";
import { preload } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
/** Where Talent is the casting board (`PhoneStack`): a phone, and a tablet held upright — the
    desktop's column, narrowed to a portrait frame, could not line its parts up. Kept in step
    with `BOARD_MEDIA` in about-studio.tsx and the board's own stylesheet rules. */
export const BOARD_Q = "(max-width: 767px), (min-width: 768px) and (max-width: 1366px) and (orientation: portrait)";
const subscribeBoard = (change: () => void) => {
  const mq = window.matchMedia(BOARD_Q);
  mq.addEventListener("change", change);
  return () => mq.removeEventListener("change", change);
};
const useBoard = () =>
  useSyncExternalStore(subscribeBoard, () => window.matchMedia(BOARD_Q).matches, () => false);

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

  /* The first picture is fetched up front — but only where this stack is the one shown. The
     server renders this branch for every screen (it cannot know a phone), so a plain `priority`
     made each phone download a full-size frame it never shows, ahead of the page's own hero.
     The preload carries a media query instead; the lazy <img> then finds it already cached. */
  const desk = { src: shot.src, alt: shot.alt ?? "", fill: true, sizes: "(max-width: 1023px) 86vw, 34vw", quality: 90 } as const;
  if (priority) {
    const { props } = getImageProps(desk);
    preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes, fetchPriority: "high", media: "(min-width: 768px)" });
  }

  return (
    <m.div
      className="talent-stack__panel"
      style={
        first ? undefined : { maskImage: mask, WebkitMaskImage: mask }
      }
    >
      <Image {...desk} className="talent-stack__img" />
    </m.div>
  );
}

/**
 * ON A PHONE: A CASTING BOARD — the home page's Work chapter's way of showing one thing at a
 * time (a title over a single card, its neighbours at the edges, a line under it), turned to
 * the four roles. Over the card, a slate: the take's number and the role's name, rolled in
 * on each change. The card in front stands in a viewfinder — four lime corners that close on
 * it as it settles — its neighbours turned a few degrees away and dimmed at the screen's
 * edges, as prints laid out on a table. Under it, what the role covers. While the act is on screen the roles are called in turn; a swipe
 * or a tap on a neighbour calls one at once, and so does a tap on a role elsewhere
 * (`talent:pick`). The four role names stay in the page for a screen reader (see globals.css).
 */
const BOARD = { intro: 1.4, hold: 4.4 };
/** A card at slot `f` — 0 in front, ±1 at the edges, ±2 out of sight, and anywhere between
    while a finger holds the board: every value runs continuously, so a card on its way in
    grows and lights as it comes, as the home page's Work slider does. */
function place(el: HTMLElement, f: number) {
  const a = Math.min(Math.abs(f), 2);
  el.style.setProperty("--x", f.toFixed(4));
  el.style.setProperty("--s", (1 - 0.18 * Math.min(a, 1)).toFixed(4));
  el.style.setProperty("--r", `${(Math.max(-1, Math.min(1, f)) * 4).toFixed(3)}deg`);
  el.style.setProperty("--o", (a <= 1 ? 1 : Math.max(0, 2 - a)).toFixed(4));
  el.style.setProperty("--dim", (0.5 * Math.min(a, 1)).toFixed(4));
}
type Role = { title: string; line: string };
const pad2 = (n: number) => String(n).padStart(2, "0");
function PhoneStack({
  shots,
  progress,
  bounds,
  roles = [],
}: {
  shots: Shot[];
  progress: MotionValue<number>;
  bounds: number[];
  roles?: Role[];
}) {
  // shot k + 1 is role k (the first is the act's own, shown before any role is called)
  const cast = useMemo(() => (roles.length ? shots.slice(1, 1 + roles.length) : shots), [shots, roles.length]);
  const n = cast.length;
  const [state, setState] = useState({ at: 0, dir: 1, turn: 0 });
  /* The act is near: its pictures are asked for now, not left to the browser's lazy loading —
     inside the act's moving, pinned stage that never judged them close enough to fetch (a
     tablet showed four empty cards). Still not with the page's first load: only as the
     reader comes up to the act. */
  const [near, setNear] = useState(false);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const slots = useRef<number[] | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  /** A finger (or a pointer) holding the board: where it went down, and whether it has taken it. */
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    dx: number;
    held: boolean;
    step: number;
    /** the last few samples, for a flick's speed */
    t: number;
    v: number;
    frame: number;
  } | null>(null);

  const go = useCallback(
    (to: number, dir: number) => setState((s) => ({ at: ((to % n) + n) % n, dir, turn: s.turn + 1 })),
    [n],
  );

  // The act knows it is a board (its list then steps aside, see globals.css), and its turn.
  useEffect(() => {
    const act = rootRef.current?.closest<HTMLElement>(".talent-act");
    act?.style.setProperty("--talent-hold", `${BOARD.hold}s`);
    act?.classList.add("is-reel");
    const onPick = (e: Event) => {
      const r = (e as CustomEvent<number>).detail;
      if (typeof r === "number" && r >= 0 && r < n) setState((s) => ({ at: r, dir: r >= s.at ? 1 : -1, turn: s.turn + 1 }));
    };
    window.addEventListener("talent:pick", onPick);
    return () => {
      window.removeEventListener("talent:pick", onPick);
      act?.classList.remove("is-reel");
    };
  }, [n]);

  /* The cards to their places. Each has a slot: 0 in front, ±1 at the edges, ±2 out of
     sight. A card coming into sight comes in from the side the board is turning from (so
     with four, the one that left one way is brought round, unseen, to come in the other). */
  useEffect(() => {
    const { at, dir } = state;
    const want = cast.map((_, i) => {
      let d = (((i - at) % n) + n) % n;
      if (d > n / 2 || (d === n / 2 && dir > 0)) d -= n;
      return Math.max(-2, Math.min(2, d));
    });
    const put = (el: HTMLDivElement, d: number) => {
      place(el, d);
      el.dataset.slot = d === 0 ? "on" : Math.abs(d) === 1 ? "side" : "off";
      // (the turn's parity: the card in front leans in afresh on every turn, the first one
      // on arrival included — see `talent-push` in globals.css)
      el.dataset.beat = String(state.turn % 2);
    };
    const before = slots.current;
    cards.current.forEach((el, i) => {
      if (!el) return;
      const to = want[i];
      const from = before?.[i];
      const enters = from !== undefined && Math.abs(from) >= 2 && Math.abs(to) < 2;
      if (from === undefined || (Math.abs(from) >= 2 && Math.abs(to) >= 2) || enters) {
        el.style.transition = "none";
        put(el, enters ? Math.max(-2, Math.min(2, to + dir)) : to);
        void el.offsetWidth;
        el.style.transition = "";
      }
      put(el, to);
    });
    slots.current = want;
  }, [state, cast, n]);

  // The board takes the finger only while the act is up (the stage above it takes no pointer,
  // and the acts are stacked: hidden, it would sit over the first act's own content).
  useEffect(() => {
    // (and arriving in the act, from either side, the board starts again at the first role,
    // given its whole turn — the clock keeps no time from before the reader got here)
    let was: boolean | null = null;
    const sync = (v: number) => {
      const el = trackRef.current;
      if (!el) return;
      // (the pictures are fetched as the act comes near — see `near`)
      if (v >= bounds[0] - 0.08) setNear(true);
      const on = v >= bounds[0] && v <= bounds[bounds.length - 1];
      if (on) el.dataset.live = "";
      else delete el.dataset.live;
      if (on && was === false) setState((s) => ({ at: 0, dir: s.at === 0 ? 1 : -1, turn: s.turn + 1 }));
      was = on;
    };
    sync(progress.get());
    return progress.on("change", sync);
  }, [progress, bounds]);

  /* A sideways drag keeps the page still. `pan-y` alone lets the browser take the gesture
     back the moment the finger strays a little up or down — and on this page a scroll is a
     carry to the next part. So the gesture is read from its first few pixels: more across
     than up or down, it is the board's until the finger lifts, and the page is held (touch
     events are the only ones that can hold it; the pointer events, which move the cards,
     carry on regardless). More up or down, it is the page's, as ever. */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let start: { x: number; y: number } | null = null;
    let mine: boolean | null = null;
    const down = (e: TouchEvent) => {
      const t = e.touches[0];
      start = t && e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
      mine = null;
    };
    const move = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!start || !t) return;
      if (mine === null) {
        const dx = Math.abs(t.clientX - start.x);
        const dy = Math.abs(t.clientY - start.y);
        if (dx < 4 && dy < 4) return;
        mine = dx > dy;
      }
      if (mine && e.cancelable) e.preventDefault();
    };
    const up = () => {
      start = null;
      mine = null;
    };
    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", up);
    el.addEventListener("touchcancel", up);
    return () => {
      el.removeEventListener("touchstart", down);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", up);
      el.removeEventListener("touchcancel", up);
    };
  }, []);

  // Round the roles while the act is on screen.
  useEffect(() => {
    const live = () => {
      const v = progress.get();
      return v >= bounds[0] && v <= bounds[bounds.length - 1] && !document.hidden;
    };
    let timer = window.setTimeout(
      function tick() {
        if (!live() || drag.current?.held) {
          timer = window.setTimeout(tick, 400);
          return;
        }
        go(state.at + 1, 1);
      },
      (state.turn === 0 ? BOARD.intro : BOARD.hold) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [state, go, progress, bounds]);

  const role = roles[state.at];
  const tags = role ? role.line.replace(/\.$/, "").split(/,\s*/) : [];

  return (
    <div className="talent-board" aria-hidden ref={rootRef}>
      {role ? (
        <div className="talent-board__head">
          <p className="talent-board__slate">
            <span className="talent-board__mask">
              <span key={`n${state.turn}`} className="talent-board__roll" data-dir={state.dir}>
                {pad2(state.at + 1)}
              </span>
            </span>
            <span className="talent-board__rule" />
            <span className="talent-board__total">{pad2(n)}</span>
            <span className="talent-board__label">Casting</span>
          </p>
          <p className="talent-board__role">
            <span className="talent-board__mask">
              <span key={`r${state.turn}`} className="talent-board__roll" data-dir={state.dir}>
                {role.title}
              </span>
            </span>
          </p>
        </div>
      ) : null}

      <div
        className="talent-board__track"
        ref={trackRef}
        /* The board moves under the finger: a sideways drag carries every card with it, and on
           letting go it turns to the next (or the last) if it was pulled a fifth of a step or
           flicked, or settles back. An upright drag is the page's, as ever (pan-y). */
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, held: false, step: 0, t: e.timeStamp, v: 0, frame: 0 };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          const el = trackRef.current;
          if (!d || d.id !== e.pointerId || !el) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (!d.held) {
            if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
            if (Math.abs(dx) <= Math.abs(dy)) {
              drag.current = null; // the page's
              return;
            }
            d.held = true;
            el.setPointerCapture?.(e.pointerId);
            el.classList.add("is-dragging");
            // one step, in pixels: the distance between two cards' centres
            const card = cards.current.find(Boolean);
            const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            d.step = (card?.offsetWidth ?? 240) * 0.91 + 0.9 * rem;
            // the card out of sight waits on the side the finger is pulling from
            const from = dx < 0 ? 2 : -2;
            slots.current = (slots.current ?? []).map((v) => (Math.abs(v) >= 2 ? from : v));
          }
          const dt = Math.max(1, e.timeStamp - d.t);
          d.v = 0.7 * d.v + 0.3 * ((dx - d.dx) / dt);
          d.t = e.timeStamp;
          d.dx = dx;
          if (d.frame) return;
          d.frame = requestAnimationFrame(() => {
            const now = drag.current;
            if (!now) return;
            now.frame = 0;
            const shift = Math.max(-1.2, Math.min(1.2, now.dx / now.step));
            cards.current.forEach((c, i) => c && place(c, (slots.current?.[i] ?? 0) + shift));
          });
        }}
        onPointerUp={() => {
          const d = drag.current;
          const el = trackRef.current;
          drag.current = null;
          if (!d || !el || !d.held) return;
          if (d.frame) cancelAnimationFrame(d.frame);
          el.classList.remove("is-dragging");
          // the cards are where the finger left them: the move on (or back) starts from there,
          // not from their slots
          const shift = Math.max(-1.2, Math.min(1.2, d.dx / d.step));
          slots.current = (slots.current ?? []).map((v) => v + shift);
          cards.current.forEach((c, i) => c && place(c, slots.current?.[i] ?? 0));
          // on to the next (or back to the last) past a fifth of a step, or on a flick
          const flick = Math.abs(d.v) > 0.45;
          const way = (flick ? d.v : d.dx) < 0 ? 1 : -1;
          if (Math.abs(d.dx) > d.step * 0.2 || (flick && Math.abs(d.dx) > 12)) go(state.at + way, way);
          else go(state.at, state.dir); // (settles back, and its turn starts afresh)
        }}
        onPointerCancel={() => {
          const d = drag.current;
          drag.current = null;
          if (d?.frame) cancelAnimationFrame(d.frame);
          trackRef.current?.classList.remove("is-dragging");
          if (d?.held) go(state.at, state.dir);
        }}
      >
        {cast.map((shot, i) => (
          <div
            key={shot.src}
            ref={(el) => {
              cards.current[i] = el;
            }}
            className="talent-board__card"
            onClick={() => {
              if (trackRef.current?.classList.contains("is-dragging")) return;
              const d = slots.current?.[i] ?? 0;
              if (Math.abs(d) === 1) go(i, d);
            }}
          >
            <Image
              src={shot.src}
              alt={shot.alt ?? ""}
              fill
              /* the card's own width on a phone, at a phone's photograph quality, and fetched
                 behind the hero (low priority): the act is a screen or more down the page */
              sizes="70vw"
              quality={75}
              fetchPriority="low"
              loading={near ? "eager" : "lazy"}
              draggable={false}
              className="talent-board__img"
            />
          </div>
        ))}
        <span key={`f${state.turn}`} className="talent-board__finder">
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>

      {role ? (
        <div className="talent-board__foot">
          <p key={`g${state.turn}`} className="talent-board__tags">
            {tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function TalentStack({
  roles,
  boardShots,
  ...props
}: {
  shots: Shot[];
  bounds: number[];
  progress: MotionValue<number>;
  /** On the board, the roles it calls (see `PhoneStack`)… */
  roles?: Role[];
  /** …and its pictures: the act's own first, then one per role. */
  boardShots?: Shot[];
}) {
  const board = useBoard();
  return board ? (
    <PhoneStack {...props} shots={boardShots ?? props.shots} roles={roles} />
  ) : (
    <DeskStack {...props} />
  );
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
    <div className="talent-stack talent-stack--desk" aria-hidden>
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

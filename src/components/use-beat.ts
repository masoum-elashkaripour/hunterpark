"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { animate, useMotionValue, type MotionValue } from "motion/react";
import { getLenis } from "@/components/smooth-scroll";

/**
 * A chapter of the film: a section that PINS and plays as the reader scrolls.
 *
 * This is the homepage's own construction, in this stack. There, `film.ts`
 * builds one GSAP timeline with `pin: true, scrub: true, ease: "none"` and adds
 * each chapter at an offset, with beat lengths measured in viewport heights.
 * The characteristic that matters is in its comment: "motion stops the moment
 * scrolling stops and reverses exactly — no catch-up lag after the user."
 *
 * Here the pin is `position: sticky` and the timeline is a MotionValue, but the
 * contract is identical: 0 when the section's top reaches the top of the
 * window, 1 when its last screen has been scrolled through, and nothing in
 * between that is not a function of where the reader has put the page.
 *
 * WHY THIS AND NOT `useInView`. The reveals it replaces fired ONCE, on arrival,
 * and then ran on their own clock — which is the opposite behaviour. A reader
 * who stops half way through a `useInView` fade still sees it finish; a reader
 * who stops half way through a beat is left exactly there, which is what makes
 * a scrubbed page feel like something they are driving rather than something
 * playing at them.
 *
 * Returns the progress and the callback ref for the section. The section must
 * be `height: (beats + 1) * 100svh` with a `sticky top-0 h-[100svh]` stage
 * inside it — see `.beat` / `.beat__stage`.
 */

/**
 * A box measured ONCE, in document space, and kept.
 *
 * This is the difference between this page and the one it is modelled on.
 * Measured: `/work` performs ZERO `getBoundingClientRect` calls during a scroll;
 * this page was performing SEVEN PER SCROLL EVENT, because every primitive here
 * asked the browser where its element was on every tick. Each of those is a
 * forced synchronous layout, and seven of them before a frame can be painted is
 * what "the animations do not happen smoothly" actually was.
 *
 * None of it was necessary. A section does not MOVE while the page scrolls —
 * its position in the document is fixed, and only its position relative to the
 * viewport changes, which is that constant minus `scrollY`. So the rect is read
 * when the layout is established and once more whenever it can have changed,
 * and every scroll tick after that is arithmetic on two numbers.
 *
 * The observers are what make it safe to cache: fonts landing, images arriving
 * and the window resizing all move things, and all three end in a resize of
 * either the element or the page.
 */
type Box = { top: number; height: number };

function useBox(el: HTMLElement | null) {
  const box = useRef<Box>({ top: 0, height: 0 });

  useEffect(() => {
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      box.current = { top: r.top + window.scrollY, height: r.height };
    };

    measure();
    /* Deferred a frame as well: on the first commit the element may be laid out
       but its images and fonts are not, and a box read then is a box of the
       wrong height. */
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(document.documentElement);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [el]);

  return box;
}

/**
 * Run `read` on every scroll, and once now.
 *
 * Passive, so the listener can never hold up the scroll itself, and shared by
 * all three primitives below so there is one shape to get right rather than
 * three copies of it.
 */
function useOnScroll(read: () => void, deps: unknown[]) {
  useEffect(() => {
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useBeat(): [
  (el: HTMLElement | null) => void,
  MotionValue<number>,
] {
  /* A callback ref, not `useRef`: the effect has to run when the node actually
     attaches. A plain ref reads null on the first commit and the effect never
     runs again — the trap that cost this codebase a blank footer and a dead
     closing transition. */
  const [el, setEl] = useState<HTMLElement | null>(null);
  const progress = useMotionValue(0);

  const box = useBox(el);

  useOnScroll(() => {
    if (!el) return;
    /* `-top / (height - viewport)` is exactly "starts when the top edge
       reaches the top of the window, ends when the bottom edge reaches the
       bottom" — the span the sticky stage is pinned for. `top` is the cached
       document position minus the scroll, so this costs no layout. */
    const top = box.current.top - window.scrollY;
    const span = box.current.height - window.innerHeight;
    if (span <= 0) return;
    progress.set(Math.min(1, Math.max(0, -top / span)));
  }, [el, progress, box]);

  return [setEl, progress];
}

/**
 * Where a piece sits inside its beat.
 *
 * The homepage states its beats as plain numbers on one timeline; this is the
 * same idea as a pair of stops, so a section's choreography can be read in one
 * place instead of being spread through the markup.
 */
export type Cue = [number, number];

/**
 * A block that plays as it RISES through the window, rather than one that pins.
 *
 * `useBeat` above is for a chapter that holds the frame. This is for a chapter
 * that moves: progress is 0 while the element's top is still low in the window
 * and 1 once it has climbed to the mark, so everything inside it is a function
 * of where the reader has put it — the same contract, without the pin.
 *
 * It is what a staircase needs. The steps have to keep travelling up the page
 * for the descent to read as a descent; pinning them would stop the one motion
 * the layout is made of.
 *
 * `from` and `to` are fractions of the window, measured from its top. The
 * default runs a step from just below the fold to a third of the way up.
 */
export function useEnter(
  from = 0.9,
  to = 0.3,
): [(el: HTMLElement | null) => void, MotionValue<number>] {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const progress = useMotionValue(0);

  const box = useBox(el);

  useOnScroll(() => {
    if (!el) return;
    const view = window.innerHeight;
    const top = box.current.top - window.scrollY;
    const span = (from - to) * view;
    if (span <= 0) return;
    progress.set(Math.min(1, Math.max(0, (from * view - top) / span)));
  }, [el, progress, from, to, box]);

  return [setEl, progress];
}

/**
 * A CONTAINER's whole travel through the window, as one 0→1.
 *
 * `useEnter` runs out as soon as an element's top reaches the mark, which is
 * right for a single block arriving. A run that has to be shared out across
 * several children needs the container's full passage instead: 0 when its top
 * edge reaches `from`, 1 when its bottom edge reaches `to`.
 *
 * One listener for the whole group — which is the point. Three children each
 * reading their own rect are three independent animations, however carefully
 * their numbers are chosen.
 */
export function useRun(
  from = 0.88,
  to = 0.55,
): [(el: HTMLElement | null) => void, MotionValue<number>] {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const progress = useMotionValue(0);

  const box = useBox(el);

  useOnScroll(() => {
    if (!el) return;
    const view = window.innerHeight;
    const top = box.current.top - window.scrollY;
    /* From "top at `from`" to "bottom at `to`" — so the span grows with the
       container and the run is the same speed whatever its height. */
    const span = (from - to) * view + box.current.height;
    if (span <= 0) return;
    progress.set(Math.min(1, Math.max(0, (from * view - top) / span)));
  }, [el, progress, from, to, box]);

  return [setEl, progress];
}

/**
 * The window's scroll position, as a MotionValue — this file's version of it.
 *
 * `useScroll` from Motion looks like the obvious thing to use and has one flaw
 * that only shows on a cold load: it takes its measurement around mount, and if
 * the reader has already scrolled by then it sets the value BEFORE anything has
 * subscribed to it. A MotionValue set to what it already holds notifies nobody,
 * so every transform downstream keeps the answer it computed for a page sitting
 * at zero — and keeps it until the next wheel notch moves the number to
 * something genuinely new. The hero sat at the top of its run with the page a
 * third of a screen past it. Setting it again on mount does not help, because
 * that is setting it to the value it already has; nor does a synthetic scroll
 * event, for the same reason. Both were tried and measured.
 *
 * This has no such gap, for the same reason `useBeat` and `useEnter` do not:
 * the value is created HERE, so the transforms reading it have subscribed
 * during render, and the first `read()` in the effect is a change they all
 * hear. One mechanism for scroll on this page, and it is the one that works.
 */
export function useScrollY(): MotionValue<number> {
  const y = useMotionValue(0);

  useEffect(() => {
    const read = () => y.set(window.scrollY);
    read();

    /**
     * AND AGAIN, LOUDLY, UNTIL SOMETHING IS LISTENING.
     *
     * Reloading a page that was scrolled restores the position before the app
     * has mounted, so `read()` above gets the right number straight away. It
     * still was not enough, and the reason took measuring: with the value
     * correct — `recede` sat at 0.83, exactly right for the position — the film
     * was still drawn sharp. The values were never the problem. Nothing had
     * SUBSCRIBED to them yet.
     *
     * `LazyMotion` loads its features asynchronously. Until that import lands,
     * an `m` element is a plain element: it renders the styles it was given and
     * holds no subscription to any MotionValue. A value that changes in that
     * window changes silently, and because a restored scroll never moves again,
     * nothing afterwards corrects it. The reader refreshes three hundred pixels
     * down and gets a hero drawn as if it were at the top, held there until
     * they touch the wheel — which is exactly what refreshing to check a change
     * looks like.
     *
     * So the reads are repeated across that window, and each one is made a
     * genuine CHANGE: a MotionValue set to the number it already holds notifies
     * nobody, which is why simply reading again did nothing. The offset is a
     * thousandth of a pixel, written and immediately overwritten inside one
     * frame, so there is no position it can be seen at.
     *
     * It stops as soon as the page is touched — see the listener below — and on
     * the ordinary path, a page opened at the top, every one of these answers
     * zero and nothing downstream moves.
     */
    let pending = 0;
    const nudge = () => {
      /* The two writes must land in DIFFERENT frames. Motion batches value
         updates, so a pair written back-to-back collapses into the final one —
         which equals what the value already held, and notifies nobody. That is
         the same no-op as reading again, dressed up. */
      y.set(window.scrollY + 0.001);
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => y.set(window.scrollY));
    };
    const frame = requestAnimationFrame(nudge);
    const timers = [60, 200, 600, 1500].map((t) => window.setTimeout(nudge, t));
    window.addEventListener("load", nudge);

    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pending);
      timers.forEach(clearTimeout);
      window.removeEventListener("load", nudge);
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [y]);

  return y;
}

/* ----------------------------------------------------------------- play --- */

/**
 * PLAY MODE — a phone, with motion welcome.
 *
 * The chapters still ENTER and LEAVE on the scroll, exactly as on a desktop:
 * the pins, the hand-overs, the title crossing from one chapter to the next.
 * What changes is what happens once the reader is IN a chapter: its elements
 * no longer wait to be scrubbed into place — they load, in their order, on a
 * clock. See `useGated`.
 *
 * The rate is one screen of the original scroll to one second, so every part
 * keeps its proportion to the others; only the unit changes.
 */
export const PLAY_QUERY =
  "(max-width: 767px) and (prefers-reduced-motion: no-preference)";
/** Seconds of play per screen of the scroll it replaces — a touch quicker than the
    scroll's own second, so a phone's played stretches feel brisk rather than slow. */
export const PLAY_SECONDS_PER_SCREEN = 0.8;
/** And no played stretch runs longer than this, whatever its length in screens: the
    long ones go faster to fit, the short ones keep their natural pace. */
export const PLAY_MAX_SECONDS = 3;

const subscribePlay = (change: () => void) => {
  const mq = window.matchMedia(PLAY_QUERY);
  mq.addEventListener("change", change);
  return () => mq.removeEventListener("change", change);
};

export function usePlayMode(): boolean {
  return useSyncExternalStore(
    subscribePlay,
    () => window.matchMedia(PLAY_QUERY).matches,
    () => false,
  );
}

/**
 * A beat whose LOADING stretches play and whose TRANSITIONS scroll.
 *
 * `raw` is the beat's scroll progress on its original 0→1. `holds` are the
 * stretches of it where a chapter's elements arrive. On a phone, once the
 * scroll is inside a hold the output plays — on a clock, at the beat's own pace
 * (`screens` seconds for the whole 0→1) — to the END of that hold, whatever the
 * thumb does inside it; between holds it follows the scroll, so the moves that
 * carry one chapter into the next are the desktop's. With the beat not yet
 * reached (`raw` at 0) it plays back to 0: scroll back up past a chapter and its
 * elements leave, in reverse, and load again the next time.
 *
 * It never jumps: when the output and the scroll are in different stretches —
 * a hold still loading as the thumb runs on, or scrolling back into one — it
 * travels between them at the play pace, and takes the scroll directly only
 * once both are in the same transitional stretch.
 */
export function useGated(
  raw: MotionValue<number>,
  {
    holds,
    screens,
    enabled,
    backOnScroll = false,
  }: {
    holds: [number, number][];
    screens: number;
    enabled: boolean;
    /** Going BACK follows the scroll exactly, as on a desktop — for a move the
        page is carried through going forward (see `carryTo`), whose way back
        is the reader's own scroll. */
    backOnScroll?: boolean;
  },
): MotionValue<number> {
  const out = useMotionValue(raw.get());
  const key = JSON.stringify(holds);

  useEffect(() => {
    if (!enabled) {
      out.set(raw.get());
      return raw.on("change", (v) => out.set(v));
    }

    const spans: [number, number][] = JSON.parse(key);
    const EPS = 0.0005;
    const speed = 1 / (screens * PLAY_SECONDS_PER_SCREEN);
    /* A hold never takes longer than `PLAY_MAX_SECONDS` to play through. */
    const paceIn = (v: number) => {
      for (const [a, b] of spans) if (v > a - EPS && v < b + EPS) return Math.max(speed, (b - a) / PLAY_MAX_SECONDS);
      return speed;
    };
    /* The stretch a value is in: inside hold i, or the open stretch after `n`
       holds. A hold's end belongs to the stretch after it. */
    const zone = (v: number) => {
      for (let i = 0; i < spans.length; i++) {
        const [a, b] = spans[i];
        if (v > a && v < b) return `h${i}`;
      }
      return `s${spans.filter(([, b]) => v >= b).length}`;
    };
    const target = (r: number) => {
      if (r <= EPS) return 0;
      for (const [a, b] of spans) if (r > a && r < b) return b;
      return r;
    };

    let frame = 0;
    let last = 0;
    let lastRaw = raw.get();
    const tick = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      const r = raw.get();
      const q = out.get();
      /* Only while the scroll is actually going BACK: going forward the page
         is being carried, and its eased start trails the clock. */
      const goingBack = r < lastRaw;
      lastRaw = r;
      if (backOnScroll && goingBack && r < q) {
        out.set(r);
        frame = 0;
        last = 0;
        return;
      }
      const t = target(r);
      const zq = zone(q);
      if (t !== 0 && zq.startsWith("s") && zq === zone(t)) {
        out.set(t);
      } else if (q !== t) {
        /* Backwards is quicker than forwards. Going back to an act already
           seen is undoing, not presenting — three times the pace, so the act
           being returned to is there by the time the reader looks for it; and
           leaving the chapter altogether is a reset, four times. At the play
           pace a chapter left from its last act was still unwinding when the
           reader was already back in the hero. */
        const pace = Math.max(paceIn(q), paceIn(t === 0 ? q : t));
        const step = pace * dt * (t === 0 ? 4 : q > t ? 3 : 1);
        out.set(q < t ? Math.min(t, q + step) : Math.max(t, q - step));
      }
      if (out.get() === target(raw.get())) {
        frame = 0;
        last = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    wake();
    const stop = raw.on("change", wake);
    return () => {
      stop();
      cancelAnimationFrame(frame);
    };
  }, [raw, out, enabled, screens, key, backOnScroll]);

  return out;
}

/**
 * Maps a SHORTENED scroll onto a beat's original 0→1, for a phone.
 *
 * A hold plays on a clock, so on a phone it needs only a sliver of scroll to be
 * entered — the screens a desktop spends scrubbing it would be dead thumb
 * travel. Each hold is given `holdScreens` of scroll instead; the stretches
 * between keep their full length, so every transition scrolls at the desktop's
 * rate. Returns the map and the shortened beat's scroll length in screens.
 */
export function compressHolds(
  holds: [number, number][],
  screens: number,
  holdScreens: number,
) {
  type Seg = { from: number; to: number; len: number };
  const segs: Seg[] = [];
  let at = 0;
  for (const [a, b] of holds) {
    if (a > at) segs.push({ from: at, to: a, len: (a - at) * screens });
    segs.push({ from: a, to: b, len: holdScreens });
    at = b;
  }
  if (at < 1) segs.push({ from: at, to: 1, len: (1 - at) * screens });
  const total = segs.reduce((n, sg) => n + sg.len, 0);
  const map = (r: number) => {
    let d = Math.min(1, Math.max(0, r)) * total;
    for (const sg of segs) {
      if (d <= sg.len) return sg.from + (sg.len ? (d / sg.len) * (sg.to - sg.from) : 0);
      d -= sg.len;
    }
    return 1;
  };
  return { map, total };
}

/**
 * Plays `value` toward 1 while `on` is true and back toward 0 while it is false,
 * at the same rate either way — for a set of elements that loads when its
 * chapter is reached and unloads when the reader scrolls back above it.
 */
export function usePlayToggle(
  value: MotionValue<number>,
  on: boolean,
  { enabled, screens }: { enabled: boolean; screens: number },
) {
  useEffect(() => {
    if (!enabled) return;
    const to = on ? 1 : 0;
    const controls = animate(value, to, {
      duration: Math.min(
        PLAY_MAX_SECONDS,
        Math.abs(to - value.get()) * screens * PLAY_SECONDS_PER_SCREEN,
      ),
      ease: "linear",
    });
    return () => controls.stop();
  }, [value, on, enabled, screens]);
}

/**
 * Carries the page to `to` over `seconds`, the way the reader's own scroll
 * would — through Lenis when the page has one, so the two do not fight over
 * the position.
 */
export function carryTo(to: number, rawSeconds: number, linear = false) {
  const seconds = Math.min(rawSeconds, PLAY_MAX_SECONDS);
  /* `linear` when what the page carries is itself driven by the scroll and has
     to run at the scroll's even pace — the footer — rather than ease in and
     out like a camera move. */
  const ease = linear
    ? (t: number) => t
    : (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lenis = getLenis();
  if (lenis) {
    /* LOCKED for its run: the gesture that armed it is still arriving (wheel
       momentum, a thumb finishing its swipe) and would otherwise cancel the
       carry a few pixels in. It is two seconds; the page is the reader's again
       the moment it lands. */
    lenis.scrollTo(to, {
      duration: seconds,
      easing: ease,
      lock: true,
      force: true,
    });
    return;
  }
  const run = animate(window.scrollY, to, {
    duration: seconds,
    ease: linear ? "linear" : [0.45, 0, 0.25, 1],
    onUpdate: (y) => window.scrollTo(0, y),
  });
  const stop = () => {
    run.stop();
    window.removeEventListener("touchstart", stop);
  };
  window.addEventListener("touchstart", stop, { passive: true });
  run.then(stop);
}

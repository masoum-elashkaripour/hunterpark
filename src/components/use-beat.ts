"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, type MotionValue } from "motion/react";

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

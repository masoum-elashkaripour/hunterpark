"use client";

import { useEffect, useState } from "react";

/**
 * Has this element been reached yet? Latches true and stays there.
 *
 * Deliberately built on a scroll listener plus a rect test rather than on
 * `whileInView` or a lone `IntersectionObserver`, both of which have failed
 * silently on this page and left whole sections shut. This is the same
 * arithmetic in the open, on the one mechanism the page has never had trouble
 * with — the film's progress, the header and the pull-back gesture all run on
 * window scroll.
 *
 * Checked once up front as well: a card already on screen when the page settles
 * would otherwise wait for a scroll that a reader has no reason to make.
 *
 * `margin` brings the trigger forward by a fraction of the window, so a card
 * begins as it arrives rather than after it has sat there — which is the
 * difference between the page dealing itself out and the page playing catch-up.
 *
 * A CALLBACK REF, not `useRef`, and this is load-bearing.
 *
 * With a plain ref the effect reads `ref.current` on the caller's first commit.
 * That is fine when the hook and its element mount together — every tile in the
 * grid does — but not when the element is inside a branch that has not been
 * taken yet. WorkCarousel calls this at the top of the component while the page
 * is still showing the reel, so its element did not exist; the effect returned
 * early, and neither of its dependencies changes when the node finally arrives,
 * so it never ran again. The hook simply never latched.
 *
 * That cost the whole closing transition: the flag it feeds mounts the final
 * film, so the card was lifted out of the grid and nothing was put in its
 * place — a black hole where the film should have been growing.
 *
 * A callback ref re-renders when the node actually attaches, which puts it in
 * the dependency list and makes the late arrival a non-event. (The same trap,
 * with the same fix, as `filmEl` in WorkCarousel.)
 */
export function useInView<T extends HTMLElement>(margin = 0.1) {
  const [el, setEl] = useState<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (!el || seen) return;

    const check = () => {
      const box = el.getBoundingClientRect();
      /* Zero-sized means not laid out yet — no opinion, try again next time. */
      if (box.height === 0) return false;
      return box.top < window.innerHeight * (1 - margin) && box.bottom > 0;
    };

    const stop = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };

    const onScroll = () => {
      if (!check()) return;
      setSeen(true);
      stop();
    };

    /**
     * The first check is deferred a frame rather than run in the effect body.
     *
     * Two reasons, and both matter. `react-hooks/set-state-in-effect` is right
     * that a synchronous setState here cascades renders — and with the element
     * now in the dependency list, this effect runs the moment it attaches,
     * which is exactly when a cascade would be worst. It is also simply too
     * early to measure: a node that has just been committed may not have been
     * laid out, and `check` would read a zero box and decline.
     *
     * A frame later both problems are gone, and nothing is lost — the listener
     * below is already attached, so a reader who scrolls in the meantime is
     * caught either way.
     */
    const frame = requestAnimationFrame(onScroll);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, [el, seen, margin]);

  return [setEl, seen] as const;
}

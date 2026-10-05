"use client";

import { m, useReducedMotion } from "motion/react";

/**
 * A block that rises into place on mount.
 *
 * The project page is a Server Component and every part of it simply appeared:
 * the back link, the title, the credits, all at once, the instant the route
 * changed. Against a site where nothing else arrives without being animated in,
 * that reads as the page having failed to load rather than as a navigation.
 *
 * `delay` is what makes it a sequence rather than one lump, and it is measured
 * from the START of the navigation — so the first value has to clear the morph.
 * The tile growing into the film is the subject of the transition; the type
 * belongs after it, not competing with it. See `--hp-morph-ms`.
 *
 * Reduced motion changes the DURATION, never whether the animation runs.
 * Branching `initial` on it leaves the block permanently invisible: the server
 * renders before `useReducedMotion` resolves, so it emits the hidden state, and
 * a client that then resolves it to `true` skips the only thing that would have
 * cleared it. That has bitten this codebase once already, in PatternGrid.
 */
export function Reveal({
  delay = 0,
  className,
  children,
}: {
  /** Seconds from the start of the navigation. */
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();

  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0 : 1.05,
        delay: reduced ? 0 : delay,
        /* The site's own out-curve — the same one the index's frames, the
           footer's words and the closing lockup all settle on. */
        ease: [0.19, 1, 0.22, 1],
      }}
    >
      {children}
    </m.div>
  );
}

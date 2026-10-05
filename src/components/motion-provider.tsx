"use client";

import { LazyMotion } from "motion/react";

/**
 * Fetched, not imported. `features={domAnimation}` with a static import looks
 * lazy and is not — the bundler still puts it in the first chunk, and the
 * initial payload is unchanged. A loader function is what actually splits it.
 */
const loadFeatures = () =>
  import("@/components/motion-features").then((mod) => mod.domAnimation);

/**
 * Loads motion's feature set separately from the components that use it.
 *
 * Every `motion.div` drags the whole animation engine into the first bundle.
 * `m.div` ships only the renderer, and this provider brings the features in
 * alongside — same behaviour, much less JavaScript before first paint.
 *
 * `domAnimation` rather than `domMax`: the larger bundle exists for LAYOUT
 * animations (`layout`, `layoutId`), and nothing here uses them. Adding it
 * would be paying for a feature the site does not have.
 *
 * `strict` turns any surviving `motion.*` into an error rather than letting it
 * quietly pull the full engine back in and undo this.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}

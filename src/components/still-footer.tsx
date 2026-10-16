"use client";

import { m, useMotionValue, useReducedMotion } from "motion/react";
import { SiteFooter } from "@/components/site-footer";

/**
 * The site footer, STILL — the one /contact closes on: finished, nothing
 * scrubbed and no wordmark flight (a progress that never moves keeps every part
 * in its end state, see `driven` in SiteFooter).
 *
 * For pages that simply end, such as a project's own page. It follows the
 * content in the flow; its leading edge is a fade rather than a line (see
 * `.still-footer::before`), and it rises in once as it comes into view.
 */
export function StillFooter() {
  const progress = useMotionValue(0);
  const reduced = useReducedMotion();

  return (
    <m.div
      className="still-footer"
      initial={reduced ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 1.05, ease: [0.19, 1, 0.22, 1] }}
    >
      <SiteFooter progress={progress} still />
    </m.div>
  );
}

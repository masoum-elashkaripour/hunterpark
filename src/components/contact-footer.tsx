"use client";

import { useMotionValue } from "motion/react";
import { SiteFooter } from "@/components/site-footer";
import { FOOTER_OVERLAP } from "@/components/contact-reveal";

/**
 * The site footer on /contact — STILL: one screen, finished, nothing scrubbed
 * and no wordmark flight. A progress that never moves keeps every part in its
 * end state (see `driven` in SiteFooter).
 *
 * It does not simply follow the section: it is pulled up over its last
 * stretch (`FOOTER_OVERLAP`) and rises over the stage while the panel climbs
 * away and the picture goes to night — see `ContactReveal`'s exit.
 */
export function ContactFooter() {
  const progress = useMotionValue(0);
  return (
    <div
      className="contact-footer-rise"
      style={
        {
          "--overlap": `${Math.round(FOOTER_OVERLAP * 100)}svh`,
        } as React.CSSProperties
      }
    >
      <SiteFooter progress={progress} still />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useMotionValue } from "motion/react";
import { SiteFooter } from "@/components/site-footer";

/**
 * The site's footer for a page with no closing lockup of its own (/contact,
 * /news) — and the choreography unchanged, which is the hard part.
 *
 * `SiteFooter` is not a static block. Every part of it is scrubbed against a
 * `progress` MotionValue and starts at nothing: zero opacity, clipped to a
 * hairline, paths of no length. More importantly, every number in its `MOTION`
 * map is a share of a beat that INCLUDES the closing lockup. Its own comment
 * says so — the wordmark flight was moved from 0.078 to 0.24 precisely because
 * "the closing lockup has the screen before that".
 *
 * So handing it a progress measured over the footer alone does not merely start
 * things early, it rescales the entire sequence. Measured, as built and as the
 * other pages build it:
 *
 *   /about     driver block 4950px (lockup 900 + footer 4050), beat span 4050px
 *              -> the footer's top arrives at progress 0.222
 *   this page  driver block 4050px (footer alone),  beat span 3150px
 *              -> the footer's top arrives at progress 0.000
 *
 * The whole run was happening over 3150px where it gets 4050px elsewhere, and
 * the logo's flight (`mark`, 0.24 -> 0.62) therefore began in the wrong place
 * and crossed the wrong distance.
 *
 * THE FIX IS TO MEASURE AS IF THE LOCKUP WERE STILL THERE. Not to re-time the
 * footer — its numbers are correct and are shared with two other pages — but to
 * hand it the beat it expects: one screen of lead-in, then the footer. Nothing
 * is drawn in that screen, and nothing needs to be, because the lead-in is
 * entirely above the footer's own top and the page simply has its previous
 * section there instead.
 *
 *   progress = (scrollY - footerTop + viewportHeight) / footerHeight
 *
 * which is the other pages' `-top / (height - viewport)` with a block that
 * starts one viewport above the footer. Check it at the two ends: when the
 * footer's top reaches the top of the window it gives `vh / footH` — 900/4050,
 * or 0.222, which is what /about measures. When the footer's bottom reaches the
 * bottom of the window it gives 1. The travel in between is 3150px on both
 * pages, so every beat lands at the same scroll offset relative to the footer,
 * and the wordmark enters large and settles exactly as it does on the index.
 *
 * Measured once in document space and re-measured only on resize or when the
 * document's own size changes — a `getBoundingClientRect` in a scroll handler
 * is a forced synchronous layout per tick, which is the single largest thing
 * that ever made this site feel rough.
 */
export function PageFooter({
  overlap = 0,
}: {
  /**
   * How many screens the footer is pulled up over the section before it, so
   * its arrival starts while that section is still on screen rather than
   * after a stretch of empty night. 0 = it simply follows.
   */
  overlap?: number;
}) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const film = useMotionValue(0);

  useEffect(() => {
    if (!el) return;

    /* The footer's own box, in document space. */
    const doc = { top: 0, height: 0 };
    const measure = () => {
      const box = el.getBoundingClientRect();
      doc.top = box.top + window.scrollY;
      doc.height = box.height;
    };

    const update = () => {
      if (doc.height <= 0) return;
      const vh = window.innerHeight;
      /* The lead-in the lockup would have occupied — see the note above. */
      const travelled = window.scrollY - doc.top + vh;
      film.set(Math.min(1, Math.max(0, travelled / doc.height)));
    };

    measure();
    update();

    const onResize = () => {
      measure();
      update();
    };
    /* Covers fonts landing and images arriving, both of which move the box. */
    const sizes = new ResizeObserver(onResize);
    sizes.observe(document.documentElement);

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      sizes.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", onResize);
    };
  }, [el, film]);

  /* Pulled up by `overlap` screens. The measuring above reads the box where it
     actually sits, so the progress arithmetic needs no change. */
  return (
    <div
      ref={setEl}
      className="page-footer"
      style={
        { "--overlap": `${Math.round(overlap * 100)}svh` } as React.CSSProperties
      }
    >
      <SiteFooter progress={film} />
    </div>
  );
}

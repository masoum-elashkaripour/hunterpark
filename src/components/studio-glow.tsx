"use client";

import { m, useReducedMotion } from "motion/react";

/**
 * The backdrop behind the work index: lighting, and nothing else.
 *
 * This began as the live site's chapter-02 `studio-lines` block — a drafted arc
 * over a soft glow. The arc came off: behind a carousel it reads as a stray
 * hoop cutting past the cards rather than as the drafting motif it is on a page
 * of text. What was doing the real work was the glow, so that is all that is
 * left, and it is now built to be looked at rather than to sit under a line.
 *
 * Three lime pools at different sizes, not one. A single radial gradient is
 * flat however bright it is turned up — the falloff is uniform, so it reads as
 * a painted disc. Overlapping pools of different radii give the light a core
 * and a spill, which is what makes it look emitted.
 */

const EASE: [number, number, number, number] = [0.19, 1, 0.22, 1];

/**
 * The slow breathe. Long enough that it is never caught in the act — at this
 * period the light is simply never quite where it was, which is the difference
 * between phosphorescence and a pulsing div.
 */
const BREATHE = {
  duration: 11,
  ease: "easeInOut" as const,
  repeat: Infinity,
  repeatType: "mirror" as const,
};

export function StudioGlow() {
  const reduced = useReducedMotion();

  /* Reduced motion keeps the light and drops the movement — the glow is part
     of the page's colour, not an animation, and taking it away would leave a
     flat black panel. */
  const lift = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, scale: 0.92 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 2.1, ease: EASE, delay },
        };

  const breathe = (scale: [number, number], delay: number) =>
    reduced ? {} : { animate: { scale }, transition: { ...BREATHE, delay } };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* Base wash. The bottom pool is stronger than it was: with the arc gone
          the foot of the page had nothing in it at all. */}
      <div
        className="absolute inset-0 bg-night"
        style={{
          backgroundImage: [
            "radial-gradient(120% 85% at 50% 38%, var(--hp-dark) 0%, transparent 58%)",
            "radial-gradient(90% 50% at 50% 100%, color-mix(in oklab, var(--hp-lime) 11%, transparent) 0%, transparent 70%)",
            "radial-gradient(85% 70% at 50% 45%, transparent 35%, var(--hp-night) 100%)",
          ].join(", "),
        }}
      />

      {/* The spill — widest and faintest, and the one that actually tints the
          room. `closest-side` keeps the falloff circular in a square box. */}
      <m.span
        className="absolute top-[22%] left-[18%] h-[78vmax] w-[78vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(closest-side, #eeff4124, #eeff4100 72%)",
        }}
        {...lift(0)}
        {...breathe([1, 1.08], 2.1)}
      />

      {/* The core — half the size and several times the intensity. This is what
          gives the light somewhere to have come FROM; without it the spill is
          just an evenly lit fog. */}
      <m.span
        className="absolute top-[30%] left-[24%] h-[34vmax] w-[34vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(closest-side, #eeff4138, #eeff4100 68%)",
        }}
        {...lift(0.25)}
        {...breathe([1, 1.14], 0)}
      />

      {/* A counter-pool low and right, so the frame is not lit from one corner
          and dead in the opposite one. Kept dim — it balances, it does not
          compete. */}
      <m.span
        className="absolute top-[78%] left-[82%] h-[52vmax] w-[52vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(closest-side, #eeff411c, #eeff4100 70%)",
        }}
        {...lift(0.5)}
        {...breathe([1.06, 1], 1.2)}
      />
    </div>
  );
}

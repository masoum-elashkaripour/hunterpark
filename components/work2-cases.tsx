"use client";

import { useMemo, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import {
  CATEGORIES,
  oneWorkPerClip,
  type Category,
  type Work,
} from "@/lib/works";
import { PatternGrid } from "@/components/pattern-grid";

/**
 * "Selected cases", after the section of the same name on hobro.digital: the
 * chapter heading, a discipline filter under it, then the index itself.
 *
 * NOTE ON THE REFERENCE: hobro.digital sits behind a Cloudflare challenge and
 * could not be read, so the entrance is built to description — a small box in
 * a corner opening out into the full rectangle — rather than copied from their
 * code.
 *
 * The composition itself lives in `PatternGrid`.
 */

const EASE: [number, number, number, number] = [0.19, 1, 0.22, 1];

type Filter = Category | "All";

const FILTERS: Filter[] = ["All", ...CATEGORIES];

export function Work2Cases({ works }: { works: Work[] }) {
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("All");

  /* Deduplicated by clip: with eleven stand-ins across thirty-one projects,
     showing every project plays the same footage card after card. */
  const visible = useMemo(
    () =>
      oneWorkPerClip(
        filter === "All" ? works : works.filter((w) => w.category === filter),
      ),
    [works, filter],
  );

  /**
   * Reduced motion changes the DURATION, never whether the animation runs.
   *
   * Branching `initial` on `reduced` is what broke this the first time: the
   * server renders with `useReducedMotion()` still null, so it emits the
   * hidden state, and a client that then resolves `reduced` to true skips the
   * animation that was the only thing that would have cleared it. The cards
   * stayed permanently invisible. Same state both sides, always animated,
   * removes the trap.
   */
  const reveal = {
    // Long, to sit with the eased scroll rather than finishing before the
    // card has settled under it.
    duration: reduced ? 0 : 1.3,
    ease: EASE,
  };

  return (
    <section
      id="cases"
      aria-labelledby="cases-heading"
      /* No background of its own and barely any lead-in: the film it used to
         need covering has already faded to nothing by the time this arrives,
         and an opaque band plus a screen of padding is exactly what made the
         grid read as a second, separate page. It now rises straight into the
         space the hero's title has just cleared. */
      className="relative z-10 pb-32"
    >
      {/* No lead-in at all: the hero's lockup closes its own clearance as the
          chapter ends, and the filters are meant to land directly under the
          title it hands over. */}
      <div className="px-gutter">
        {/* The hero's lockup trades itself for this line on the way down and
            the pinned frame still holds it as the grid arrives, so printing it
            again here reads as the title stuttering. Kept for the
            accessibility tree, which cannot see the hero's swap. */}
        <h2 id="cases-heading" className="sr-only">
          Selected cases
        </h2>

        {/* The index gets long; this is how it stays walkable. Rises just
            ahead of the grid, so the filters and the cards arrive as one
            movement under the title rather than appearing already placed. */}
        <m.div
          role="group"
          aria-label="Filter cases by discipline"
          className="flex flex-wrap items-baseline gap-x-8 gap-y-4"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...reveal, delay: 0.05 }}
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={f === filter}
              onClick={() => setFilter(f)}
              className="case-filter"
            >
              {f}
            </button>
          ))}
        </m.div>
      </div>

      {/* Keyed on the filter so switching remounts the grid and every card
          deals itself in again — cards that survive a filter change would
          otherwise sit still while their new neighbours animate. */}
      <PatternGrid key={filter} works={visible} className="mt-10" />
    </section>
  );
}

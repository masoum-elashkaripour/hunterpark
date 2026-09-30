import type { Metadata } from "next";
import { WORKS } from "@/lib/works";
import { Work2Hero } from "@/components/work2-hero";
import { Work2Cases } from "@/components/work2-cases";

/**
 * Second take on the work index, kept on its own route so the first
 * (`/work`) stays untouched and the two can be put side by side.
 *
 * Shape: a sticky full-viewport reel that the case section scrolls up over.
 */

export const metadata: Metadata = {
  title: "Work — Hunterpark",
  description:
    "Selected films from Hunterpark: brand, healthcare, culture and impact work.",
};

/**
 * The three films behind the hero, shown back to back as one reel.
 *
 * Picked because their clips are three DIFFERENT samples — the stand-in
 * footage is cycled across the index, so neighbouring projects often share a
 * file and a reel built from those would appear to stall on one shot. Swap the
 * slugs to change the reel; just keep the clips distinct.
 */
const HERO_REEL = [
  "double-dose", // Busch — Double Dose        → sample-3
  "what-matters-most", // 3M — Improving Lives → sample-4
  "3m-science-applied-to-life-2", // 3M        → sample-6
];

export default function Work2Page() {
  const reel = HERO_REEL.map((slug) =>
    WORKS.find((w) => w.slug === slug),
  ).filter((w) => w !== undefined);

  return (
    <main>
      <Work2Hero reel={reel} />
      <Work2Cases works={WORKS} />
    </main>
  );
}

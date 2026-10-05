import type { Metadata } from "next";
import { WORKS } from "@/lib/works";
import { AboutHero } from "@/components/about-hero";
import { AboutStudio } from "@/components/about-studio";
import { AboutCapabilities } from "@/components/about-capabilities";
import { AboutClosing } from "@/components/about-closing";

/**
 * About — the shell, ready to be filled.
 *
 * This is the old `/work-2` route repurposed. What is kept is the chrome and
 * the opening: the header (from the root layout), the reel hero, and the
 * closing footer film. The case section that used to follow the hero is gone —
 * it belonged to a second take on the index, not to this page. It is still in
 * git history on `feature/work-page` if any of it is wanted back.
 *
 * Everything between the hero and the footer is the page still to be written.
 */

export const metadata: Metadata = {
  title: "About — Hunterpark",
  description:
    "Hunterpark is a film production studio. We do not hunt. We are not a park.",
};

/**
 * The three films behind the hero — the ones you picked, by their frames.
 *
 * The videos in this build are SAMPLE footage standing in for the real cuts
 * (see `lib/works.ts`), so a work is chosen by which sample it resolves to.
 * These three are the clips in the stills you sent, and the captions in those
 * stills name the same three works — which is the confirmation:
 *
 *   sample-6   red-lit hair against a blue curtain        NAMI NYC — Inside & Outwards
 *   sample-4   a dancer on a white runway, pampas grass   Northwell — Cancer Institute
 *   sample-10  neon yellow hair, a hand through it        NYC Ballet — Lincoln Center
 *
 * All three are 1920×1080 and strongly coloured, which the hero needs for a
 * different reason now: the last one the reader is on does not leave with the
 * chapter — it stays, blurred, as the ground the next chapter is read on.
 */
const HERO_REEL = [
  "inside-outwards", //            → sample-6
  "northwell-cancer-institute", // → sample-4
  "andrea-miller", //              → sample-10
];

export default function AboutPage() {
  const reel = HERO_REEL.map((slug) =>
    WORKS.find((w) => w.slug === slug),
  ).filter((w) => w !== undefined);

  return (
    <main>
      <AboutHero reel={reel} />

      {/* Chapter 02 — the studio's argument, and then Talent. Two acts in one
          pinned stage, because the title physically travels between them: a
          heading cannot cross from one section's layout into another's. */}
      <AboutStudio />

      {/* Chapter 03 — what they can do, and the close that grows out of it:
          the staircase's last picture goes to fullscreen and out of focus, the
          lockup assembles on it, the footer rises over both. One scroll run,
          owned in one place. The staircase is INSIDE the closing because the
          layer that takes its last picture over has to be pinned from above it
          — see `AboutClosing`. */}
      <AboutClosing>
        <AboutCapabilities />
      </AboutClosing>
    </main>
  );
}

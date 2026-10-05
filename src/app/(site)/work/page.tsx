import type { Metadata } from "next";
import { WORKS } from "@/lib/works";
import { WorkCarousel } from "@/components/work-carousel";

export const metadata: Metadata = {
  title: "Work — Hunterpark",
  description:
    "Selected films from Hunterpark: brand, healthcare, culture and impact work.",
};

/**
 * The reel hero opening out into the patterned index — what was briefly tried
 * on its own route as `/work-3` and now simply IS this page.
 */
export default function WorkPage() {
  return (
    <main>
      <WorkCarousel works={WORKS} />
    </main>
  );
}

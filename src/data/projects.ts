import type { StaticImageData } from "next/image";
import { capabilityFilms, getStill, type StageFilm } from "./media";
import finalePhoto from "../assets/media/finale-green.jpg";

/**
 * Chapter 03 — Work. The selected projects, in the order the camera meets them.
 *
 * Project 01 is the Production film (IMG_4652) that fills the screen behind WORK at the end
 * of What We Do: with motion on, that same <video> is carried out of the capability window
 * and becomes this card (scripts/work.ts), so the hand-off has no cut.
 *
 * Each card keeps its media's own orientation — the film and the landscape stills stay
 * horizontal, the portraits vertical — and varies in scale and caption placement, so the
 * cards read as one system without being identical.
 *
 * Titles, clients and years are placeholders until the final case studies are supplied.
 */
export type CaptionPlacement = "above" | "inside" | "side" | "below";

export interface Project {
  id: string;
  title: string;
  client: string;
  discipline: string;
  year: string;
  media: { kind: "film"; film: StageFilm } | { kind: "still"; src: StaticImageData; focus: string };
  /** Width / height of the card — always the source's own, so nothing is re-cropped. */
  aspect: number;
  /** Relative size in the foreground (1 = standard). */
  scale: number;
  caption: CaptionPlacement;
}

const still = (id: string, focus?: string) => {
  const s = getStill(id);
  return { kind: "still" as const, src: s.src, focus: focus ?? s.focus };
};
const natural = (src: StaticImageData) => src.width / src.height;

// Landscape and portrait alternate through the sequence; the film leads, landscape.
export const projects: Project[] = [
  {
    id: "red-room",
    title: "Red Room",
    client: "HunterPark Originals",
    discipline: "Fashion film",
    year: "2025",
    media: { kind: "film", film: capabilityFilms.production }, // IMG_4652
    aspect: natural(capabilityFilms.production.poster),
    scale: 1.2,
    caption: "above",
  },
  {
    id: "mural",
    title: "Mural",
    client: "Editorial",
    discipline: "Portrait photography",
    year: "2025",
    media: still("portrait-01", "50% 30%"),
    aspect: natural(getStill("portrait-01").src),
    scale: 1,
    caption: "side",
  },
  {
    id: "off-fifth",
    title: "Off 5th",
    client: "Saks OFF 5TH",
    discipline: "Campaign",
    year: "2025",
    media: still("work-05", "50% 50%"),
    aspect: natural(getStill("work-05").src),
    scale: 1.1,
    caption: "below",
  },
  {
    id: "spectrum",
    title: "Spectrum",
    client: "Editorial",
    discipline: "Beauty photography",
    year: "2024",
    media: still("portrait-06", "50% 40%"),
    aspect: natural(getStill("portrait-06").src),
    scale: 0.94,
    caption: "inside",
  },
  {
    id: "match-point",
    title: "Match Point",
    client: "Sport campaign",
    discipline: "Film & stills",
    year: "2024",
    media: still("work-18", "50% 50%"),
    aspect: natural(getStill("work-18").src),
    scale: 1.05,
    caption: "below",
  },
  {
    id: "magenta",
    title: "Magenta",
    client: "Editorial",
    discipline: "Fashion photography",
    year: "2024",
    media: still("project-4635", "42% 45%"),
    aspect: natural(getStill("project-4635").src),
    scale: 1,
    caption: "inside",
  },
];

/**
 * The finale: it enters the sequence as a seventh project — "Your project" — and, instead of
 * passing the camera, opens out into the closing call to action (scripts/work.ts).
 * Its still — the green satin dress against blue-violet (finale-green.jpg, full resolution,
 * since it opens out to fill the frame) — also becomes the CTA's blurred background.
 */
export const finale: Project = {
  id: "your-project",
  title: "Your Project",
  client: "Your brand",
  discipline: "Coming next",
  year: "2026",
  // framed on her face when it opens out to the full frame
  media: { kind: "still", src: finalePhoto, focus: "50% 22%" },
  aspect: natural(finalePhoto),
  scale: 1.05,
  caption: "inside",
};

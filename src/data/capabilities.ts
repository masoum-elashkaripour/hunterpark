import type { StaticImageData } from "next/image";
import { capabilityFilms, getStill, studioFilms, type StageFilm } from "./media";

/**
 * What We Do — capabilities, each told by one piece of HunterPark's own media.
 * Only capabilities the provided work actually evidences are listed (no 3D/CGI,
 * motion design or post-production until there is media that shows it).
 * One asset per capability (a capability may also carry a second still via `also`,
 * cut in halfway through its share of the scroll — currently none do). Film & Video's media is the WHO WE ARE film (IMG_4642) itself:
 * with motion on, that same element grows fullscreen and settles into the capability
 * window (`shared: true`), so the section never shows a second copy of it.
 */
export interface Capability {
  id: string;
  title: string;
  /** One line — the media does the talking. */
  line: string;
  media: { kind: "film"; film: StageFilm; shared?: boolean } | { kind: "still"; src: StaticImageData; focus: string };
  /** A second still that takes over partway through the capability. */
  also?: { src: StaticImageData; focus: string };
}

const still = (id: string, focus?: string) => {
  const s = getStill(id);
  return { kind: "still" as const, src: s.src, focus: focus ?? s.focus };
};

export const capabilities: Capability[] = [
  {
    id: "film",
    title: "Film & Video",
    line: "Commercials, branded and fashion films — from first frame to final cut.",
    media: { kind: "film", film: studioFilms.whatWeDo, shared: true },
  },
  {
    id: "direction",
    title: "Creative Direction",
    line: "Concept, casting, styling and movement — the idea, made visible.",
    media: still("portrait-green", "55% 22%"),
  },
  {
    id: "campaigns",
    title: "Campaigns",
    line: "Campaign worlds for brands like CoverGirl, Saks OFF 5TH and Joe Fresh.",
    media: { kind: "film", film: capabilityFilms.campaigns },
  },
  {
    id: "photography",
    title: "Photography",
    line: "Fashion, beauty and portrait stills, lit to be remembered.",
    media: still("portrait-02", "45% 28%"),
  },
  {
    id: "production",
    title: "Production",
    line: "Studio and location production — crew, set and shoot, handled.",
    media: { kind: "film", film: capabilityFilms.production },
  },
];

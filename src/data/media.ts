import type { StaticImageData } from "next/image";
import studioPoster4624 from "../assets/media/studio-4624-poster.jpg";
import wwdPoster4642 from "../assets/media/wwd-4642-poster.jpg";
import capPoster4626 from "../assets/media/cap-4626-poster.jpg";
import capPoster4652 from "../assets/media/cap-4652-poster.jpg";
import landscape01 from "../assets/media/landscape-01.png";
import landscape02 from "../assets/media/landscape-02.png";
import portrait01 from "../assets/media/portrait-01.png";
import portrait02 from "../assets/media/portrait-02.png";
import portrait03 from "../assets/media/portrait-03.png";
import portrait04 from "../assets/media/portrait-04.png";
import portrait05 from "../assets/media/portrait-05.png";
import portrait06 from "../assets/media/portrait-06.png";
import portrait07 from "../assets/media/portrait-07.png";
import portraitGreen from "../assets/media/portrait-green.png";
import project4628 from "../assets/media/project-4628.png";
import project4633 from "../assets/media/project-4633.png";
import project4634 from "../assets/media/project-4634.png";
import project4635 from "../assets/media/project-4635.png";
import video4637Poster from "../assets/media/video-4637-poster.jpg";
import video4653Poster from "../assets/media/video-4653-poster.jpg";
import work01 from "../assets/media/work-01.png";
import work02 from "../assets/media/work-02.png";
import work03 from "../assets/media/work-03.png";
import work04 from "../assets/media/work-04.png";
import work05 from "../assets/media/work-05.png";
import work06 from "../assets/media/work-06.png";
import work07 from "../assets/media/work-07.png";
import work08 from "../assets/media/work-08.png";
import work09 from "../assets/media/work-09.png";
import work10 from "../assets/media/work-10.png";
import work11 from "../assets/media/work-11.png";
import work12 from "../assets/media/work-12.png";
import work13 from "../assets/media/work-13.png";
import work14 from "../assets/media/work-14.png";
import work15 from "../assets/media/work-15.png";
import work16 from "../assets/media/work-16.png";
import work17 from "../assets/media/work-17.png";
import work18 from "../assets/media/work-18.png";

/**
 * The single image collection shared by the preloader, hero and menu.
 * Everything visual on the homepage references stills from here by id,
 * so the preloader's final card and the hero's first background are
 * literally the same asset (and the same <img>/<video> element — see hero-handoff.ts).
 *
 * Placeholders from the HunterPark Figma board; replace with final media.
 */
export interface Still {
  id: string;
  src: StaticImageData;
  /** Focal point for full-bleed crops (CSS object-position). */
  focus: string;
  /**
   * Present when the item is a film: web encodes served from /public/media.
   * `src` is then its poster frame (used for thumbnails and before playback).
   */
  video?: { hd: string; sd: string; hdWebm: string; sdWebm: string };
}

// Static imports: Next reads each file's dimensions at build time and serves resized
// WebP through next/image. Add a line here when adding a file to src/assets/media.
const files: Record<string, StaticImageData> = {
  "landscape-01": landscape01,
  "landscape-02": landscape02,
  "portrait-01": portrait01,
  "portrait-02": portrait02,
  "portrait-03": portrait03,
  "portrait-04": portrait04,
  "portrait-05": portrait05,
  "portrait-06": portrait06,
  "portrait-07": portrait07,
  "portrait-green": portraitGreen,
  "project-4628": project4628,
  "project-4633": project4633,
  "project-4634": project4634,
  "project-4635": project4635,
  "video-4637-poster": video4637Poster,
  "video-4653-poster": video4653Poster,
  "work-01": work01,
  "work-02": work02,
  "work-03": work03,
  "work-04": work04,
  "work-05": work05,
  "work-06": work06,
  "work-07": work07,
  "work-08": work08,
  "work-09": work09,
  "work-10": work10,
  "work-11": work11,
  "work-12": work12,
  "work-13": work13,
  "work-14": work14,
  "work-15": work15,
  "work-16": work16,
  "work-17": work17,
  "work-18": work18,
};

function still(id: string, focus = "50% 40%", video?: Still["video"]): Still {
  const src = files[id];
  if (!src) throw new Error(`Missing media asset: ${id}`);
  return { id, src, focus, video };
}

/** Films: 1080p/720p web encodes of the originals in /Video — H.264 MP4 plus a VP9 WebM fallback, muted. */
const films: Still[] = [
  {
    ...still("video-4637-poster", "44% 40%", {
      hd: "/media/hero-4637-1080.mp4",
      sd: "/media/hero-4637-720.mp4",
      hdWebm: "/media/hero-4637-1080.webm",
      sdWebm: "/media/hero-4637-720.webm",
    }),
    id: "video-4637",
  },
  {
    ...still("video-4653-poster", "56% 30%", {
      hd: "/media/hero-4653-1080.mp4",
      sd: "/media/hero-4653-720.mp4",
      hdWebm: "/media/hero-4653-1080.webm",
      sdWebm: "/media/hero-4653-720.webm",
    }),
    id: "video-4653",
  },
];

export const stills: Still[] = [
  still("work-02", "50% 35%"),
  still("portrait-green", "50% 22%"),
  still("project-4635", "40% 40%"),
  still("project-4634", "50% 40%"),
  still("project-4628", "50% 35%"),
  still("project-4633", "50% 55%"),
  still("portrait-03", "50% 30%"),
  still("portrait-06", "50% 30%"),
  still("portrait-05", "50% 30%"),
  still("portrait-01", "50% 30%"),
  still("portrait-02", "50% 30%"),
  still("portrait-04", "50% 35%"),
  still("portrait-07", "50% 35%"),
  still("landscape-01"),
  still("landscape-02"),
  still("work-01"),
  still("work-03"),
  still("work-04"),
  still("work-05"),
  still("work-06"),
  still("work-07"),
  still("work-08"),
  still("work-09"),
  still("work-10"),
  still("work-11"),
  still("work-12"),
  still("work-13"),
  still("work-14"),
  still("work-15"),
  still("work-16"),
  still("work-17"),
  still("work-18"),
];

export const getStill = (id: string): Still => {
  const found = [...films, ...stills].find((s) => s.id === id);
  if (!found) throw new Error(`Unknown still: ${id}`);
  return found;
};

/**
 * Hero slides, in thumbnail order. Slide 0 is also the preloader's final card:
 * it lands last, expands to full bleed and simply stays as the hero background.
 * The film leads; the stills follow in the Figma "Hero section" order (node 79:19).
 */
export const heroSlides: Still[] = [
  "video-4653", // dance film — leads, and is the preloader's final card
  "project-4634", // runway — restored in place of the magenta studio still
  "project-4633",
  "portrait-03",
  "video-4637", // behind-the-scenes film
  "landscape-01",
].map(getStill);

/** Everything else is fair game for the preloader's random collage. */
export const collagePool: Still[] = stills.filter((s) => s.id !== heroSlides[0].id);

/** How long a hero *still* stays active before the next item. Films always play to their end. */
export const HERO_INTERVAL_MS = 5000;

/* ---------------------------------------------------------------------------
 * Chapter 02 — Studio films. Its own material: never shared with the hero.
 * Swap a film by replacing its web encodes in /public/media (vertical 9:16,
 * H.264, muted, faststart) and its poster frame in src/assets/media.
 * ------------------------------------------------------------------------- */

export interface StageFilm {
  id: string;
  /** First frame — shown until playback starts, and under reduced motion. */
  poster: StaticImageData;
  hd: string;
  sd: string;
  /** Focal point for crops (CSS object-position). */
  focus: string;
}

export const studioFilms = {
  /** Carries WHO WE ARE and the studio story — energetic, pink/cobalt. */
  story: {
    id: "studio-4624",
    poster: studioPoster4624,
    hd: "/media/studio-4624-hd.mp4",
    sd: "/media/studio-4624-sd.mp4",
    focus: "50% 38%",
  },
  /**
   * IMG_4642 — neon-lime beauty film (landscape). Appears bottom-right in WHO WE ARE,
   * grows to fullscreen, then settles into WHAT WE DO as the Film & Video media.
   */
  whatWeDo: {
    id: "wwd-4642",
    poster: wwdPoster4642,
    hd: "/media/wwd-4642-hd.mp4",
    sd: "/media/wwd-4642-sd.mp4",
    focus: "32% 35%",
  },
} satisfies Record<string, StageFilm>;

/* ---------------------------------------------------------------------------
 * What We Do — capability films (landscape web encodes of /Video originals).
 * ------------------------------------------------------------------------- */
export const capabilityFilms = {
  /** IMG_4626 — beauty close-up on cobalt: a campaign key-visual in motion. */
  campaigns: { id: "cap-4626", poster: capPoster4626, hd: "/media/cap-4626-hd.mp4", sd: "/media/cap-4626-sd.mp4", focus: "50% 30%" },
  /** IMG_4652 — low-key, gelled red light against a curtain: lighting and set on a shoot. */
  production: { id: "cap-4652", poster: capPoster4652, hd: "/media/cap-4652-hd.mp4", sd: "/media/cap-4652-sd.mp4", focus: "62% 40%" },
} satisfies Record<string, StageFilm>;

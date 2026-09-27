import type { ImageMetadata } from "astro";

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
  src: ImageMetadata;
  /** Focal point for full-bleed crops (CSS object-position). */
  focus: string;
  /**
   * Present when the item is a film: web encodes served from /public/media.
   * `src` is then its poster frame (used for thumbnails and before playback).
   */
  video?: { hd: string; sd: string; hdWebm: string; sdWebm: string };
}

const files = import.meta.glob<{ default: ImageMetadata }>("../assets/media/*.{png,jpg}", { eager: true });

function still(id: string, focus = "50% 40%", video?: Still["video"]): Still {
  const mod = files[`../assets/media/${id}.png`] ?? files[`../assets/media/${id}.jpg`];
  if (!mod) throw new Error(`Missing media asset: ${id}`);
  return { id, src: mod.default, focus, video };
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

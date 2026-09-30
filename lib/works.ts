/**
 * Work index data.
 *
 * Scraped from the live WordPress site (hunterpark.tv/work) — client, title
 * and slug are verbatim from that page, and `year` came from the upload path
 * of each thumbnail. `category` is an editorial taxonomy added for this
 * redesign: the current site ships no categories and the filter rail needs
 * them.
 *
 * The thumbnails themselves are not here — see `live-thumbnails.ts`. Cards
 * show a frame from their own clip instead, so nothing from the old site is
 * fetched or shipped to the browser.
 */

export const CATEGORIES = ["Brand", "Healthcare", "Culture", "Impact"] as const;

export type Category = (typeof CATEGORIES)[number];

export type Work = {
  slug: string;
  client: string;
  title: string;
  /** Disambiguates the three 3M "Improving Lives" films. */
  note?: string;
  category: Category;
  year: number;
  /** Loop played when this card is hovered or centred. */
  video: string;
  /** Still shown until the clip has a frame. Taken from the clip itself. */
  poster: string;
};

/**
 * SAMPLE FOOTAGE — stand-ins, not the real films. Each poster is a frame
 * lifted out of its own clip, so the still and the footage always match.
 *
 * When a project's real cut lands, set its `video` and `poster` together.
 */
const LANDSCAPE = Array.from({ length: 11 }, (_, i) => ({
  video: `/video/sample-${i + 1}.mp4`,
  poster: `/poster/sample-${i + 1}.jpg`,
}));

/** Vertical cuts. Supplied as 4K masters and transcoded down for the web. */
const PORTRAIT = Array.from({ length: 3 }, (_, i) => ({
  video: `/video/vertical-${i + 1}.mp4`,
  poster: `/poster/vertical-${i + 1}.jpg`,
}));

/**
 * Which cells of the index's five-card pattern are 9:16 — see `PatternGrid`,
 * where the same two positions carry the portrait crop.
 */
const PORTRAIT_CELLS = new Set([2, 4]);

/**
 * The pool is ordered to LINE UP with that pattern rather than cycled blindly:
 * a portrait clip dropped into a 16:9 cell loses both its sides, and a
 * landscape one in a 9:16 cell loses most of the shot.
 *
 * Twenty long — four pattern cycles — which is the shortest length that both
 * stays in step (a multiple of five) and gets through all eleven landscape
 * stand-ins. Each cycle spends three of its five cells on landscape, so eleven
 * clips need four cycles; the twelfth landscape cell repeats the first clip.
 *
 * The alignment is exact for the unfiltered index. Filtering renumbers the
 * cards, so a clip can land in the other kind of cell there; with stand-in
 * footage that is a crop, not a wrong film.
 */
const SAMPLES = (() => {
  const pool: { video: string; poster: string }[] = [];
  let landscape = 0;
  let portrait = 0;

  for (let i = 0; i < 20; i += 1) {
    pool.push(
      PORTRAIT_CELLS.has(i % 5)
        ? PORTRAIT[portrait++ % PORTRAIT.length]
        : LANDSCAPE[landscape++ % LANDSCAPE.length],
    );
  }

  return pool;
})();

/**
 * The clips the reel is allowed to show, best first.
 *
 * Two rules the reel has that the index does not. It only ever shows LANDSCAPE
 * footage — its cards are 16:9 planes in a 3D scene, and a vertical cut in one
 * is a narrow slice of a tall frame. And it shows each clip ONCE: the stand-ins
 * repeat across thirty-one projects, so an un-deduplicated reel plays the same
 * shot every few cards.
 *
 * The order is measured, not guessed — mean saturation and luma sampled a
 * frame a second across each clip:
 *
 *   sample-2  sat 30.6  luma 95    saturated and bright
 *   sample-3  sat 31.6  luma 67    the most saturated
 *   sample-4  sat 12.8  luma 118   editorial pick, see below
 *   sample-6  sat 11.4  luma  32   editorial pick, see below
 *   sample-5  sat 14.2  luma 137   bright, less colour
 *   sample-10                        editorial pick, see below
 *
 * Two of these are here by choice rather than by measurement, both asked for
 * by name: `sample-4` carries Northwell Health / Cancer Institute,
 * `sample-6` carries NAMI NYC / Inside & Outwards, and `sample-10` carries
 * NYC Ballet / Lincoln Center — the one shot against yellow, which took
 * `sample-7`'s slot (St. Bernards / Women's Health). `sample-6` in particular is
 * the darkest clip in the set — a red-lit figure against near-black — so it
 * reads very differently from its neighbours on the arc. That is a deliberate
 * choice, not an oversight.
 *
 * `sample-1` (Old Dominion / NCAA) came out to make room. 1 and 8 are the two
 * still out: 8 is both flat and dark (luma 24) with nothing asking for it.
 */
export const REEL_CLIPS = [
  "/video/sample-2.mp4",
  "/video/sample-3.mp4",
  "/video/sample-4.mp4",
  "/video/sample-6.mp4",
  "/video/sample-5.mp4",
  "/video/sample-10.mp4",
];

/**
 * One project per clip, ordered so the vertical cuts land on the feature slot.
 *
 * WHY IT SHORTENS THE INDEX: there are thirty-one projects and eleven
 * stand-in clips, so showing every project necessarily repeats footage. Until
 * the real cuts land, an index where every card is a different film is worth
 * more than one that is complete but plays the same three shots over and over.
 * When each project has its own file this becomes a no-op.
 *
 * WHY THE ORDER: `PatternGrid` groups in threes and the first of each group is
 * the feature — 60% of the width, stretched to the height of the two stacked
 * beside it, which works out close to square. A 9:16 cut survives that far
 * better than it survives a 16:9 slot, where it is reduced to a band across
 * its own middle.
 */
export function oneWorkPerClip(works: Work[]): Work[] {
  const byClip = new Map<string, Work>();
  for (const work of works) {
    if (!byClip.has(work.video)) byClip.set(work.video, work);
  }

  const unique = [...byClip.values()];
  const portrait = unique.filter((w) => w.video.includes("/vertical-"));
  const landscape = unique.filter((w) => !w.video.includes("/vertical-"));

  const ordered: Work[] = [];
  while (portrait.length > 0 || landscape.length > 0) {
    // Feature slot first, then the two that stack beside it.
    ordered.push(portrait.shift() ?? landscape.shift()!);
    for (let i = 0; i < 2 && landscape.length > 0; i += 1) {
      ordered.push(landscape.shift()!);
    }
  }

  return ordered.filter(Boolean);
}

const BASE_WORKS: Omit<Work, "video" | "poster">[] = [
  {
    slug: "old-dominion-ncaa",
    client: "Old Dominion",
    title: "NCAA",
    category: "Brand",
    year: 2022,
  },
  {
    slug: "sweaty-betty-i-train-for-me",
    client: "Sweaty Betty",
    title: "I Train For Me",
    category: "Brand",
    year: 2022,
  },
  {
    slug: "what-saving-looks-like",
    client: "Northwell Health",
    title: "What Saving Looks Like",
    category: "Healthcare",
    year: 2022,
  },
  {
    slug: "anthem",
    client: "Ballet Company",
    title: "Anthem",
    category: "Culture",
    year: 2022,
  },
  {
    slug: "overnight-farmers-focus",
    client: "Farmer Focus",
    title: "Overnight",
    category: "Brand",
    year: 2021,
  },
  {
    slug: "northwell-cancer-institute",
    client: "Northwell Health",
    title: "Cancer Institute",
    category: "Healthcare",
    year: 2021,
  },
  {
    slug: "saks",
    client: "Saks Off Fifth",
    title: "Celebrate Pride",
    category: "Brand",
    year: 2021,
  },
  {
    slug: "stand-for-change",
    client: "Black Theatre United",
    title: "Stand For Change",
    category: "Culture",
    year: 2021,
  },
  {
    slug: "inside-outwards",
    client: "NAMI NYC",
    title: "Inside & Outwards",
    category: "Impact",
    year: 2020,
  },
  {
    slug: "vns-health-were-neighbors",
    client: "VNS Health",
    title: "We're Neighbors",
    category: "Healthcare",
    year: 2022,
  },
  {
    slug: "st-bernards-womens-health",
    client: "St. Bernards",
    title: "Women's Health",
    category: "Healthcare",
    year: 2022,
  },
  {
    slug: "usta-move-tennis-forward",
    client: "USTA",
    title: "Move Tennis Forward",
    category: "Impact",
    year: 2020,
  },
  {
    slug: "scotch-soda-better-together",
    client: "Scotch & Soda",
    title: "Better Together",
    category: "Brand",
    year: 2021,
  },
  {
    slug: "lift-the-label-stigma-amelie-co",
    client: "Colorado State",
    title: "Lift the Label — Stigma",
    category: "Impact",
    year: 2021,
  },
  {
    slug: "a-time-to-sing",
    client: "The Kennedy Center",
    title: "A Time To Sing",
    note: "Feat. Vanessa Williams & Renée Fleming",
    category: "Culture",
    year: 2020,
  },
  {
    slug: "andrea-miller",
    client: "NYC Ballet",
    title: "Lincoln Center",
    category: "Culture",
    year: 2020,
  },
  {
    slug: "reputation-north-shore-hospital",
    client: "Northwell Health",
    title: "Home",
    category: "Healthcare",
    year: 2021,
  },
  {
    slug: "bethesda-fountain",
    client: "CPC",
    title: "Bethesda Fountain",
    category: "Culture",
    year: 2021,
  },
  {
    slug: "double-dose",
    client: "Busch",
    title: "Double Dose",
    category: "Brand",
    year: 2020,
  },
  {
    slug: "what-matters-most",
    client: "3M",
    title: "Improving Lives",
    note: "Scotchlite",
    category: "Brand",
    year: 2020,
  },
  {
    slug: "masks",
    client: "New York Presbyterian",
    title: "Masks",
    category: "Healthcare",
    year: 2021,
  },
  {
    slug: "coming-soon-2",
    client: "3M",
    title: "Improving Lives",
    note: "Tegaderm",
    category: "Brand",
    year: 2020,
  },
  {
    slug: "shine-glaze",
    client: "Better Natured",
    title: "Shine Glaze",
    category: "Brand",
    year: 2021,
  },
  {
    slug: "directors-cut",
    client: "United Steel Workers",
    title: "Anthem",
    category: "Impact",
    year: 2020,
  },
  {
    slug: "amazing-ones",
    client: "New York Presbyterian",
    title: "Amazing Things",
    category: "Healthcare",
    year: 2020,
  },
  {
    slug: "making-connections",
    client: "PSEG",
    title: "Making Connections",
    category: "Impact",
    year: 2020,
  },
  {
    slug: "catch-the-clean-energy-bug",
    client: "NJ State",
    title: "Lighting The Way",
    category: "Impact",
    year: 2020,
  },
  {
    slug: "riverwalk-ping-pong",
    client: "Riverwalk",
    title: "Ping Pong Ace",
    category: "Brand",
    year: 2021,
  },
  {
    slug: "we-will-never-stop",
    client: "St. Bernard's Hospital",
    title: "The Heart of Great Medicine",
    category: "Healthcare",
    year: 2020,
  },
  {
    slug: "3m-science-applied-to-life-2",
    client: "3M",
    title: "Improving Lives",
    category: "Brand",
    year: 2020,
  },
  {
    slug: "new-york-presbyterian",
    client: "New York Presbyterian",
    title: "#4 Hospital in the Nation",
    category: "Healthcare",
    year: 2021,
  },
];

export const WORKS: Work[] = BASE_WORKS.map((work, i) => ({
  ...work,
  ...SAMPLES[i % SAMPLES.length],
}));

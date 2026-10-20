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

/** What a project IS on the index — the second filter, beside the categories. */
export const KINDS = ["Film", "Photo"] as const;

export type Kind = (typeof KINDS)[number];

export type Work = {
  slug: string;
  client: string;
  title: string;
  /** Disambiguates the three 3M "Improving Lives" films. */
  note?: string;
  category: Category;
  year: number;
  kind: Kind;
  /**
   * Loop played when this card is hovered or centred. Films only — a photo
   * project has no clip, and its card is the photograph itself.
   */
  video?: string;
  /** Still shown until the clip has a frame — or, for a photo, the picture. */
  poster: string;
  /** A 4:5 / 2:3 photograph: belongs in the tall feature slot, like a 9:16 cut. */
  tall?: boolean;
};

/**
 * SAMPLE FOOTAGE — stand-ins, not the real films. Each poster is a frame
 * lifted out of its own clip, so the still and the footage always match.
 *
 * When a project's real cut lands, set its `video` and `poster` together.
 */
/**
 * ORDER IS MEANING HERE, so it is written out rather than generated.
 *
 * It used to be `Array.from({length: 11}, i => sample-${i+1})` — numeric order,
 * which is no order at all. `SAMPLES` draws its landscape cells from this array
 * front to back and `WORKS` takes `SAMPLES[i]`, so position 0 is the first
 * landscape card a reader ever sees on the index. Numeric order put `sample-1`
 * there: 1280x720 at 453 kbps, the weakest file in the set, with the three
 * supplied 1080p clips at positions 9, 10 and 11 — so far down that they only
 * appeared around the fourteenth card.
 *
 * The three supplied clips lead now. Measured, a frame a second across each
 * file, against the stand-ins they displaced:
 *
 *   sample-9    1920x1080   3806 kbps   luma 163   sat  3.4   the brightest
 *   sample-10   1920x1080   3901 kbps   luma 112   sat 27.2   bright and saturated
 *   sample-11   1920x1080  10593 kbps   luma  67   sat 31.4   the most saturated
 *   ---
 *   sample-1    1280x720     453 kbps   luma  93   sat 21.4   was first
 *   sample-2    1280x720    1245 kbps   luma  94   sat 30.4   was second
 *
 * Every supplied clip is 1080p and between three and twenty-three times the
 * bitrate of the stand-in it replaced at the front.
 *
 * The eight stand-ins keep their slots further down rather than being deleted:
 * there are thirty-one projects and six supplied clips, so the list still needs
 * filler. They are ordered brightest first behind the real footage, which is
 * the same rule, applied twice.
 */
const LANDSCAPE = [
  /* Supplied footage — see the measurements above. */
  "sample-9",
  "sample-10",
  "sample-11",
  /* Stand-ins, brightest first: luma 139, 136, 94, 93, 85, 67, 32, 24. */
  "sample-7",
  "sample-5",
  "sample-2",
  "sample-1",
  "sample-4",
  "sample-3",
  "sample-6",
  "sample-8",
].map((name) => ({
  video: `/video/${name}.mp4`,
  poster: `/poster/${name}.jpg`,
}));

/**
 * Vertical cuts. Supplied as 4K masters and transcoded down for the web — so
 * all three of these are real footage, not stand-ins, and they already sit at
 * the front of their own rotation. `vertical-1` is both the brightest of them
 * (luma 134) and the one `oneWorkPerClip` hands the index's first feature slot.
 */
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
 * THE SUPPLIED FOOTAGE LEADS. The reel is the first thing the page shows, and
 * it was opening on 720p stand-ins while three 1080p clips sat unused in it.
 * Measured a frame a second across each file:
 *
 *   sample-9    1920x1080   3806 kbps   luma 163  sat  3.4   the brightest shot
 *   sample-10   1920x1080   3901 kbps   luma 112  sat 27.2   bright, saturated
 *   sample-11   1920x1080  10593 kbps   luma  67  sat 31.4   the most saturated
 *   sample-2    1280x720    1245 kbps   luma  94  sat 30.4
 *   sample-3    1280x720    2673 kbps   luma  67  sat 31.5
 *   sample-6    1280x720     311 kbps   luma  32  sat  7.6
 *
 * `sample-6` is kept, and kept last, deliberately: it is the darkest clip in
 * the set — a red-lit figure against near-black — and it carries NAMI NYC /
 * Inside & Outwards, which was asked for by name. Last is where a deliberate
 * dark contrast belongs once there is brighter footage to open on.
 *
 * `sample-4` and `sample-5` came out. Both were here on brightness grounds
 * measured against the old set, and both are 720p; the supplied clips beat them
 * on the same measurement that put them here.
 */
export const REEL_CLIPS = [
  "/video/sample-9.mp4",
  "/video/sample-10.mp4",
  "/video/sample-11.mp4",
  "/video/sample-2.mp4",
  "/video/sample-3.mp4",
  "/video/sample-6.mp4",
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
  /* Keyed by the clip, or by the picture for a photo — every photograph is its
     own file, so photos never collapse into one another. */
  const byClip = new Map<string, Work>();
  for (const work of works) {
    const key = work.video ?? work.poster;
    if (!byClip.has(key)) byClip.set(key, work);
  }

  const unique = [...byClip.values()];
  const isTall = (w: Work) => w.tall || !!w.video?.includes("/vertical-");
  const portrait = unique.filter(isTall);
  const landscape = unique.filter((w) => !isTall(w));

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

const BASE_WORKS: Omit<Work, "video" | "poster" | "kind">[] = [
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

/**
 * Clips PINNED to a project by name, independent of the pool.
 *
 * These three were chosen off the stills that were sent, frame by frame — the
 * captions in those stills name the same three works, which is what confirmed
 * them. `app/about/page.tsx` then looks each one up BY SLUG to build the hero's
 * film reel, so the pairing is load-bearing for a different page.
 *
 * It used to be implicit: a project got whatever `SAMPLES[i]` happened to hand
 * it, and these three landed on the right clips by arithmetic. Reordering
 * `LANDSCAPE` to put the supplied footage first moved every project's clip by
 * some amount, and these three silently became `sample-2`, `sample-7` and
 * `sample-6` — three films nobody picked, on the one reel that was picked by
 * hand.
 *
 * Written down, the pairing survives any future reordering, which is the point:
 * an editorial choice should not be a consequence of an array's index.
 */
const PINNED: Record<string, string> = {
  /* red-lit hair against a blue curtain */
  "inside-outwards": "sample-6",
  /* a dancer on a white runway, pampas grass */
  "northwell-cancer-institute": "sample-4",
  /* neon yellow hair, a hand through it */
  "andrea-miller": "sample-10",
};

const FILMS: Work[] = BASE_WORKS.map((work, i) => {
  const pin = PINNED[work.slug];
  return {
    ...work,
    kind: "Film" as const,
    ...(pin
      ? { video: `/video/${pin}.mp4`, poster: `/poster/${pin}.jpg` }
      : SAMPLES[i % SAMPLES.length]),
  };
});

/**
 * Photography — stills series shot alongside the films.
 *
 * SAMPLE PHOTOGRAPHS, like the footage: picked from the image set supplied on
 * Google Drive, and standing in until the real stills land. Each is paired with
 * a project whose film it suits, and there is at least one per category so no
 * filter combination comes up empty. The two upright frames are marked `tall`
 * so they land in the feature slot rather than being cropped to a band.
 */
const PHOTOS: Work[] = (
  [
    {
      slug: "saks-celebrate-pride-stills",
      client: "Saks Off Fifth",
      title: "Celebrate Pride — Stills",
      category: "Brand",
      year: 2021,
      poster: "/photo/ali-pazani.jpg",
    },
    {
      slug: "inside-outwards-stills",
      client: "NAMI NYC",
      title: "Inside & Outwards — Stills",
      category: "Impact",
      year: 2020,
      poster: "/photo/ivan-kazlouskij.jpg",
    },
    {
      slug: "anthem-stills",
      client: "Ballet Company",
      title: "Anthem — Stills",
      category: "Culture",
      year: 2022,
      poster: "/photo/cleopas-monbest.jpg",
      tall: true,
    },
    {
      slug: "st-bernards-womens-health-stills",
      client: "St. Bernards",
      title: "Women's Health — Stills",
      category: "Healthcare",
      year: 2022,
      poster: "/photo/marina-nazina.jpg",
      tall: true,
    },
    {
      slug: "stand-for-change-stills",
      client: "Black Theatre United",
      title: "Stand For Change — Stills",
      category: "Culture",
      year: 2021,
      poster: "/photo/iris-avi.jpg",
    },
    {
      /* a dancer in body paint on a dark, wet stage — the stills to the ballet film */
      slug: "andrea-miller-stills",
      client: "NYC Ballet",
      title: "Lincoln Center — Stills",
      category: "Culture",
      year: 2020,
      poster: "/photo/babarinde-tosin.jpg",
    },
    {
      slug: "scotch-soda-better-together-stills",
      client: "Scotch & Soda",
      title: "Better Together — Stills",
      category: "Brand",
      year: 2021,
      poster: "/photo/carol-magalhaes.jpg",
    },
  ] satisfies Omit<Work, "kind">[]
).map((photo) => ({ ...photo, kind: "Photo" as const }));

/**
 * Films and photos woven together — one photo after every three films — so
 * the unfiltered index shows both from its first page rather than leaving the
 * photographs at the far end behind "See more".
 */
export const WORKS: Work[] = (() => {
  const out: Work[] = [];
  const photos = [...PHOTOS];
  FILMS.forEach((film, i) => {
    out.push(film);
    if (i % 3 === 2 && photos.length > 0) out.push(photos.shift()!);
  });
  return [...out, ...photos];
})();

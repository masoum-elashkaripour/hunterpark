/**
 * The studio's news — ONE list, which the /news page renders.
 *
 * WHAT IS HERE IS WHAT hunterpark.tv/news PUBLISHES: the same nine press
 * pieces, in the same order, with their titles, dates, excerpts and links
 * verbatim, and their own images (the originals, in `public/news/`). Each is
 * a piece another publication wrote about the studio's work, so every one
 * links OUT to that publication rather than to a page of ours.
 *
 * `project` and `category` are not on the live page as fields — they are what
 * each piece is about (its own title and excerpt say so), added so the list
 * can be filtered by kind of work. `featured` picks the one the page opens on.
 */
export type NewsItem = {
  /** URL-safe id, also the image's file name. */
  slug: string;
  title: string;
  /** ISO date, as the live page dates it. */
  date: string;
  /** The publication — the piece's byline, in effect. */
  source: string;
  /** The studio's piece of work it is about. */
  project: string;
  /** The kind of work — what the filter sorts by. */
  category: NewsCategory;
  excerpt: string;
  image: { src: string; width: number; height: number };
  /** The piece itself, on the publication's site. */
  href: string;
  featured?: boolean;
};

export const CATEGORIES = [
  "Short film",
  "Music video",
  "Campaign",
  "Performance",
  "Dance",
] as const;
export type NewsCategory = (typeof CATEGORIES)[number];

export const NEWS: NewsItem[] = [
  {
    slug: "the-park-needs-us",
    title:
      "Central Park Comes Alive With the Voices of Whoopi Goldberg, Hank Azaria and Other Celebs",
    date: "2021-05-17",
    source: "Adweek",
    project: "The Park Needs Us",
    category: "Campaign",
    excerpt:
      "“The Park Needs Us” intends to raise awareness not only of the Conservancy’s role in the Park, but also the critical role that the public plays in keeping the nonprofit buoyant.",
    image: { src: "/news/the-park-needs-us.jpg", width: 1200, height: 676 },
    href: "https://www.adweek.com/agencyspy/central-park-comes-alive-with-the-voices-of-whoopi-goldberg-hank-azaria-and-other-celebs/172364/",
    featured: true,
  },
  {
    slug: "stand-for-change-thr",
    title:
      "Vanessa Williams on Black Theatre United’s Debut Single: “It Is So Moving and So Relevant”",
    date: "2021-05-16",
    source: "The Hollywood Reporter",
    project: "Stand for Change",
    category: "Music video",
    excerpt:
      "The song is brought to life by BTU founding members Williams, Billy Porter, Audra McDonald, Darius de Haas, Norm Lewis, Brian Stokes Mitchell, Lillias White, Allyson Tucker, Michael McElroy, NaTasha Yvette Williams, LaChanze, Wendell Pierce and Capathia Jenkins.",
    image: { src: "/news/stand-for-change-thr.jpg", width: 681, height: 383 },
    href: "https://www.hollywoodreporter.com/news/general-news/vanessa-williams-on-black-theatre-uniteds-debut-single-it-is-so-moving-and-so-relevant-4156151/",
  },
  {
    slug: "stand-for-change-people",
    title:
      "Vanessa Williams Wants Black Theatre United’s Uplifting ‘Stand for Change’ Music Video ‘To Be Our Legacy’",
    date: "2021-05-16",
    source: "People",
    project: "Stand for Change",
    category: "Music video",
    excerpt:
      "Vanessa Williams talks to PEOPLE about what she hopes will be “the ‘We Are The World’ of theater in this moment”",
    image: { src: "/news/stand-for-change-people.jpg", width: 762, height: 531 },
    href: "https://people.com/movies/vanessa-williams-wants-black-theater-uniteds-uplifting-stand-for-change-music-video-to-be-our-legacy/",
  },
  {
    slug: "inside-outwards-ew",
    title: "Sarah Jessica Parker narrates powerful mental health PSA",
    date: "2021-02-10",
    source: "Entertainment Weekly",
    project: "Inside & Outwards",
    category: "Short film",
    excerpt:
      "Inside & Outwards explores mental health and the feeling of isolation created by COVID-19 quarantine.",
    image: { src: "/news/inside-outwards-ew.jpg", width: 1200, height: 799 },
    href: "https://ew.com/movies/sarah-jessica-parker-mental-health-psa/",
  },
  {
    slug: "a-time-to-sing",
    title:
      "Renée Fleming and Vanessa Williams sang at the Kennedy Center. And it turned the electricity back on.",
    date: "2021-02-10",
    source: "The Washington Post",
    project: "A Time to Sing",
    category: "Performance",
    excerpt:
      "Renée Fleming and Vanessa Williams in “A Time to Sing” on Saturday night at the Kennedy Center — the first indoor musical event there since March.",
    image: { src: "/news/a-time-to-sing.jpg", width: 481, height: 580 },
    href: "https://www.washingtonpost.com/entertainment/theater_dance/first-show-at-kennedy-center-since-covid-shutdown/2020/09/27/f57aac6e-fff1-11ea-b555-4d71a9254f4b_story.html",
  },
  {
    slug: "new-york-city-ballet",
    title: "How New York City Ballet Took On the Pandemic",
    date: "2021-02-10",
    source: "The New Yorker",
    project: "New York City Ballet",
    category: "Dance",
    excerpt:
      "With its season—including “The Nutcracker”—cancelled, the company created a video series that asks, What can dance, so dependent on bodies sharing space, become in the age of social distancing?",
    image: { src: "/news/new-york-city-ballet.jpg", width: 1200, height: 800 },
    href: "https://www.newyorker.com/magazine/2020/11/09/how-new-york-city-ballet-took-on-the-pandemic",
  },
  {
    slug: "inside-outwards-thr",
    title:
      "Sarah Jessica Parker on Narrating Mental Health PSA: It’s Wonderfully Poetic",
    date: "2021-02-10",
    source: "The Hollywood Reporter",
    project: "Inside & Outwards",
    category: "Short film",
    excerpt:
      "Sarah Jessica Parker talks about providing the voiceover for Inside & Outward, a new mental health-focused short film in partnership with the National Alliance of Mental Illness — New York City.",
    image: { src: "/news/inside-outwards-thr.jpg", width: 681, height: 383 },
    href: "https://www.hollywoodreporter.com/rambling-reporter/sarah-jessica-parker-on-narrating-mental-health-psa-its-wonderfully-poetic",
  },
  {
    slug: "inside-outwards-the-hill",
    title: "New star-studded film tackles suicide, mental health during the pandemic",
    date: "2021-05-16",
    source: "The Hill",
    project: "Inside & Outwards",
    category: "Short film",
    excerpt:
      "“Inside & Outwards” is a short film narrated by Parker that raises awareness of mental health during the coronavirus pandemic.",
    image: { src: "/news/inside-outwards-the-hill.jpg", width: 1200, height: 675 },
    href: "https://thehill.com/changing-america/well-being/mental-health/515828-new-star-studded-film-tackles-suicide-mental-health",
  },
  {
    slug: "inside-outwards-adweek",
    title: "Sarah Jessica Parker Narrates This Stunning Short Film About Pandemic Loneliness",
    date: "2021-02-10",
    source: "Adweek",
    project: "Inside & Outwards",
    category: "Short film",
    excerpt:
      "A side project started by two creatives is now running as PSA for a mental health nonprofit",
    image: { src: "/news/inside-outwards-adweek.jpg", width: 1200, height: 505 },
    href: "https://www.adweek.com/agencies/sarah-jessica-parker-pandemic-loneliness-short-film/",
  },
];

/** "May 17, 2021" — one formatter for every date on the page. */
export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));

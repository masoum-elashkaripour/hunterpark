import type { Metadata } from "next";
import { NEWS } from "@/lib/news";
import { NewsHero } from "@/components/news-hero";
import { NewsFeatured } from "@/components/news-featured";
import { NewsFlight } from "@/components/news-flight";
import { NewsHub } from "@/components/news-hub";
import { PageFooter } from "@/components/page-footer";

/**
 * News — the studio's press, as an editorial hub.
 *
 * The structure is ownitt.fr/blog's (an opening, one story given the room, a
 * filterable grid); the language is this site's: Söhne
 * Breit over black, the lime accent, the header's ticket for every call to
 * action, CSS arrivals on load and `useInView` arrivals on scroll. The stories
 * are hunterpark.tv/news's own — see `lib/news.ts`.
 *
 * The footer is the site's, unchanged, through `PageFooter`. Pulled up a full
 * screen, so the wordmark starts down and the footer begins arriving as the
 * grid's last row reaches the top of the window — not a screen later.
 */

const DESCRIPTION =
  "Hunterpark in the press — The New Yorker, The Washington Post, The Hollywood Reporter, Adweek and more on the studio's films.";

export const metadata: Metadata = {
  title: "News — Hunterpark",
  description: DESCRIPTION,
  alternates: { canonical: "/news" },
  openGraph: {
    title: "News — Hunterpark",
    description: DESCRIPTION,
    type: "website",
    images: [{ url: NEWS[0].image.src }],
  },
};

/* The list as structured data, so search engines read it as what it is: a
   collection of articles, each living at its publication. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "News — Hunterpark",
  description: DESCRIPTION,
  mainEntity: {
    "@type": "ItemList",
    itemListElement: NEWS.map((n, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "NewsArticle",
        headline: n.title,
        datePublished: n.date,
        url: n.href,
        publisher: { "@type": "Organization", name: n.source },
        about: n.project,
      },
    })),
  },
};

const FEATURED = NEWS.find((n) => n.featured) ?? NEWS[0];

export default function NewsPage() {
  return (
    <main className="news-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NewsHero />
      <NewsFeatured />
      {/* The featured picture's flight from the opening into its box. */}
      <NewsFlight src={FEATURED.image.src} href={FEATURED.href} />
      <NewsHub />
      <PageFooter overlap={1} />
    </main>
  );
}

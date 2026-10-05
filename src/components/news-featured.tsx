import Image from "next/image";
import { NEWS, formatDate } from "@/lib/news";
import { NewsInView } from "@/components/news-in-view";
import { NewsReadLink } from "@/components/news-read-link";
import { FLIGHT_SIZES } from "@/components/news-flight";

/**
 * The one story the page opens on — `featured` in `lib/news.ts`.
 *
 * A wide picture and, beside it, the story's facts in reading order: what kind
 * of work, which project, the headline, the excerpt, who wrote it and when,
 * and the way to it. On desktop the picture is flown in from the opening by
 * `NewsFlight` and lands in this box (`data-flight-to`); the copy inside it is
 * what shows everywhere else, and without JavaScript.
 */
export function NewsFeatured() {
  const story = NEWS.find((n) => n.featured) ?? NEWS[0];
  if (!story) return null;

  return (
    /* `id`: the hero's "Scroll" cue lands here. */
    <NewsInView as="section" id="featured" className="news-featured">
      <article className="news-featured__grid" aria-labelledby="featured-title">
        <a
          className="news-featured__media"
          data-flight-to
          href={story.href}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={-1}
          aria-hidden
        >
          <Image
            src={story.image.src}
            alt=""
            width={story.image.width}
            height={story.image.height}
            sizes={FLIGHT_SIZES}
            quality={90}
            priority
          />
        </a>

        <div className="news-featured__body">
          <p className="label-xs news-featured__kicker">
            <span className="news-tag">Featured</span>
            <span>
              {story.category} · {story.project}
            </span>
          </p>

          <h2 id="featured-title" className="hp-display news-featured__title">
            <a
              href={story.href}
              target="_blank"
              rel="noopener noreferrer"
              title={story.title}
            >
              {story.title}
            </a>
          </h2>

          <p className="hp-copy news-featured__excerpt">{story.excerpt}</p>

          <p className="label-xs news-featured__byline">
            {story.source} ·{" "}
            <time dateTime={story.date}>{formatDate(story.date)}</time>
          </p>

          <NewsReadLink href={story.href} source={story.source} />
        </div>
      </article>
    </NewsInView>
  );
}

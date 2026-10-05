"use client";

import { m, useTransform } from "motion/react";
import { NEWS } from "@/lib/news";
import { ScrollChars } from "@/components/scroll-chars";
import Image from "next/image";
import { useScrollY } from "@/components/use-beat";
import { FLIGHT_SIZES } from "@/components/news-flight";

/**
 * The opening of /news — one full screen, and in the middle of it ONE column:
 * the eyebrow, the title and the standfirst, the same distance apart.
 *
 * ARRIVAL, on load, all CSS so nothing is blank before hydration — and slow:
 * the eyebrow rises, the title comes up out of its mask (`hero-mask-rise`, the
 * About hero's lockup move), the standfirst follows.
 *
 * DEPARTURE, on scroll, the About hero's own: the title's letters leave one at
 * a time, up and out (`ScrollChars` with its progress running DOWN and a
 * negative `from`), while the eyebrow and the standfirst fade and lift away. Both are
 * scrubbed — scroll back and the title builds itself again.
 *
 * Beside the title, an empty slot the featured story's picture starts in —
 * `NewsFlight` flies it from here into its own box below as the reader scrolls.
 * The slot is drawn wherever that flight can run (desktop, motion allowed).
 */

const TITLE = ["In the", "press."];
const FEATURED = NEWS.find((n) => n.featured) ?? NEWS[0];

/** The departure's window, in screens of scroll from the top. */
const LEAVE = { from: 0.04, to: 0.6 };

export function NewsHero() {
  const scrollY = useScrollY();
  /* Screens scrolled. `window` only exists in the browser; on the server the
     page is at its top, which is 0. */
  const screens = useTransform(() => {
    /* Read first, always — see the note in `NewsFlight`. */
    const sy = scrollY.get();
    return typeof window === "undefined" ? 0 : sy / window.innerHeight;
  });
  /* The title's own progress, running DOWN: 1 built, 0 gone. */
  const leave = useTransform(screens, [LEAVE.from, LEAVE.to], [1, 0]);
  /* The eyebrow and the standfirst go a little sooner than the last letters. */
  const fade = useTransform(screens, [LEAVE.from, LEAVE.to * 0.8], [1, 0]);
  const lift = useTransform(screens, [LEAVE.from, LEAVE.to], [0, -36]);

  return (
    <section className="news-hero" aria-labelledby="news-heading">
      {/* The ground: a photograph from the supplied archive, blurred in the
          file itself (public/news/hero-bg-28.jpg) rather than by a live filter,
          under a shade that keeps the title and the picture beside it first. */}
      <div className="news-hero__bg" aria-hidden>
        <Image
          src="/news/hero-bg-28.jpg"
          alt=""
          fill
          sizes="100vw"
          quality={80}
          priority
          className="news-hero__bg-img"
        />
        <span className="news-hero__bg-shade" />
      </div>

      <div className="news-hero__center">
        <m.p
          className="hp-eyebrow news-hero__eyebrow"
          style={{ opacity: fade, y: lift }}
        >
          <span
            className="hero-rise news-hero__rise"
            style={{ animationDelay: "0.3s" }}
          >
            News
          </span>
        </m.p>

        <div className="news-hero__stage">
          <h1 id="news-heading" className="hp-display news-hero__title">
            {/* Two motions, two elements, as on /about: the mask rises once on
                load; the glyphs inside it are driven by scroll. */}
            <span className="block overflow-hidden news-hero__mask">
              <span
                className="hero-mask-rise news-hero__rise"
                style={{ animationDelay: "0.45s" }}
              >
                <ScrollChars lines={TITLE} progress={leave} from={-40} />
              </span>
            </span>
          </h1>

          {/* The picture's starting place, with its own copy so it is on
              screen from the first paint — see `NewsFlight`. */}
          <div
            className="news-hero__slot"
            data-flight-from
            aria-hidden
            style={{
              aspectRatio: `${FEATURED.image.width} / ${FEATURED.image.height}`,
            }}
          >
            <span className="news-hero__slot-pic">
              <Image
                src={FEATURED.image.src}
                alt=""
                fill
                sizes={FLIGHT_SIZES}
                quality={90}
                priority
              />
            </span>
          </div>
        </div>

        <m.p
          className="hp-copy news-hero__standfirst"
          style={{ opacity: fade, y: lift }}
        >
          <span
            className="hero-rise news-hero__rise"
            style={{ animationDelay: "0.95s" }}
          >
            Our films, as the papers and magazines have written about them —
            from Central Park to the Kennedy Center.
          </span>
        </m.p>
      </div>
    </section>
  );
}

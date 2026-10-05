"use client";

import Image from "next/image";
import { useState } from "react";
import {
  CATEGORIES,
  NEWS,
  formatDate,
  type NewsCategory,
  type NewsItem,
} from "@/lib/news";
import { NewsInView } from "@/components/news-in-view";

/**
 * The filter and the grid of stories.
 *
 * THE GRID IS EDITORIAL, NOT UNIFORM: rows run wide-narrow, three equal, then
 * narrow-wide (7·5, 4·4·4, 5·7 of twelve), and each width carries its own
 * picture shape, so the page has a rhythm to it rather than a spreadsheet's.
 * The pattern is laid out over whatever the filter leaves, so a short result
 * is still a composed one — a single story runs the full width, two share it.
 *
 * Under 1024px it is one column (two from 640px) and the pattern steps aside.
 *
 * The filter is the kinds of work in `lib/news.ts` that have stories. "All" leaves
 * the featured story to the section above it; picking a kind shows every story
 * of that kind, featured included, so no filter can come up empty.
 *
 * SEVEN AT A TIME. The grid shows one full turn of the pattern (2 + 3 + 2) and
 * then a "See more" for the next seven, so the page stays the same length
 * however many stories the list grows to. A new filter starts again at seven.
 */

type Filter = "All" | NewsCategory;

const PATTERN = [[7, 5], [4, 4, 4], [5, 7]];
/** One full turn of the pattern. */
const PAGE = 7;

/** The stories as rows of column spans — see the note above. */
function compose(items: NewsItem[]) {
  const rows: { item: NewsItem; span: number }[][] = [];
  let i = 0;
  let r = 0;
  while (i < items.length) {
    const want = PATTERN[r % PATTERN.length];
    const take = items.slice(i, i + want.length);
    const spans =
      take.length === want.length
        ? want
        : take.length === 1
          ? [12]
          : take.map(() => 12 / take.length);
    rows.push(take.map((item, k) => ({ item, span: spans[k] })));
    i += take.length;
    r += 1;
  }
  return rows;
}

const Arrow = () => (
  <svg
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden
  >
    <path d="M4 12L12 4M5.5 4H12v6.5" />
  </svg>
);

function NewsCard({
  item,
  span,
  index,
  order,
}: {
  item: NewsItem;
  span: number;
  /** Its number in the list, for the "01" in the corner. */
  index: number;
  /** Its place in its row, for the arrival's stagger. */
  order: number;
}) {
  return (
    <NewsInView
      as="li"
      className={`news-card news-card--${span}`}
      style={{ "--stagger": `${order * 0.09}s` } as React.CSSProperties}
    >
      <article className="news-card__inner">
        <a
          className="news-card__link"
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="news-card__media">
            <Image
              src={item.image.src}
              alt=""
              fill
              quality={90}
              sizes={
                span === 12
                  ? "(max-width: 1023px) 100vw, 58vw"
                  : `(max-width: 639px) 100vw, (max-width: 1023px) 50vw, ${Math.round((span / 12) * 100)}vw`
              }
            />
          </span>

          <span className="news-card__body">
            <span className="label-xs news-card__meta">
              <span className="news-card__index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="news-tag">{item.category}</span>
            </span>

            <h3 className="hp-display news-card__title" title={item.title}>
              {item.title}
            </h3>

            <span className="hp-copy news-card__excerpt">{item.excerpt}</span>

            <span className="label-xs news-card__foot">
              <span>
                {item.source} ·{" "}
                <time dateTime={item.date}>{formatDate(item.date)}</time>
              </span>
              <span className="news-card__go">
                <Arrow />
              </span>
            </span>
          </span>
          <span className="visually-hidden">
            {" "}
            — read on {item.source} (opens in a new tab)
          </span>
        </a>
      </article>
    </NewsInView>
  );
}

export function NewsHub() {
  const [filter, setFilter] = useState<Filter>("All");
  const [visible, setVisible] = useState(PAGE);

  const counts = new Map<Filter, number>([["All", NEWS.length]]);
  for (const c of CATEGORIES) {
    counts.set(
      c,
      NEWS.filter((n) => n.category === c).length,
    );
  }
  const filters: Filter[] = [
    "All",
    ...CATEGORIES.filter((c) => (counts.get(c) ?? 0) > 0),
  ];

  const matching =
    filter === "All"
      ? NEWS.filter((n) => !n.featured)
      : NEWS.filter((n) => n.category === filter);
  const shown = matching.slice(0, visible);
  const remaining = matching.length - shown.length;
  const rows = compose(shown);

  return (
    <section className="news-hub" aria-labelledby="news-hub-heading">
      <div className="news-hub__head">
        <h2 id="news-hub-heading" className="hp-display news-hub__title">
          All stories
        </h2>

        <div
          className="news-filter no-scrollbar"
          role="group"
          aria-label="Filter stories by kind of work"
        >
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              className="news-filter__chip"
              aria-pressed={filter === f}
              onClick={() => {
                setFilter(f);
                setVisible(PAGE);
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Said once per change, politely — the reader has just acted. */}
      <p className="visually-hidden" aria-live="polite">
        {`Showing ${shown.length} of ${matching.length} ${matching.length === 1 ? "story" : "stories"}${filter === "All" ? "" : `: ${filter}`}.`}
      </p>

      {/* Keyed by the filter, so a change re-mounts the cards and each one
          arrives again — the transition is the cards' own entrance. */}
      <ul className="news-grid" key={filter}>
        {rows.flatMap((row) =>
          row.map(({ item, span }, k) => (
            <NewsCard
              key={item.slug}
              item={item}
              span={span}
              index={NEWS.indexOf(item)}
              order={k}
            />
          )),
        )}
      </ul>

      {remaining > 0 ? (
        <div className="news-more">
          {/* The header's ticket again — the one action style on the site. */}
          <button
            type="button"
            className="header-cta news-more__button"
            onClick={() => setVisible((v) => v + PAGE)}
          >
            <span className="header-cta__label">
              <span className="header-cta__roll" data-text="See more">
                <span>See more</span>
              </span>
            </span>
            <span className="header-cta__arrow news-more__arrow" aria-hidden>
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" />
              </svg>
            </span>
          </button>
          <p className="label-xs news-more__count">
            {shown.length} of {matching.length}
          </p>
        </div>
      ) : null}
    </section>
  );
}

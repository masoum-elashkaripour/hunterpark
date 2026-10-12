"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLaunch } from "@/components/launch";
import Link from "next/link";
import { type Work } from "@/lib/works";

/**
 * "More films" rail — a horizontal strip rather than the reference's stacked
 * grid, so the tail of the list stays one gesture away instead of a page of
 * scrolling.
 *
 * The scroll itself is CSS (`snap-x`, native overflow); the arrows are a
 * desktop affordance on top, since a strip with no visible edge is easy to
 * miss with a mouse. They hide themselves at each end.
 */
export function RelatedCarousel({ works }: { works: Work[] }) {
  const launch = useLaunch();

  const railRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const max = rail.scrollWidth - rail.clientWidth;
    setAtStart(rail.scrollLeft <= 1);
    // A sub-pixel gap at the far end would otherwise leave the arrow live.
    setAtEnd(rail.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    sync();
    // Also covers the case where a resize makes the whole rail fit, which
    // should retire both arrows.
    const observer = new ResizeObserver(sync);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [sync]);

  const nudge = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    // One viewport of rail per press, less a card, so the card at the edge
    // stays on screen as an anchor.
    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.8, 240),
      behavior: "smooth",
    });
  };

  if (works.length === 0) return null;

  return (
    <section aria-labelledby="more-films" className="mt-24 lg:mt-32">
      <div className="flex items-end justify-between gap-6 px-gutter">
        <h2 id="more-films" className="hp-display related__title text-h3">
          More films
        </h2>

        <div className="hidden shrink-0 gap-2 md:flex">
          <RailButton
            direction={-1}
            disabled={atStart}
            onPress={() => nudge(-1)}
          />
          <RailButton direction={1} disabled={atEnd} onPress={() => nudge(1)} />
        </div>
      </div>

      <ul
        ref={railRef}
        onScroll={sync}
        /* `overflow-x: auto` makes the cross axis a scrollport too, so this
           rail clips vertically as well. Without the top padding it shears off
           the tile's outline AND the 4px it lifts on hover. */
        className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-7 overflow-x-auto scroll-px-gutter px-gutter pt-3 pb-6"
      >
        {works.map((work) => (
          <li
            key={work.slug}
            className="w-[70vw] shrink-0 snap-start sm:w-[42vw] lg:w-[26vw] xl:w-[21vw]"
          >
            {/* Same move as the index grid: a card here grows into the next
                project's film rather than cutting to it. See `LaunchProvider`
                — the href stays real, and only a plain left click is taken. */}
            <Link
              href={`/work/${work.slug}`}
              className="work-tile block"
              onClick={(e) => {
                if (!launch || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
                  return;
                const frame =
                  e.currentTarget.querySelector(".work-tile__frame");
                const rect = frame?.getBoundingClientRect();
                if (!rect || rect.width < 1) return;
                e.preventDefault();
                launch({
                  href: `/work/${work.slug}`,
                  poster: work.poster,
                  rect,
                });
              }}
            >
              <span className="work-tile__frame">
                <Image
                  src={work.poster}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 70vw, (max-width: 1024px) 42vw, 22vw"
                  className="object-cover"
                />
              </span>

              <span className="mt-3 block">
                <span className="hp-tile-title block truncate text-h5">
                  {work.client}
                </span>
                <span className="hp-sub mt-1 block truncate text-sm text-off-white/55">
                  {work.title}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Lime-ruled square, the same cell the live site uses for "View Project". */
function RailButton({
  direction,
  disabled,
  onPress,
}: {
  direction: 1 | -1;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={direction === 1 ? "Scroll forward" : "Scroll back"}
      className="rail-button"
    >
      <svg
        viewBox="0 -960 960 960"
        width="14"
        height="14"
        fill="currentColor"
        aria-hidden
        style={direction === -1 ? { transform: "scaleX(-1)" } : undefined}
      >
        <path d="M665.08-450H180v-60h485.08L437.23-737.85 480-780l300 300-300 300-42.77-42.15L665.08-450Z" />
      </svg>
    </button>
  );
}

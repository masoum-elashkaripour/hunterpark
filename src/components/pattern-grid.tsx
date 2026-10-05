"use client";

import { useState } from "react";
import { useInView } from "@/components/use-in-view";
import Link from "next/link";
import { m, useReducedMotion } from "motion/react";
import { type Work } from "@/lib/works";
import { TileMedia } from "@/components/tile-media";
import { SplitText } from "@/components/split-text";
import { useLaunch } from "@/components/launch";

/**
 * The work index, laid out to a repeating composition rather than to a table.
 *
 * Every group is one feature at 60% of the width beside two smaller films
 * stacked in the remaining 40%, and each group mirrors the one before it:
 *
 *   ┌───────────────────────┐ ┌───────────┐
 *   │                       │ │     2     │      feature left
 *   │           1           │ ├───────────┤
 *   │                       │ │     3     │
 *   └───────────────────────┘ └───────────┘
 *   ┌───────────┐ ┌───────────────────────┐
 *   │     4     │ │                       │      feature right
 *   ├───────────┤ │           6           │
 *   │     5     │ │                       │
 *   └───────────┘ └───────────────────────┘
 *
 * Every container in here — the column of groups, each group, the stack inside
 * a group, and the pair that closes the index — carries the same `gap-grid`
 * and nothing else. No container sets `column-gap` and `row-gap` separately, no
 * card carries a margin, and there is no breakpoint override: the single token
 * `--hp-grid-gap` is fluid, so the two axes cannot drift apart at any width.
 *
 * (The `mt-3` under each frame is INSIDE the card — it is the caption's
 * relationship to its own picture, not a gap between cards, and the grid gap
 * still starts where the card's box ends.)
 *
 * Each group is its OWN five-column grid rather than all of them sharing one.
 * Placing a row-spanning feature inside a single grid needs explicit row and
 * column numbers per card, and those cannot be Tailwind classes — the class
 * names would be built at runtime and never reach the stylesheet. A grid per
 * group needs nothing but a span and an order.
 *
 * The feature takes its height from the stack beside it: the cell stretches to
 * the row, and the frame fills the cell. Below `lg` there is no row to stretch
 * to, so it falls back to 16:9 like everything else.
 */

const EASE: [number, number, number, number] = [0.19, 1, 0.22, 1];

/** Films per group: one feature, two stacked. */
const GROUP = 3;

/** Films in the unequal row that closes the index. */
const PAIR = 2;

/**
 * Which corner a frame opens out of — cycled by position, so neighbours never
 * open the same way. Derived from the index rather than `Math.random`, so the
 * server and the browser agree and hydration holds.
 */
const CORNERS = [
  "inset(0% 86% 74% 0%)", // top-left
  "inset(0% 0% 74% 86%)", // top-right
  "inset(74% 86% 0% 0%)", // bottom-left
  "inset(74% 0% 0% 86%)", // bottom-right
];

const OPEN = "inset(0% 0% 0% 0%)";

export function PatternGrid({
  works,
  complete = true,
  className = "",
}: {
  works: Work[];
  /**
   * These are all the films there are — so the index may close with its
   * unequal pair.
   *
   * On a partial page it must not: taking two off the end of twelve leaves ten,
   * which groups as 3·3·3·1 and strands a lone feature above the pair. Whole
   * groups only until the last page, where the remainder is the pair by design.
   */
  complete?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();

  /**
   * Reduced motion changes the DURATION, never whether the animation runs.
   * Branching `initial` on `reduced` left this grid permanently invisible
   * once: the server renders before `useReducedMotion` resolves, so it emits
   * the hidden state, and a client that then resolves it to `true` skips the
   * animation that was the only thing that would have cleared it.
   */
  const reveal = { duration: reduced ? 0 : 2.1, ease: EASE };

  /**
   * The last two films are lifted out of the repeating composition and set as
   * their own unequal row, closing the index.
   *
   * The pattern is deliberately regular, and a page of nothing but it starts to
   * read as a table. A pair at unequal widths — narrow left, wide right, tops
   * aligned — gives the run somewhere to land instead of simply stopping when
   * the work happens to run out.
   *
   * Taken off the end so they are not laid twice, and only when there is enough
   * work left for the pattern to still be a pattern.
   */
  const hasPair = complete && works.length >= PAIR + GROUP * 2;

  /* The film the closing transition takes to fullscreen — always the last one
     laid, whichever branch of the composition it lands in. Matched by slug
     rather than by position so neither branch has to know about the other. */
  const finale = works.at(-1)?.slug;
  const pair = hasPair ? works.slice(-PAIR) : [];
  const flow = hasPair ? works.slice(0, -PAIR) : works;

  const groups: Work[][] = [];
  for (let i = 0; i < flow.length; i += GROUP) {
    groups.push(flow.slice(i, i + GROUP));
  }

  return (
    <div className={`flex flex-col gap-grid px-gutter ${className}`}>
      {groups.map((group, g) => {
        const [feature, ...stack] = group;
        const mirrored = g % 2 === 1;
        const base = g * GROUP;

        return (
          <div
            key={feature.slug}
            /* One screen per group, header and a little air deducted — a film
               whose caption is below the fold is a film you cannot read. The
               row used to take its height from the stack beside the feature,
               which on a laptop put the feature's own caption off-screen. Both
               columns now shrink into the ceiling together.

               `minmax(0, 1fr)` is what makes the ceiling bind. A `max-height`
               on a grid caps the BOX but leaves the row sizing to its content,
               so the row simply overflowed and the last caption landed on top
               of the next group's films. An `fr` row still takes its content's
               height when there is room, and is the first thing to give when
               there is not.

               The bare `60px` takes the feature frame from 910 down to 850, as
               measured. It is deducted from the ROW rather than set on the
               frame so the pair stacked beside it lose the same 60 between
               them and the two columns stay flush — a cap on the feature alone
               would leave its bottom edge hanging short of theirs. */
            className="grid grid-cols-1 items-stretch gap-grid lg:max-h-[calc(100svh-var(--hp-header-h)-3rem-60px)] lg:grid-cols-5 lg:grid-rows-[minmax(0,1fr)]"
          >
            <div
              className={`lg:col-span-3 lg:min-h-0 ${mirrored ? "lg:order-2" : "lg:order-1"}`}
            >
              <Tile
                work={feature}
                i={base}
                reveal={reveal}
                finale={feature.slug === finale}
                feature
                stretch
              />
            </div>

            {stack.length > 0 ? (
              <div
                className={`flex flex-col gap-grid lg:col-span-2 lg:min-h-0 ${
                  mirrored ? "lg:order-1" : "lg:order-2"
                }`}
              >
                {stack.map((work, s) => (
                  <Tile
                    key={work.slug}
                    work={work}
                    i={base + s + 1}
                    reveal={reveal}
                    finale={work.slug === finale}
                    stretch
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      {/* Closes the index. `items-start` is what makes the pair unequal: both
          are 16:9, so the wider one is simply taller and hangs below the other
          rather than the two being stretched to match. Below `lg` they stack
          like everything else. */}
      {pair.length === PAIR ? (
        <div className="grid grid-cols-1 items-start gap-grid lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Tile
              work={pair[0]}
              i={0}
              reveal={reveal}
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </div>
          <div className="lg:col-span-7">
            <Tile
              work={pair[1]}
              i={1}
              reveal={reveal}
              finale={pair[1].slug === finale}
              sizes="(max-width: 1024px) 100vw, 58vw"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Tile({
  work,
  i,
  reveal,
  feature = false,
  stretch = false,
  finale = false,
  sizes,
}: {
  work: Work;
  i: number;
  reveal: { duration: number; ease: [number, number, number, number] };
  /** Sets which width this card asks the image optimiser for. */
  feature?: boolean;
  /**
   * Fill the height of the cell instead of holding 16:9.
   *
   * Separate from `feature` on purpose: inside a group that is capped to one
   * screen EVERY card has to be able to give up height, not just the big one.
   * Tying the two together left the stacked pair rigid at 16:9, so the cap had
   * nothing to squeeze and the group stayed taller than the viewport.
   */
  stretch?: boolean;
  /**
   * The last film in the index — the one the closing transition lifts out.
   *
   * The marker goes on the FRAME rather than on the picture inside it. The
   * frame is the box the reader sees and the only one of the two without a
   * transform of its own, so it is both the right rectangle to open a window
   * from and the only one whose `getBoundingClientRect` reports where it
   * actually sits rather than where its reveal has scaled it to.
   */
  finale?: boolean;
  /** Overrides the pattern's own widths for the unequal pair. */
  sizes?: string;
}) {
  /**
   * Cascaded across two groups rather than within one.
   *
   * `i % GROUP` meant every group started over, so a whole page arriving at
   * once — which is what "See more" does — opened in three near-simultaneous
   * waves. Over six, the page deals itself out in one continuous run instead,
   * which is the pace the rest of the site moves at.
   */
  const delay = (i % 6) * 0.16;

  /* Reduced motion needs no branch here: `reveal` already carries a duration
     of 0 in that mode, so the frame still opens — it just opens at once. */

  /**
   * Reached yet? See `useInView`.
   *
   * The blind four-second deadline this replaces was itself the bug the last
   * round introduced: it counted from MOUNT, not from arrival, so every card
   * below the fold opened in silence long before the reader got to it and the
   * lower half of the page had no animation left to play. A fallback must not
   * outrun the thing it is backing up.
   */
  const [frameRef, shown] = useInView<HTMLSpanElement>(0.12);

  /** The frame has finished opening and the caption may be read. */
  const [readable, setReadable] = useState(false);

  const launch = useLaunch();

  return (
    <Link
      href={`/work/${work.slug}`}
      className={`work-tile block ${
        stretch ? "lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col" : ""
      }`}
      /* The href stays real — middle-click, cmd-click, "open in new tab" and
         crawlers all still get a plain link. Only an ordinary left click is
         taken over, and only when there is a provider and a box to grow from.
         The frame is found through the event rather than held in a ref: its
         own ref belongs to `useInView`, and one element cannot carry two. */
      onClick={(e) => {
        if (!launch || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const frame = e.currentTarget.querySelector(".work-tile__frame");
        const rect = frame?.getBoundingClientRect();
        if (!rect || rect.width < 1) return;
        e.preventDefault();
        launch({ href: `/work/${work.slug}`, poster: work.poster, rect });
      }}
    >
      <>
        {/* The clip goes on the FRAME, not on something inside it: clipping
            only the picture leaves this box at full size the whole way, so
            what grows out of the corner is its grey ground and its shadow with
            a scrap of film in it. */}
        <m.span
          ref={frameRef}
          data-work-finale={finale ? "" : undefined}
          className={`work-tile__frame ${
            stretch ? "lg:aspect-auto lg:min-h-0 lg:flex-1" : ""
          }`}
          initial={{ clipPath: CORNERS[i % CORNERS.length] }}
          animate={{ clipPath: shown ? OPEN : CORNERS[i % CORNERS.length] }}
          transition={{ ...reveal, delay }}
          /* The caption is held until the frame has finished, so the type is
             never read through a half-open box. */
          onAnimationComplete={() => setReadable(true)}
        >
          {/* The film settles back as the frame opens, so it arrives moving
              rather than already still. */}
          <m.span
            className="absolute inset-0 block"
            initial={{ scale: 1.14 }}
            animate={{ scale: shown ? 1 : 1.14 }}
            transition={{
              ...reveal,
              duration: reveal.duration * 1.25,
              delay,
            }}
          >
            {/* Each card states its own width, or the feature would be served
                the same file as the pair beside it. */}
            <TileMedia
              poster={work.poster}
              video={work.video}
              sizes={
                sizes ??
                (feature
                  ? "(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 60vw"
                  : "(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 40vw")
              }
            />
          </m.span>
        </m.span>
      </>

      {/* Outside the frame's clip on purpose: if that reveal never runs, the
          index is still readable. */}
      <span className="mt-3 block shrink-0">
        <span className="flex items-baseline justify-between gap-4">
          <SplitText
            text={work.client}
            className="hp-tile-title text-h5"
            delay={delay + 0.3}
            play={readable}
          />
          <m.span
            className="label-xs shrink-0 text-off-white/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: readable ? 1 : 0 }}
            transition={{ ...reveal, delay: delay + 0.5 }}
          >
            {work.year}
          </m.span>
        </span>
        <SplitText
          text={work.title}
          className="hp-sub mt-1 block text-sm text-off-white/55"
          delay={delay + 0.42}
          play={readable}
          stagger={0.016}
        />
      </span>
    </Link>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import {
  m,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "motion/react";

/**
 * The index's controls: the filters, and the button that loads the next page.
 *
 * The filters float just above the foot of the window for the whole of the
 * grid. As the end of the grid comes up they hand over — the labels go out one
 * by one, the plate draws itself in and away, and the button it was standing in
 * front of arrives in its place.
 *
 * Two elements, not one. An earlier pass had a single plate that BECAME the
 * button by interpolating its width between the two; this is the version that
 * was asked for instead, and it is the better read: the plate withdraws rather
 * than transforming, so the button arrives as itself rather than as something
 * the filters turned into.
 *
 * The button is not sticky. It sits in the control's slot at the foot of the
 * grid — its own place — and it is only ever visible once the plate has
 * un-stuck and come to rest there, so it is never seen floating.
 *
 * Everything rides `morph`, a scroll position: reversible, and a reader who
 * stops half way is left looking at a real half-way state rather than at a
 * queued animation.
 */

/**
 * Each label's own fade, and the window their starts are spread over.
 *
 * The last label begins at `spread` (0.22) and is done by 0.48 — which is the
 * number `PLATE.from` has to clear. Spread over a fixed window rather than at a
 * fixed step, so adding the Film / Photo pair to the five categories tightens
 * the stagger instead of pushing the last label past the plate's exit.
 */
const LABEL = { each: 0.26, spread: 0.22 };

/**
 * The plate draws in and goes — and NOT UNTIL THE LABELS ARE OUT.
 *
 * This used to start at 0.34, while two of the five were still readable. A
 * `scale` on the plate scales its contents with it, so the box was collapsing
 * with type still inside it: the labels shrank and slid as they faded, and the
 * whole thing read as a control coming apart rather than standing down.
 *
 * The fix was order — but then it went too far the other way. At 0.50 against
 * a last label leaving at 0.48 there was no overlap, and none was needed, but
 * the plate then took a third of the run to fade while EMPTY: a bare bordered
 * box sitting at the foot of the window with nothing in it, which is its own
 * kind of broken. It now begins on the exact frame the last label clears, and
 * clears itself in a shorter run.
 */
const PLATE = { from: 0.48, to: 0.74 };

/**
 * The button arrives into the space the plate is leaving — overlapping it, not
 * waiting for it. Once the plate is empty there is nothing left to compete
 * with, and the overlap is what keeps the foot of the window from ever being
 * just an outline.
 */
const IN = { from: 0.56, to: 0.9 };
/**
 * Past this the button is the control: it takes the pointer, the filters do not.
 *
 * Just past `PLATE.to`, deliberately. It was 0.7, while the plate was still
 * 18% visible — so there was a stretch where the filters could be seen and not
 * pressed, which is the worst state a control can be in.
 */
const HANDOVER = 0.76;

/** Glyphs for the Film / Photo pair: a strip of film, and a camera. */
const KIND_ICON: Record<string, ReactNode> = {
  Film: (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="M5 2.5v11M11 2.5v11M2 6h3M2 10h3M11 6h3M11 10h3" />
    </svg>
  ),
  Photo: (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h1.6l1-1.5h3.8l1 1.5h1.6A1.5 1.5 0 0 1 14 5.5v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z" />
      <circle cx="8" cy="8.5" r="2.4" />
    </svg>
  ),
};

/**
 * One filter.
 *
 * Its own `useTransform` rather than one opacity for the row, because the
 * stagger is the whole character of the exit: five labels going together is a
 * layer being switched off, and five going in sequence is a control standing
 * down.
 */
function Option<T extends string>({
  value,
  active,
  order,
  morph,
  gone,
  onSelect,
  icon,
}: {
  value: T;
  active: boolean;
  /** Position among ALL the labels, 0 to 1 — where its fade starts. */
  order: number;
  morph: MotionValue<number>;
  gone: boolean;
  onSelect: (v: T) => void;
  /** Only the Film / Photo pair carries one — part of what sets it apart. */
  icon?: ReactNode;
}) {
  const from = order * LABEL.spread;
  const opacity = useTransform(morph, [from, from + LABEL.each], [1, 0]);
  const y = useTransform(morph, [from, from + LABEL.each], [0, -10]);

  return (
    <m.button
      type="button"
      aria-pressed={active}
      disabled={gone}
      tabIndex={gone ? -1 : undefined}
      onClick={() => onSelect(value)}
      className={icon ? "case-filter case-filter--kind" : "case-filter"}
      /* Read back by `::after` to reserve the bold width. */
      data-label={value}
      style={{ opacity, y }}
    >
      <span>
        {icon ? (
          <span className="case-filter__icon" aria-hidden>
            {icon}
          </span>
        ) : null}
        {value}
      </span>
    </m.button>
  );
}

export function WorkControl<T extends string, K extends string>({
  options,
  active,
  onSelect,
  kinds,
  activeKind,
  onKind,
  count,
  more,
  onMore,
  morph,
  fade,
}: {
  options: readonly T[];
  active: T;
  onSelect: (value: T) => void;
  /** The second group — Film / Photo — set off from the categories. */
  kinds: readonly K[];
  /** The live kind, or null when both are shown. */
  activeKind: K | null;
  onKind: (value: K) => void;
  /** Films the current filter matches — announced, not drawn. */
  count: number;
  /** How many films are left to load. Zero means there is no button. */
  more: number;
  onMore: () => void;
  /** 0 = filters, 1 = the button. Driven by the grid's bottom edge. */
  morph: MotionValue<number>;
  /** The closing transition taking the whole index away. */
  fade: MotionValue<number>;
}) {
  /**
   * Which control is live.
   *
   * State rather than a style, because this is the one thing here that is not
   * cosmetic: `aria-hidden` and `disabled` are either set or they are not, and
   * a screen reader must never be offered five filters that are half gone.
   */
  const [past, setPast] = useState(false);
  useMotionValueEvent(morph, "change", (v) => {
    const next = v >= HANDOVER;
    if (next !== past) setPast(next);
  });

  /**
   * Derived at render, not stored — and that matters.
   *
   * Storing `more > 0 && morph >= HANDOVER` in the callback above meant the
   * answer could only change when the SCROLL changed. Loading the last page
   * takes `more` to zero without moving the page, so the filters stayed
   * disabled with no button left to hand over to, and nothing short of another
   * scroll would free them. Reading `more` here cannot go stale.
   */
  const handed = past && more > 0;

  /** Every label in the plate, both groups — what the stagger is spread over. */
  const labels = Math.max(2, options.length + kinds.length);

  /* The plate withdraws: in, and out. Scale rather than width, so nothing
     relayouts and the whole exit is one composited transform. */
  const plateOpacity = useTransform(morph, [PLATE.from, PLATE.to], [1, 0]);
  const plateScale = useTransform(morph, [PLATE.from, PLATE.to], [1, 0.9]);

  const moreOpacity = useTransform(morph, [IN.from, IN.to], [0, 1]);
  const moreScale = useTransform(morph, [IN.from, IN.to], [0.92, 1]);

  /**
   * Opacity is not a hit-test.
   *
   * Two things follow from that, and the second was a real bug. The closing
   * transition fades this whole control long before it is off screen, so it
   * has to stop taking the pointer as it goes — that is the `fade` test.
   *
   * And the two controls share one grid cell, with the button painted over the
   * plate. At zero opacity the button was still hit-testable, and a `disabled`
   * button does not pass clicks through to what is underneath it: an invisible
   * 150px box sat across the middle of the filter row and swallowed every press
   * on the two filters behind it. The edge ones worked, the middle ones were
   * dead. Whichever control is not live now takes no pointer at all.
   */
  const platePointer = useTransform(fade, (v) =>
    v < 0.04 || handed ? "none" : "auto",
  );
  const morePointer = useTransform(fade, (v) =>
    v < 0.04 || !handed ? "none" : "auto",
  );

  return (
    <div className="work-control">
      <m.div className="work-control__stack" style={{ opacity: fade }}>
        {/* Two plates, side by side, that stand down as one: the categories,
            and Film / Photo in a box of its own to their right. */}
        <m.div
          className="work-control__plates"
          style={{
            opacity: plateOpacity,
            scale: plateScale,
            pointerEvents: platePointer,
          }}
          aria-hidden={handed}
        >
          {/* Client-side filtering that does not touch the URL, so these are
              buttons in a group with `aria-pressed` — not links, and not a
              tablist, since there are no panels to own. */}
          <div className="work-control__plate">
            <div
              role="group"
              aria-label="Filter work by category"
              className="case-filters no-scrollbar"
            >
              {options.map((f, i) => (
                <Option
                  key={f}
                  value={f}
                  active={f === active}
                  order={i / (labels - 1)}
                  morph={morph}
                  gone={handed}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>

          {/* Film / Photo — a different question from the categories, so it
              is a different control: its own plate, an icon per option, and
              an outlined live state where the categories use a solid one. No
              "All" of its own — neither pressed means both are shown, and
              pressing the live one again lets it go. */}
          <div className="work-control__plate">
            <div
              role="group"
              aria-label="Filter work by type"
              className="case-filters"
            >
              {kinds.map((k, i) => (
                <Option
                  key={k}
                  value={k}
                  active={k === activeKind}
                  order={(options.length + i) / (labels - 1)}
                  morph={morph}
                  gone={handed}
                  onSelect={onKind}
                  icon={KIND_ICON[k]}
                />
              ))}
            </div>
          </div>
        </m.div>

        {more > 0 ? (
          /* Absolutely placed over the plate's own centre, so the two share a
             point: the plate draws in towards it and the button opens out of
             it. In flow it would sit below, and the hand-over would read as a
             jump down the page rather than as one control replacing another. */
          <m.div
            className="work-control__more-slot"
            style={{
              opacity: moreOpacity,
              scale: moreScale,
              pointerEvents: morePointer,
            }}
            aria-hidden={!handed}
          >
            <button
              type="button"
              className="work-control__more"
              disabled={!handed}
              tabIndex={handed ? undefined : -1}
              onClick={onMore}
            >
              <span className="header-cta__label">
                <span className="header-cta__roll" data-text="See more">
                  <span>See more</span>
                </span>
              </span>
            </button>
          </m.div>
        ) : null}
      </m.div>

      {/* The grid relays itself silently when a filter changes — nothing a
          screen reader would notice. This says what happened. Counted off the
          FILTERED set rather than the paged one: "See more" is about how much
          of the answer is on screen, not about what the answer is. */}
      <p role="status" aria-live="polite" className="visually-hidden">
        Showing {count} {count === 1 ? "project" : "projects"}
      </p>
    </div>
  );
}

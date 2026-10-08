"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  animate,
  AnimatePresence,
  m,
  useMotionValue,
  useTransform,
} from "motion/react";
import {
  CATEGORIES,
  KINDS,
  REEL_CLIPS,
  oneWorkPerClip,
  type Category,
  type Kind,
  type Work,
} from "@/lib/works";
import { LazyStage3D } from "@/components/lazy-stage-3d";
import { PatternGrid } from "@/components/pattern-grid";
import { StudioGlow } from "@/components/studio-glow";
import { SplitText } from "@/components/split-text";
import { SiteFooter } from "@/components/site-footer";
import { WorkCta } from "@/components/work-cta";
import { WorkFinale } from "@/components/work-finale";
import { useLaunch } from "@/components/launch";
import { WorkControl } from "@/components/work-control";
import { useInView } from "@/components/use-in-view";

type Filter = Category | "All";

const FILTERS: Filter[] = ["All", ...CATEGORIES];

/**
 * The reel is for a taste, not for working through thirty-one projects one at
 * a time: once you have seen it, you either want a particular film or you want
 * to see what else there is. The page decides that for you rather than leaving
 * a control to find, which is why there is no zoom button any more.
 *
 * Counted against the reel's own LENGTH rather than a fixed number. It was
 * hard-coded to 5 back when the reel held exactly five clips; adding a sixth
 * left that clip unreachable, because the page opened out on the fifth
 * distinct film and the reader never got round to it. Tied to the list, a clip
 * added to `REEL_CLIPS` is always a clip that can actually be seen.
 */
const autoOpenAfter = (reelLength: number) => Math.max(1, reelLength);

/** One timing for the whole reel ⇄ index change, so the two halves agree. */
const SWAP = { duration: 0.75, ease: [0.19, 1, 0.22, 1] } as const;

/**
 * Upward travel, in pixels, that takes the index all the way back to the reel.
 *
 * Read as a DISTANCE, not as a threshold: the index moves continuously over
 * this span and is committed only at the end of it, so there is no point in the
 * gesture at which nothing is happening. Ninety is under one wheel notch
 * (100–120px), which is the point — a single notch returns, and a trackpad or a
 * finger gets proportional travel on the way.
 */
const RETURN = 90;

/**
 * How close to the top of the page counts as the top.
 *
 * Not zero, and this is the whole bug it replaces. The gate here used to be
 * `scrollY <= 0` combined with a 140ms quiet period before an upward gesture
 * was allowed to count at all. Under Lenis — `lerp: 0.1` — a flick takes the
 * better part of a second to converge on zero, and every frame of that
 * deceleration reset the quiet timer. So a reader who reached the top and kept
 * scrolling up got nothing: they had to come to a complete stop, wait, and then
 * make a fresh gesture. That is the "I have to scroll up several times" and the
 * "it feels stuck", and the fix is not a smaller threshold — it is no gate.
 *
 * A couple of pixels of tolerance is all that is left, for the sub-pixel
 * position a smoothed scroll actually rests at.
 */
const TOP_EDGE = 2;

/** Input stops short of a full pull → the index settles back where it was. */
const SETTLE = 180;

/**
 * When the closing transition runs, measured off the LAST FILM ON SCREEN.
 *
 * One marker, and that matters more than it looks. There used to be two: the
 * film the transition takes to fullscreen, and a separate element the timing
 * was read from. They agreed only while the index was showing everything it
 * had — the moment a "See more" button existed, the timing came off the BUTTON
 * while the picture came off a card already gone past the top of the screen, so
 * the window opened from a box that was no longer on it.
 *
 * Now both are `[data-work-finale]`, which `PatternGrid` puts on the last card
 * it actually lays. Whatever that card is — the twelfth, the twentieth, the
 * thirty-sixth — is what the page closes on. Nothing here counts films, knows
 * how many there are in total, or cares whether the reader pressed the button.
 *
 * The mark the card's top edge has to reach is the HEADER'S OWN BOTTOM EDGE,
 * measured, not a fraction of the window.
 *
 * This has been both things now. It was 0.12 of the window — near enough to the
 * header on a laptop — then 0.38, which put the start where the reader first
 * arrives at the end of the list. 0.38 turns out to be too eager: the card
 * begins growing while it is still sitting in the middle of the screen being
 * looked at as a card.
 *
 * Back to the header, then, but properly. A fraction only lines up with the
 * header at one window height: `--hp-header-h` clamps between 4rem and 5.5rem
 * while the viewport does not, so 0.12 is 72px on a short screen where the
 * header is still 88 — the card would already be behind the bar before anything
 * started — and 144px on a tall one, well clear of it. Reading the header's own
 * box makes "when it reaches the header" true at every size.
 *
 * Cached and re-read on resize rather than per scroll pass: it is a
 * `getComputedStyle`-class measurement and nothing about it changes while the
 * reader is scrolling.
 */
const ENTRY = { tail: 1.0, cap: 0.75, hold: 1.85, lead: 0.1 };

/**
 * `lead` — HOW FAR BEFORE THE HEADER THE ZOOM STARTS. See `AboutClosing`,
 * which documents this and carries the same tenth of a screen.
 *
 * The card used to climb the whole way, arrive at the header, and only then
 * begin to open — a stop and a restart where there should be one gesture. With
 * the lead the climb and the zoom overlap. Spent against `travel` too, so the
 * run starts earlier and still ends where it did.
 */

/**
 * The same run, when there is no card to measure at all.
 *
 * Off the closing section's own box: from one and a fifth screens above the
 * window to two thirds of a screen past it.
 */
const FALL = { from: 1.2, hold: 1.85 };

/**
 * Blank page between the foot of the index and the closing section.
 *
 * `hold` cannot simply keep growing: the run has to finish before the footer's
 * ground starts to rise, and every pixel added to it came straight out of that
 * margin, which was down to about one wheel notch.
 *
 * This buys the margin back. It is scroll distance and nothing else — and it
 * costs nothing to look at, because by the time the reader is crossing it the
 * closing film already fills the screen. They are looking at the fullscreen
 * picture and the lockup assembling on it; what is behind that layer is not
 * visible at all.
 *
 * A full screen of it now. That is what a `hold` of 1.85 costs, and the whole
 * closing sequence runs to about two and a half screens of scroll — which is
 * the point: it is the one part of this page that is meant to be dwelt in.
 */
const RUNWAY = "100svh";

/** Films the index shows at a time, and adds on each "See more". */
const PAGE = 12;

/**
 * How the filters turn into "See more".
 *
 * `range` is the scroll the turn is spread over, in viewports — long enough
 * that no single frame of it looks like a change of state.
 *
 * `late` pushes the whole thing further down the page, and it exists so that
 * the start can move without the turn getting shorter. Shortening `range`
 * alone would delay the start, but only by taking the same distance off the
 * turn — and the turn being unhurried is the point of it. Together these two
 * move the first frame of the fade about 200px later while the run itself
 * keeps four fifths of its length.
 *
 * `late` is now at its practical ceiling, and that ceiling is worth writing
 * down because it is what bounds the whole thing. The turn cannot run on past
 * the point where the CLOSING transition starts taking this control off the
 * screen — measured, that is 131px after the control comes to rest. So the end
 * is pinned, and the only way to make the turn longer is to start it earlier.
 *
 * So `range` is back down to 0.44 with `late` still at that ceiling: the first
 * frame of the fade now lands about 260px before the control comes to rest,
 * which is inside the last row rather than a row and a half early.
 *
 * It was briefly 0.73, which bought a longer turn at the price of starting
 * while there were still two films to look at — and the complaint that came
 * back was not that the turn was quick but that it looked WRONG that early.
 * That turned out to be a different problem, fixed where it belonged: the
 * plate was collapsing while labels were still inside it. See `PLATE` in
 * WorkControl. With the order right, a shorter turn no longer reads as a
 * hurried one.
 *
 * `gap` is how far above the foot of the window the plate floats, and it has
 * to agree with `bottom` in `.work-control` or the turn finishes early or late.
 * `lead` is zero because the control's box begins exactly where the grid ends.
 */
const MORPH = { range: 0.5, late: 0.147, lead: 0, gap: 24 };

export function WorkCarousel({ works }: { works: Work[] }) {
  const router = useRouter();
  const launch = useLaunch();
  const [filter, setFilter] = useState<Filter>("All");
  /** Film / Photo — null shows both. Combines with the category. */
  const [kind, setKind] = useState<Kind | null>(null);
  const [index, setIndex] = useState(0);
  /** Zoomed out = the overview grid; zoomed in = the 3D carousel. */
  const [zoomedOut, setZoomedOut] = useState(false);

  /* The category alone — what the reel draws from. The reel is films only, so
     the Film / Photo choice has nothing to say to it, and applying it there
     would leave the reel empty the moment "Photo" was pressed. */
  const inCategory = useMemo(
    () =>
      filter === "All" ? works : works.filter((w) => w.category === filter),
    [works, filter],
  );

  const visible = useMemo(
    () => (kind ? inCategory.filter((w) => w.kind === kind) : inCategory),
    [inCategory, kind],
  );

  /**
   * What the REEL shows — deliberately not the whole index.
   *
   * One project per clip, in `REEL_CLIPS` order, so the reel never plays the
   * same shot twice and never puts a vertical cut on a 16:9 plane. See
   * `REEL_CLIPS` for how that order was arrived at.
   */
  const reel = useMemo(() => {
    const first = new Map<string, Work>();
    for (const work of inCategory) {
      /* Films only: the reel's cards are moving pictures on a 3D arc. */
      if (work.video && !first.has(work.video)) first.set(work.video, work);
    }

    const picked = REEL_CLIPS.map((clip) => first.get(clip)).filter(
      (work) => work !== undefined,
    );

    /* A narrow filter can leave none of the chosen clips represented. Falling
       back to one-per-clip keeps the reel populated, still without repeats. */
    return picked.length > 0 ? picked : [...first.values()];
  }, [inCategory]);

  /* The index shows each clip once too — with eleven stand-ins across
     thirty-one projects, anything else repeats footage card after card. */
  const shown = useMemo(() => oneWorkPerClip(visible), [visible]);

  /**
   * How many pages of the index are on screen.
   *
   * Counted in PAGES rather than in films so that the reset on a filter change
   * is a single assignment, and so the button can never ask for a partial one.
   */
  const [pages, setPages] = useState(1);
  const paged = useMemo(() => shown.slice(0, pages * PAGE), [shown, pages]);
  const more = shown.length - paged.length;

  /* The film the page closes on. It is the last card the index is showing, so
     it changes with the filter and with every "See more". */
  const last = paged.at(-1);

  /* Read inside the scroll pass, so the turn knows there is nothing left to
     load without the listener being torn down and rebuilt on every page. */
  const moreRef = useRef(more);
  useEffect(() => {
    moreRef.current = more;
  }, [more]);

  const active = reel[Math.min(index, reel.length - 1)];

  /**
   * The index grows the page; the reel fits it. Which of the two is up decides
   * whether this page behaves like a stage or like a document.
   */
  const flows = zoomedOut;

  /* A ref rather than the value itself keeps the callbacks below stable across
     filter changes — Stage3D rebuilds its whole scene when its props change,
     and a new callback each render would be a needless extra teardown. It
     holds the REEL, because that is the list the stage indexes into. */
  const reelRef = useRef(reel);

  useEffect(() => {
    reelRef.current = reel;
  }, [reel]);

  /**
   * The bar hangs under the header, and neither of them ever moves.
   *
   * Two pieces of machinery lived here and are both gone: a scroll listener
   * mirroring the header's hide-on-scroll rule so the two would not collide,
   * and an IntersectionObserver that told the bar when it had reached the top
   * so it could put a panel behind itself. The header turns out to be plain
   * `position: fixed` on the live site with no hidden state at all, so there
   * is no collision to choreograph and nothing for the bar to dodge.
   */

  /**
   * Counted by SLUG, not by how many times the centred card changed: scrubbing
   * back and forth over the same three films is not six films seen, and
   * counting events would tip the page over while the reader was still on the
   * first one.
   */
  const seenRef = useRef(new Set<string>());

  /**
   * The reel does not cut to the index; it withdraws into it.
   *
   * `receding` is the beat in between — the stage is still mounted and still
   * rendering while its camera backs off the arc, and only when that finishes
   * does `zoomedOut` flip and the grid deal its cards in.
   */
  const [receding, setReceding] = useState(false);
  /**
   * The footer's film, driven from here rather than from inside the footer.
   *
   * The work section has to fade on the SAME value the footer arrives on, and
   * two readings of the same element would be two sources of truth that drift
   * by a frame. One progress, shared.
   *
   * A callback ref, not `useRef` — and this is the whole bug.
   *
   * The film lives inside `AnimatePresence` with `mode="wait"`, so it is not
   * mounted in the commit where `zoomedOut` flips: the reel has to finish
   * leaving first. Any effect keyed on `zoomedOut` therefore ran while
   * `ref.current` was still null, returned early, and never attached anything.
   * Nothing ever moved the progress, so every scrubbed part of the footer sat
   * at zero for ever — which is what an entire footer of invisible elements,
   * and then two static sections, were both symptoms of.
   *
   * A callback ref re-renders when the node actually arrives, so the effect
   * below runs with an element in hand.
   */
  /**
   * FOUR screens' warning, so the closing film has buffered by the time it is
   * asked for. Two was cutting it fine on a large clip, and a clip that is not
   * ready is a clip the reader does not get. `useInView` brings its trigger forward by a fraction
   * of the window, and a negative fraction pushes it back out past the fold —
   * which is the only way to be told about something before it arrives.
   */
  /* Only the ref is wanted now. The flag it used to return existed to mount the
     closing film four screens early; `LazyVideo` does that for itself, from the
     element's own position, which is both earlier and not this component's
     business. */
  const [tailRef] = useInView<HTMLDivElement>(-3);

  const [filmEl, setFilmEl] = useState<HTMLDivElement | null>(null);
  const film = useMotionValue(0);
  /**
   * The TRANSITION out of the work and into the closing lockup.
   *
   * `film` is clamped at zero until the closing section is fully pinned, so
   * anything keyed to it only begins once that section already fills the
   * screen. This one runs over the two screens BEFORE that: zero when the
   * section's top edge is still two viewports down — which is as the last two
   * films come into view — and one when it reaches the top of the window.
   *
   * Two viewports rather than one on purpose. The brief asks for the change to
   * begin "as the last two videos enter the viewport", and those sit in the
   * closing pair row immediately above this element; a single viewport of
   * travel started the blur only once they had already gone by.
   *
   * The lockup, the blur and the wash ride this; the parting and the whole
   * footer still ride `film`.
   */
  const entry = useMotionValue(0);

  /**
   * How far the index has been pulled back towards the reel, 0–1.
   *
   * Scrubbed by the gesture below. Everything it drives is ordinary transform
   * and opacity, so the reader sees the page answer the very first pixel of an
   * upward scroll — which is the difference between a transition that is
   * reversible and one that merely can be reversed.
   */
  const pull = useMotionValue(0);

  /**
   * Filters → "See more", 0 to 1.
   *
   * Measured off the GRID's bottom edge rather than off the control's own box.
   * The control is `position: sticky`, so while it is floating its rect is the
   * held one and reports the same numbers every frame — there is no progress in
   * it to read. The grid's foot rises steadily the whole way down, which is
   * exactly the signal the turn wants.
   */
  const morph = useMotionValue(0);

  /**
   * Measured here rather than with `useScroll({ target })`.
   *
   * A plain scroll listener reading the element's own box is the same
   * arithmetic, in the open — and window scroll listeners are known to work on
   * this page, since the header and the pull-back gesture both run on one.
   *
   * `-top / (height - viewport)` is exactly `["start start", "end end"]`: zero
   * when the film's top edge reaches the top of the window, one when its bottom
   * edge reaches the bottom.
   */
  useEffect(() => {
    if (!filmEl) return;

    /** The header's own height — the boundary the transition is timed off. */
    let headerH = 0;
    const measureHeader = () => {
      const bar = document.querySelector<HTMLElement>(".site-header__inner");
      /* A tenth of the window if the header is somehow not there, which is
         roughly where it would have been anyway. */
      headerH = bar?.getBoundingClientRect().height || window.innerHeight * 0.1;
    };
    measureHeader();

    const update = () => {
      /**
       * Looked up per pass, not captured once.
       *
       * This is what keeps the trigger on whichever card is currently last.
       * "See more" lays eight more films and the marker moves with them; a
       * filter change rebuilds the index and it moves again. A reference held
       * from a previous render would be pointing at a DETACHED node — and a
       * detached node reports every rect value as zero, which computes to a
       * progress of exactly 1, which is the whole page slamming to full blur on
       * the first scroll after a filter change. That actually happened.
       *
       * One selector lookup per scroll event, and it cannot go stale.
       */
      const card = document.querySelector<HTMLElement>("[data-work-finale]");

      const box = filmEl.getBoundingClientRect();
      const view = window.innerHeight;

      /**
       * Nothing to turn into when the index is complete — the control simply
       * comes to rest at the foot of the grid as the filters. Held at 0 rather
       * than left stale so that pressing "See more" on the last partial page
       * reverses the turn instead of freezing it half done.
       */
      const grid = document.getElementById("work-index");
      const control = document.querySelector<HTMLElement>(".work-control");
      const gr = grid?.getBoundingClientRect();

      if (gr && control && moreRef.current > 0) {
        const rest = view - MORPH.gap - control.offsetHeight;
        const natural = gr.bottom + MORPH.lead;
        const span = MORPH.range * view;
        const late = MORPH.late * view;
        morph.set(
          Math.min(1, Math.max(0, (rest + span - late - natural) / span)),
        );
      } else {
        morph.set(0);
      }

      const span = box.height - view;
      if (span > 0) film.set(Math.min(1, Math.max(0, -box.top / span)));

      /**
       * Zero until the last card's top edge reaches the bottom of the header,
       * then up through its own height and on for four fifths of a screen
       * more.
       *
       * Falling back to the closing section's own box when there is no card at
       * all — an empty filter — so the page still has a bottom.
       */
      /* The header, plus the lead — see `ENTRY.lead`. */
      const mark = headerH + view * ENTRY.lead;
      const row = card?.getBoundingClientRect();

      /* A height of zero means the card is gone or not laid out yet — there is
         nothing to measure against, so fall back rather than divide by a
         number that happens to produce 1. */
      if (row && row.height > 0) {
        const travel =
          mark +
          Math.min(row.height, view * ENTRY.cap) * ENTRY.tail +
          view * ENTRY.hold;
        entry.set(Math.min(1, Math.max(0, (mark - row.top) / travel)));
      } else {
        const travel = view * (FALL.from + FALL.hold);
        entry.set(
          Math.min(1, Math.max(0, (view * FALL.from - box.top) / travel)),
        );
      }
    };

    update();
    const onResize = () => {
      measureHeader();
      update();
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", onResize);
    };
    /* `paged` in the deps: a filter change relays the whole index out from
       under these measurements — and so does "See more" — so the values have
       to be taken again against the new layout rather than left describing the
       old one. */
  }, [filmEl, film, entry, morph, paged]);

  /* The work goes out beneath the footer rather than sliding away, on exactly
     the stretch the footer's own ground rises over it — `night`, 0.233 → 0.451
     in the source's `FOOTER_MOTION`. */
  const workOpacity = useTransform(film, [0.233, 0.451], [1, 0]);

  /**
   * The work recedes: out of focus, out of colour, out of light.
   *
   * One `filter` string rather than four properties, because the browser
   * composites a single filter chain in one pass. It goes on the grid itself —
   * which is pinned and therefore STATIC by this point — so it re-rasterises
   * only when the value changes. A fixed `backdrop-filter` pane over the top
   * would instead re-sample the whole viewport on every scroll frame, which is
   * the one thing the brief's performance requirement rules out.
   */
  /**
   * The work stops taking the pointer the moment it starts to recede.
   *
   * It is `sticky bottom-0`, so it is still covering the window — behind the
   * closing lockup — for the whole transition. Blurred cards are decoration by
   * then, and an interactive surface sitting under the lockup is exactly the
   * kind of thing that swallows a hover meant for the link on top of it.
   *
   * Derived straight from the scroll, not held in state, so it reverses with
   * everything else.
   */
  const workPointer = useTransform(entry, (v) => (v > 0.02 ? "none" : "auto"));

  /* Front-loaded now. The film covers the whole window by 0.44, so anything
     this does after that is work the compositor puts into a picture nobody can
     see. The recede has to be over by the time it is hidden, not by the time
     the lockup is finished. */
  const workFilter = useTransform(
    entry,
    [0.02, 0.35, 0.66],
    [
      "blur(0px) brightness(1) saturate(1) contrast(1)",
      "blur(8px) brightness(0.88) saturate(0.84) contrast(0.95)",
      "blur(20px) brightness(0.7) saturate(0.6) contrast(0.88)",
    ],
  );

  /**
   * The filters belong to the films, and go the moment the films do.
   *
   * On `entry` rather than on `film`. `film` is still zero for the whole of the
   * closing run — it only starts once the lockup pins — so the bar used to sit
   * over the transition from the first frame of it to the last.
   *
   * And it clears EARLY: gone by 0.12, where the film has barely begun to open.
   * The control sits at the foot of the window and the closing film grows out
   * over it, so anything still visible there ends up printed across the
   * picture. There is nothing left to filter by then either.
   */
  const filterOpacity = useTransform(entry, [0.02, 0.12], [1, 0]);

  /**
   * And it stops taking the pointer as it goes.
   *
   * The block is a full-width box pinned across the top of the window. At zero
   * opacity it is still there and still hit-testable, so once the closing
   * transition had faded it out there was an invisible band across the top of
   * the screen swallowing clicks. Opacity is not a hit-test.
   */
  /* The index gives way to the reel: down and back, never away sideways — it
     is going to where the reel already is. Small numbers on purpose; this is
     feedback on a gesture in progress, not the transition itself. */
  const pullY = useTransform(pull, [0, 1], [0, 26]);
  const pullFade = useTransform(pull, [0, 1], [1, 0.72]);
  const pullScale = useTransform(pull, [0, 1], [1, 0.988]);

  const barOpacity = useTransform(
    [filterOpacity, pullFade],
    ([f, p]: number[]) => f * p,
  );
  const indexOpacity = useTransform(
    [workOpacity, pullFade],
    ([w, p]: number[]) => w * p,
  );

  /**
   * The lockup's stretch of the closing run, remapped to its own 0–1.
   *
   * The letters begin at 0.57, where the window is already 95% of the way to
   * filling the screen — so they arrive WITH the end of the push rather than
   * after a pause, which is what makes the zoom, the focus pull and the type
   * read as one move instead of three phases queueing up.
   *
   * Remapped rather than re-ranged inside the lockup so that its own stagger
   * arithmetic — which is tuned against a full 0–1 and clamps against it — is
   * left alone.
   */
  const reveal = useTransform(entry, [0.57, 1], [0, 1]);

  /**
   * Tell the header which chapter this page is in.
   *
   * The header decides the menu's shape from scroll position — under a third of
   * a screen it drops from the trigger, past that it runs sideways. That works
   * on the homepage, whose hero is a stretch of scroll. It does not work here:
   * the reel does not scroll at all, and the top of the index is scroll zero, so
   * the row shape was unreachable on the one page it was ported for.
   *
   * The reel IS this page's hero and the index is what follows it, so the state
   * says so directly. On `<html>` rather than through a prop because the header
   * lives in the root layout — the same channel the repo uses for
   * `data-menu-below`.
   */
  useEffect(() => {
    const root = document.documentElement;
    if (zoomedOut) root.dataset.workIndex = "";
    else delete root.dataset.workIndex;
    return () => {
      delete root.dataset.workIndex;
    };
  }, [zoomedOut]);

  /** What every filter change does besides setting the filter. */
  const refilter = () => {
    setIndex(0);
    /* A new filter is a new index; showing page four of the old one makes no
       sense. */
    setPages(1);

    /* Back to the top of the index. A narrower filter makes the page
       dramatically shorter, and holding the old scroll position leaves the
       reader somewhere past the end of the new one — looking at the closing
       transition instead of at the work they just asked for. */
    const top = document.getElementById("work-index");
    top?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  const handleReceded = useCallback(() => {
    setReceding(false);
    setZoomedOut(true);
  }, []);

  const handleActive = useCallback((next: number) => {
    setIndex(next);

    const work = reelRef.current[next];
    if (!work) return;

    seenRef.current.add(work.slug);
    if (seenRef.current.size >= autoOpenAfter(reelRef.current.length))
      setReceding(true);
  }, []);

  const handleOpen = useCallback(
    (next: number) => {
      const work = reelRef.current[next];
      if (!work) return;

      /* No rect to hand over: the card that was clicked is a plane in a WebGL
         scene, not an element. `launch` synthesises a centred box of a card's
         proportions for exactly this case, so the reel opens a film with the
         same move the grid does — from roughly where the reader was looking. */
      if (launch) launch({ href: `/work/${work.slug}`, poster: work.poster });
      else router.push(`/work/${work.slug}`);
    },
    [router, launch],
  );

  /**
   * The index and the reel are one continuous move, scrubbed by the reader.
   *
   * `pull` is that move: 0 is the index as it stands, 1 is the reel. It is
   * driven straight off the gesture — upward travel at the top of the page adds
   * to it, downward travel takes it back — so it is proportional, interruptible
   * and reversible at every point, and the first notch of an upward scroll
   * moves it. There is no threshold to cross before anything responds, no
   * direction lock, no "is animating" flag, and no arming.
   *
   * What it replaces is the reason this felt trapped: an invisible accumulator
   * behind a gate that could not open until the smoothed scroll had fully come
   * to rest. See `TOP_EDGE`.
   *
   * It also stays out of the way of the page's own scrolling: the gesture is
   * only read once there is no page left to scroll, which is why nothing here
   * touches `preventDefault` and why the wheel listener can stay passive. The
   * reel's canvas has its own wheel handler for spinning the arc, but the two
   * never exist at the same time — this effect is not attached while the reel
   * is up.
   */
  useEffect(() => {
    if (!zoomedOut) return;

    /* The index arrives neutral, whatever state the last pull left behind. */
    pull.set(0);

    let idle = 0;
    let touchY = 0;

    const atTop = () => window.scrollY <= TOP_EDGE;

    /* Abandoned part-way — ease it back rather than leaving the page sitting
       at some fraction of a gesture nobody finished. */
    const settle = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        if (pull.get() > 0) animate(pull, 0, SWAP);
      }, SETTLE);
    };

    const advance = (up: number) => {
      const at = pull.get();

      /* Downward input gives the index straight back, from wherever the pull
         has got to — including mid-gesture. This is the half that makes it
         genuinely reversible rather than merely cancellable. */
      if (up < 0) {
        if (at <= 0) return;
        window.clearTimeout(idle);
        pull.set(Math.max(0, at + up / RETURN));
        settle();
        return;
      }

      if (up === 0 || !atTop()) return;

      const next = at + up / RETURN;
      if (next < 1) {
        window.clearTimeout(idle);
        pull.set(next);
        settle();
        return;
      }

      /* Committed. The pull is eased out over the same beat the swap runs on,
         so the index carries on the way it was already going instead of
         snapping back to neutral as it leaves. */
      window.clearTimeout(idle);
      animate(pull, 0, SWAP);
      seenRef.current.clear();
      setZoomedOut(false);
    };

    const onWheel = (e: WheelEvent) => advance(-e.deltaY);
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      advance(y - touchY);
      touchY = y;
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.clearTimeout(idle);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [zoomedOut, pull]);

  return (
    /* `overflow-hidden` is right for the stage — the arc's outer cards have to
       be clipped — but it would also cut a page-length index off at one screen.
       `clip` on the x axis alone contains the arc without becoming a scroll
       container in y. */
    <div
      className={`relative flex min-h-dvh flex-col ${
        flows ? "overflow-x-clip" : "overflow-hidden"
      }`}
    >
      <StudioGlow />

      {/* Clearance for the fixed header, in both states. The index used to get
          this from the filter block, which reserved the header's band inside
          its own padding — but the filters have moved to the foot of the grid,
          so there is nothing up there to hold the space any more. */}
      <div aria-hidden className="h-[var(--hp-header-h)] shrink-0" />

      {/* The reel is a stage: one screen, and the canvas fills it absolutely.
          The patterned index is a document — it is taller than a screen and has
          to grow the page. Trapping it in the stage's box is what left it with
          an inner scrollport showing two cards and no way down. */}
      <div className={flows ? "relative" : "relative min-h-0 flex-1"}>
        {/* `mode="wait"` so the reel has finished leaving before the index
            arrives: crossfading a WebGL canvas against a grid of films reads
            as a glitch, one handing over to the other reads as a move.
            The reel pulls toward the viewer as it goes and the index rises to
            meet it, which gives the swap a direction. */}
        <AnimatePresence mode="wait" initial={false}>
          {visible.length === 0 ? null : zoomedOut ? (
            <m.div
              key="index"
              className="relative"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={SWAP}
            >
              {/* The tail space belongs to the GRID, not to this wrapper.
                  On the wrapper it sat below the footer as well, which left a
                  band of empty page under the very bottom of the site. */}
              {/* The footer's "Back to top" aims here — the top of the work
                  in its grid form, not the page origin, which would land the
                  reader back in the carousel they already scrolled out of. */}
              {/* `sticky bottom-0` holds the last screenful of work in place
                  while the lockup settles over it, so the films are still
                  there to be blurred rather than already scrolled away. */}
              {/* Before the index, not after it: the dock is pinned to the top
                  of the scroller from the index's first pixel, and its z-index
                  has to sit between the work below it and the lockup above.
                  Both of those are settled by being siblings here. */}
              <div className="work__finale-dock">
                {last ? (
                  <WorkFinale work={last} entry={entry} progress={film} />
                ) : null}
              </div>

              {/* The sticky control's containing block, and it has to be this
                  and nothing larger: a `sticky` box travels only as far as its
                  containing block allows, and if that were the index branch it
                  would go on floating over the closing lockup and the whole
                  footer. Bounded to the grid, it stops exactly where the grid
                  stops — which is where it is meant to land. */}
              <div className="work-index-wrap">
                <m.div
                  id="work-index"
                  className="sticky bottom-0"
                  style={{
                    pointerEvents: workPointer,
                    opacity: indexOpacity,
                    filter: workFilter,
                    y: pullY,
                    scale: pullScale,
                    willChange: "filter",
                  }}
                >
                  <PatternGrid
                    works={paged}
                    complete={more === 0}
                    className="pt-2 pb-16 lg:pt-3"
                  />
                </m.div>

                <WorkControl
                  options={FILTERS}
                  active={filter}
                  onSelect={(f) => {
                    setFilter(f);
                    refilter();
                  }}
                  kinds={KINDS}
                  activeKind={kind}
                  onKind={(k) => {
                    /* Pressing the live one again lets it go — see WorkControl. */
                    setKind((now) => (now === k ? null : k));
                    refilter();
                  }}
                  count={shown.length}
                  more={more}
                  onMore={() => setPages((n) => n + 1)}
                  morph={morph}
                  fade={barOpacity}
                />
              </div>

              {/* Inside the index branch on purpose. The reel is a stage that
                  fits one screen and does not scroll, so a footer under it
                  would either be unreachable or would turn the stage into a
                  document. It belongs to the index, which is the only state
                  this page has that actually has a bottom.

                  The wrapper is what the scroll listener measures, and it
                  holds BOTH:
                  the call to action parts on the first quarter of the same beat
                  the footer arrives on, which is what `FOOTER_MOTION.part` was
                  always for. One progress, one piece of choreography. */}
              {/* See `RUNWAY` — scroll distance for the push to be slow in,
                  hidden behind the fullscreen film that is crossing it. */}
              <div aria-hidden style={{ height: RUNWAY }} />

              <div ref={tailRef} aria-hidden className="h-px" />

              <div ref={setFilmEl}>
                <WorkCta progress={film} reveal={reveal} />
                <SiteFooter progress={film} />
              </div>
            </m.div>
          ) : (
            <m.div
              key="reel"
              /* Taken out of the pointer's reach the moment it starts to
                 withdraw: a drag or a wheel landing on a stage that is already
                 leaving would spin an arc the reader can no longer aim at. */
              className={`absolute inset-0 ${receding ? "pointer-events-none" : ""}`}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              /* Barely anything left to do — the stage has already faded
                 itself out in WebGL by the time this runs. A long exit here
                 would just hold a blank canvas in front of the index. */
              exit={{ opacity: 0 }}
              transition={SWAP}
            >
              <LazyStage3D
                works={reel}
                onActive={handleActive}
                onOpen={handleOpen}
                initialIndex={index}
                receding={receding}
                onReceded={handleReceded}
              />
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nothing stands in for the caption once the index is up — the films
          name themselves there. */}
      <AnimatePresence initial={false}>
        {zoomedOut || receding ? null : (
          <m.div
            key="caption"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SWAP}
          >
            <Caption work={active} />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------- caption --- */

function Caption({ work }: { work?: Work }) {
  const launch = useLaunch();

  return (
    <div className="work-caption relative z-10 shrink-0 px-gutter pt-2 pb-6 text-center sm:pb-8">
      {/* No `initial={false}` here, unlike the reel ⇄ index swap below. That
          flag suppresses the entrance of whatever is present on the FIRST
          render — which is exactly the lockup the reader sees on load, so the
          eyebrow, the name and the sub-line all simply appeared. */}
      {/* No `mode="wait"`: that makes the outgoing caption finish before the
          incoming one may start, which on its own put the type almost half a
          second behind the film. They cross over instead — the exiting one is
          taken out of the flow so the two never push each other around. */}
      <AnimatePresence mode="popLayout">
        {work ? (
          <m.div
            key={work.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.19, 1, 0.22, 1] }}
          >
            {/* Eyebrow, title and sub-line all follow the live site's hero
                lockup: `.hero__caption`, `.hero__big` and `.hero__small`. */}
            <p className="hp-eyebrow">
              {work.category}
              <span className="mx-2 text-off-white/25">/</span>
              {work.year}
            </p>
            {/* Assembles glyph by glyph, the way the live site brings its
                chapter headings in. Keyed on the slug by AnimatePresence
                above, so every card change replays it. */}
            <h1 className="hp-display mt-2 text-h1">
              {/* Timed against the stage: a card is 90% of the way to centre
                  in about 0.7s, so the name has to be whole by then. No lead-in
                  delay, a tighter stagger and a shorter rise get it there. */}
              <SplitText text={work.client} delay={0} duration={0.55} />
            </h1>
            <p className="hp-sub mt-2 text-h5">
              <SplitText
                text={work.title}
                delay={0.08}
                stagger={0.01}
                duration={0.45}
              />
            </p>
            {work.note ? (
              <p className="label-xs mt-2 text-off-white/35">{work.note}</p>
            ) : null}

            {/* The carousel's cards are WebGL, so they cannot be links and
                cannot morph. This is the way into the project from here. */}
            <Link
              href={`/work/${work.slug}`}
              className="view-project mt-5"
              onClick={(e) => {
                if (!launch || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
                  return;
                e.preventDefault();
                launch({ href: `/work/${work.slug}`, poster: work.poster });
              }}
            >
              {/* The white copy rides up and a lime one takes its place, the
                  same roll the header's Contact CTA and the footer's links
                  use — `data-text` is the incoming copy. */}
              <span className="view-project__roll" data-text="View project">
                <span>View project</span>
              </span>
              <span className="view-project__arrow" aria-hidden>
                <svg
                  viewBox="0 0 16 16"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M4 12L12 4M5.5 4H12v6.5" />
                </svg>
              </span>
            </Link>
          </m.div>
        ) : (
          <p className="text-h4 text-off-white/50">
            No projects in this category.
          </p>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMotionValue, useTransform } from "motion/react";
import { AboutFinale } from "@/components/about-finale";
import { CAPABILITIES } from "@/components/about-capabilities";
import { WorkCta, type CtaLine } from "@/components/work-cta";
import { SiteFooter } from "@/components/site-footer";

/**
 * How the About page ends — the same close the work index has.
 *
 * The staircase's last picture is taken to fullscreen, pulled out of focus, and
 * the lockup assembles on it letter by letter before the footer rises over the
 * lot. All of it is one scroll run, scrubbed: stop and it stops, scroll back
 * and it comes apart in the order it went together.
 *
 * This component exists to own the two progress values that the pieces have to
 * SHARE. `WorkFinale`'s own comment says why: the closing layer has to leave on
 * exactly the stretch the footer's ground rises on, and the lockup has to part
 * on the same value the footer arrives on. Two components each measuring the
 * same element are two sources of truth that drift by a frame, so the page
 * measures once and hands the value down — which is precisely what
 * `WorkCarousel` does for /work. This replaces `FooterFilm`, which was the
 * plain footer with no closing sequence in front of it.
 */

/**
 * The closing run: zero until the mark, then up through the picture's own
 * height (capped, so a tall one does not make the run proportionally longer)
 * and on for nearly two screens more. The lengths are `ENTRY` in
 * `WorkCarousel`, verbatim.
 *
 * WHAT IT STARTS ON IS NOT THE PICTURE. The run is timed off the last step's
 * WORDS and sized off its FRAME, and the split is deliberate. The frame's top
 * edge crosses the header the better part of a hundred pixels before the title
 * does, because the words are centred against a frame two-and-a-half times
 * their height — so timing it off the frame started the zoom while the title
 * was still mid-screen, with its own line not yet finished arriving.
 *
 * The two handles are `[data-about-finale-mark]` (the words — when) and
 * `[data-about-finale]` (the frame — what, and how far). Both are on the same
 * row of the same step, which is what makes the split safe: the last time this
 * codebase separated a trigger from its subject they were different elements in
 * different places, and they diverged.
 */
const ENTRY = { tail: 1.0, cap: 0.75, hold: 1.85, lead: 0.1 };

/**
 * `lead` — HOW FAR BEFORE THE HEADER THE ZOOM STARTS.
 *
 * The run began exactly when the step's words reached the header, so the
 * picture climbed the whole screen, arrived at the top, and only then started
 * growing. Read as one gesture that is a stop and a restart: the travelling
 * finishes, then something else begins.
 *
 * A tenth of a screen of lead means the words are still that far BELOW the
 * header when the frame starts to open, so the climb and the zoom overlap and
 * the move reads as one thing accelerating rather than two things in sequence.
 *
 * It is spent against `travel` as well as against the trigger, so the run
 * STARTS earlier and ends in the same place — the glass, the night and the
 * hand-off to the closing words all keep the positions they were tuned at.
 *
 * A tenth and not more: the arm point has to stay below the last step's
 * landing, or the frame would start opening while the step underneath it is
 * still arriving. Measured clearance was 0.22 / 0.17 / 0.16 screens at 1680,
 * 1440 and 1280 wide, and the narrowest of those is the ceiling here.
 */

/** The same run when there is no step to measure — off this block's own box. */
const FALL = { from: 1.2, hold: 1.85 };

/**
 * Blank page between the foot of the staircase and the lockup.
 *
 * Scroll distance and nothing else, and it costs nothing to look at: by the
 * time the reader is crossing it the closing picture already fills the screen,
 * so what is behind that layer is not visible at all. Without it the zoom and
 * the lockup have to share one screen of travel and the push is over before it
 * has been noticed.
 */
const RUNWAY = "100svh";

/**
 * THIS PAGE'S CLOSING, which is not the work page's.
 *
 * `/work` ends on "Let's Make / The Next One." — the right thing to say after
 * scrolling a reel, because the reader has just been shown the last one. This
 * page has not shown work. It has argued that the studio is answerable to it:
 * a shop that left the agency floor rather than a vendor, Emmy-winning,
 * founded by people who are still the ones in the room. The close has to follow
 * from THAT, and "see what we made, now commission something" does not.
 *
 * So the invitation is the argument's own conclusion. A studio that calls
 * itself answerable is making a claim it can be held to, and the way to be held
 * to it is to be handed the brief nobody else wants. That is what the page has
 * spent nine screens earning the right to say.
 *
 * The cadence is deliberately the work page's — a short line, then a three-beat
 * key line closing on a full stop, "The ___ One." — so the two endings read as
 * one studio with one voice rather than two pages that were written apart.
 *
 * The action is a conversation and not a project: "built on relationships" is
 * on screen four chapters earlier, and a button that asks for a transaction
 * would contradict it in two words.
 */
const LINES: CtaLine[] = [
  { text: "Bring Us", dir: -1 },
  { text: "The Hard One.", dir: 1, key: true },
];
const ACTION = "Start a Conversation";

export function AboutClosing({ children }: { children: ReactNode }) {
  const [filmEl, setFilmEl] = useState<HTMLDivElement | null>(null);

  /** The footer's beat. The lockup parts on it and the closing layer leaves. */
  const film = useMotionValue(0);
  /** The closing run. The zoom, the blur and the lockup's arrival ride this. */
  const entry = useMotionValue(0);

  /**
   * The lockup's own window on the closing run, remapped to 0–1.
   *
   * The picture has a whole screen of travel to fill the window and pull out of
   * focus before there is anything for words to stand on; the letters own only
   * the last stretch of it, but still want the whole of 0–1 to lay themselves
   * out over.
   */
  const reveal = useTransform(entry, [0.57, 1], [0, 1]);

  useEffect(() => {
    if (!filmEl) return;

    /**
     * The mark the run starts on is the header's MEASURED height.
     *
     * Cached and re-read on resize rather than per scroll pass: it is a
     * layout-reading measurement and nothing about it changes while the reader
     * is scrolling.
     */
    let headerH = 0;
    const measureHeader = () => {
      const bar = document.querySelector<HTMLElement>(".site-header__inner");
      headerH = bar?.getBoundingClientRect().height || window.innerHeight * 0.1;
    };
    measureHeader();

    /**
     * EVERY BOX HERE IS FOUND ONCE, in document space.
     *
     * This ran two `querySelector` calls and three `getBoundingClientRect`
     * calls on every scroll tick — five pieces of DOM work, each rect a forced
     * synchronous layout, to re-learn positions that only change when the page
     * is laid out. Measured against `/work`, which does none of this per tick,
     * it was the single largest contributor to the page not feeling smooth.
     *
     * Re-measured on resize and whenever the document's own size changes, which
     * is what covers fonts landing and images arriving.
     */
    const doc = { film: { top: 0, height: 0 }, step: 0, cue: 0, has: false };

    const measure = () => {
      const f = filmEl.getBoundingClientRect();
      doc.film = { top: f.top + window.scrollY, height: f.height };
      const step = document.querySelector<HTMLElement>("[data-about-finale]");
      const cue = document.querySelector<HTMLElement>(
        "[data-about-finale-mark]",
      );
      /* Falls back to the frame if the words are not there to be found, which
         keeps the old behaviour rather than no behaviour. */
      const sr = step?.getBoundingClientRect();
      const cr = cue?.getBoundingClientRect() ?? sr;
      doc.has = !!(sr && cr && sr.height > 0);
      if (sr) doc.step = sr.height;
      if (cr) doc.cue = cr.top + window.scrollY;
    };

    const update = () => {
      const view = window.innerHeight;
      const top = doc.film.top - window.scrollY;

      const span = doc.film.height - view;
      if (span > 0) film.set(Math.min(1, Math.max(0, -top / span)));

      /* The header, plus the lead — see `ENTRY.lead`. The zoom is timed off
         this line rather than off the header itself, so it begins while the
         step is still on its way up to it. */
      const mark = headerH + view * ENTRY.lead;
      const step = doc.has ? { height: doc.step } : null;
      const cue = doc.has ? { top: doc.cue - window.scrollY } : null;

      /* A height of zero means the step is gone or not laid out yet — there is
         nothing to measure against, so fall back rather than divide by a
         number that happens to produce 1. */
      if (step && cue && step.height > 0) {
        const travel =
          mark +
          Math.min(step.height, view * ENTRY.cap) * ENTRY.tail +
          view * ENTRY.hold;
        entry.set(Math.min(1, Math.max(0, (mark - cue.top) / travel)));
      } else {
        const travel = view * (FALL.from + FALL.hold);
        entry.set(Math.min(1, Math.max(0, (view * FALL.from - top) / travel)));
      }
    };

    measure();
    const frame = requestAnimationFrame(() => {
      measure();
      update();
    });
    const sizes = new ResizeObserver(() => {
      measure();
      update();
    });
    sizes.observe(document.documentElement);

    update();
    const onResize = () => {
      measureHeader();
      measure();
      update();
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", onResize);
    };
  }, [filmEl, film, entry]);

  const last = CAPABILITIES[CAPABILITIES.length - 1];

  return (
    <>
      {/* BEFORE the staircase, and that placement is the whole reason this
          component takes children rather than sitting after them.

          A zero-height `sticky` dock only starts holding the top of the window
          once its own flow position reaches it. Rendered after the staircase it
          was still a screen and a half below the fold at the moment the zoom
          armed — so the closing layer was drawn down there, off-screen, while
          the real picture had already been hidden to hand over to it. The
          picture simply vanished. Rendered here it is pinned from the
          staircase's first pixel, which is well before anything asks it to
          paint. Same arrangement /work has, for the same reason. */}
      <div className="work__finale-dock">
        <AboutFinale
          src={last.src}
          video={last.video}
          entry={entry}
          progress={film}
        />
      </div>

      {children}

      {/* See `RUNWAY` — scroll distance for the push to be slow in. */}
      <div aria-hidden style={{ height: RUNWAY }} />

      <div ref={setFilmEl}>
        <WorkCta
          progress={film}
          reveal={reveal}
          lines={LINES}
          action={ACTION}
        />
        <SiteFooter progress={film} />
      </div>
    </>
  );
}

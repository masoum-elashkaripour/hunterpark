"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  m,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";

/**
 * Footer ported from the live build (hunterpark.vercel.app).
 *
 * Markup, class names and SVG geometry are verbatim from its `.footer` block —
 * the two line plates (1600×1000 wide, 390×844 tall), the arc origins, the
 * cross ticks, the twelve-column grid and every breakpoint. Colours and hovers
 * come from the same stylesheet, so this drops into the main repo unchanged.
 *
 * It is a scroll FILM, as the reference is: `.footer` stands two screens tall
 * with its stage pinned for the first, and every part of it is READ from that
 * progress rather than triggered by it. Scrolling down brings the parts in one
 * after another over the work; scrolling back up takes them out in the same
 * order. The progress is owned by the page — see `WorkCarousel` — because the
 * work section has to fade on the very same value this footer arrives on.
 *
 * Only /work exists in this prototype, so every destination points at it.
 */

/**
 * `FOOTER_MOTION`, verbatim from `src/scripts/footer.ts` in the source repo.
 *
 * Every number is a share of the beat's own timeline, and the beat is 4.5
 * screens long (`film.ts`) — which is why `.footer` is 450svh. Scrubbed, as
 * everything there is: stop and it stops, scroll back and it reverses.
 *
 * `part` is not here. That beat parts the work section's MAKE SOMETHING
 * TOGETHER. call to action to either edge, and this page has no such lockup —
 * the work index fades on `night` instead, which is the same stretch of scroll.
 */
const MOTION = {
  /**
   * `mark` is shifted from the source's 0.078 → 0.56.
   *
   * There the footer chapter is stacked and pinned for the whole beat, so the
   * wordmark's box never moves and the flight can begin at once. Here the
   * stage only pins about a fifth of the way in — the closing lockup has the
   * screen before that — so a flight starting at 0.078 would be aiming at a
   * target that was itself still travelling, which is what no amount of
   * per-frame correction could make smooth. It now runs entirely inside the
   * pinned stretch, over the same share of the beat.
   */
  mark: { start: 0.24, end: 0.62 },
  night: { start: 0.233, end: 0.451 },
  settle: {
    start: 0.436,
    words: 0.124,
    wordStagger: 0.0093,
    items: 0.109,
    itemStagger: 0.014,
  },
  figure: { lines: { start: 0.46, end: 0.84, each: 0.5 }, arcsFrom: 0.96 },
};

/** Where the footer starts answering the pointer — as the night finishes. */
const LIVE_AT = MOTION.night.end;

const INDEX = [
  { label: "Studio", href: "/work" },
  { label: "Work", href: "/work" },
  /* Was `/work` — a placeholder from before there was a contact page. */
  { label: "Contact", href: "/contact" },
];

const SOCIAL = [
  { label: "Instagram", href: "https://www.instagram.com/hunterparktv/" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/hunter-park-productions/",
  },
];

/** The statement, split so the three disciplines can take the accent. */
const STATEMENT = [
  ["A", false],
  ["creative", false],
  ["production", false],
  ["studio", false],
  ["for", false],
  ["film,", true],
  ["photography,", true],
  ["design", true],
  ["and", false],
  ["visual", false],
  ["storytelling.", false],
] as const;

/**
 * One footer element, tied to the film's progress.
 *
 * Its own component because each needs a pair of `useTransform` calls and hooks
 * cannot be made in a loop — and because this is what makes the footer
 * reversible: the value is read from the scroll, never fired by it.
 */
function Item({
  p,
  driven,
  at,
  as = "div",
  className,
  children,
}: {
  p: MotionValue<number>;
  /** The film is actually running; see `driven` in `SiteFooter`. */
  driven: boolean;
  /** Place in the reading order; sets when this one arrives. */
  at: number;
  as?: "div" | "p" | "li";
  className?: string;
  children?: React.ReactNode;
}) {
  /**
   * Read here rather than passed down, and checked BEFORE any of the scroll
   * values are used.
   *
   * Leaving this out is what emptied the footer: the mark and the ground were
   * guarded, so they showed, while every item, word and line sat at its
   * progress-zero state for ever — invisible, clipped to nothing, undrawn. A
   * scrubbed element whose scrub is switched off has to be shown at its END
   * state, not its start.
   */
  const reduced = useReducedMotion();
  /* `itemsAt` in the source: the run of items starts halfway through the
     statement's own rise, so the two overlap rather than queue. */
  const S = MOTION.settle;
  const from = S.start + S.words * 0.5 + at * S.itemStagger;
  const to = from + S.items;

  const opacity = useTransform(p, [from, from + 0.001], [0, 1]);
  const y = useTransform(p, [from, to], [16, 0]);
  /* Uncovered from its own baseline as it rises — the source animates the same
     `inset(100% 0% 0% 0%)` → `inset(0%)` on every item, which is what gives the
     footer its typeset feel rather than a plain fade. */
  const cover = useTransform(p, [from, to], [100, 0]);
  const clipPath = useMotionTemplate`inset(${cover}% 0% 0% 0%)`;

  const Tag = m[as];
  return (
    <Tag
      className={className}
      style={reduced || !driven ? undefined : { opacity, y, clipPath }}
    >
      {children}
    </Tag>
  );
}

/** One drafted line, drawing itself on as the film runs. */
function Line({
  p,
  driven,
  at,
  d,
  circle,
  cross,
}: {
  p: MotionValue<number>;
  driven: boolean;
  at: number;
  d?: string;
  circle?: { cx: number; cy: number; r: number };
  /**
   * The cross ticks, which are drafted paths like the rest and are marked only
   * so the stylesheet can give them their heavier 0.4 against the guides' 0.16.
   */
  cross?: boolean;
}) {
  const reduced = useReducedMotion();
  /* `figure.lines` from the source: the run spans 0.46 → 0.84, each line takes
     half of that span, and the rest is shared out as stagger — so they overlap
     and the field draws continuously rather than line by line. */
  const L = MOTION.figure.lines;
  const span = L.end - L.start;
  const each = span * L.each;
  const from = L.start + at * ((span * (1 - L.each)) / 5);
  const pathLength = useTransform(p, [from, from + each], [0, 1]);

  /* `pathLength` only. Animating opacity writes an inline `opacity: 1` that
     beats the stylesheet's `.16` and leaves hard lime lines instead of faint
     drafting — and there is nothing to fade, since a zero-length path draws
     nothing anyway. */
  return circle ? (
    <m.circle
      {...circle}
      data-footer-line
      style={reduced || !driven ? undefined : { pathLength }}
    />
  ) : (
    <m.path
      d={d}
      data-footer-line={cross ? "cross" : ""}
      style={reduced || !driven ? undefined : { pathLength }}
    />
  );
}

/** One word of the statement, rising out of its own mask. */
function Word({
  p,
  driven,
  at,
  em,
  children,
}: {
  p: MotionValue<number>;
  driven: boolean;
  at: number;
  em?: boolean;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const S = MOTION.settle;
  const from = S.start + at * S.wordStagger;
  const y = useTransform(p, [from, from + S.words], ["110%", "0%"]);
  return (
    <span className="split__wmask">
      <m.span
        className="split__w"
        data-em={em || undefined}
        style={reduced || !driven ? undefined : { y }}
      >
        {children}
      </m.span>
    </span>
  );
}

const Arrow = () => (
  <svg
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="M4 12L12 4M5.5 4H12v6.5" />
  </svg>
);

export function SiteFooter({
  progress,
  still = false,
}: {
  /** The film's 0→1, owned by the page so the work can fade on the same value. */
  progress: MotionValue<number>;
  /**
   * A plain footer: one screen, in its finished state, no film and no wordmark
   * hand-off from the header. Pass a progress that never moves with it — the
   * parts then render with no scrub styles at all (see `driven`).
   */
  still?: boolean;
}) {
  const reduced = useReducedMotion();

  /* `is-live` is a class on the root in the source, toggled from the timeline.
     Held in state so React owns the class rather than the scroll handler
     reaching into the DOM for it. */
  const [live, setLive] = useState(false);

  /**
   * Whether the film is actually running — and the whole footer's insurance.
   *
   * Every scrubbed part starts at nothing: zero opacity, clipped to a hairline,
   * a path of no length. That is right while the scroll is driving them and
   * catastrophic if it ever is not — a mis-measured target, a ref that attached
   * after the hook read it, and the footer is simply an empty screen with a
   * wordmark on it. Which is exactly what it was.
   *
   * So nothing is scrubbed until the progress has been SEEN to move. Until
   * then every part renders with no inline style at all, which is its finished
   * state. The failure mode is now a footer that is merely static rather than
   * one that is invisible.
   */
  const [driven, setDriven] = useState(false);

  useMotionValueEvent(progress, "change", (v) => {
    if (!driven && v > 0) setDriven(true);
  });

  /* 3 · the night rises over the work's frame. */
  const N = MOTION.night;
  const groundOpacity = useTransform(progress, [N.start, N.end], [0, 1]);

  /**
   * The drafted plates belong to the FOOTER, and must not be seen before it.
   *
   * This exists because the cross ticks used to be plain paths with nothing
   * animating them: they were on screen from the start, showing through the
   * footer's still-transparent stage and scattering plus marks over the closing
   * lockup. Fading the whole plate on the night fixed that and introduced a
   * worse one — the crosses were then FULLY UP at 0.451, while every guide and
   * arc around them waits for `figure.lines` at 0.46.
   *
   * The crosses draw themselves on now, like the lines they sit among, so this
   * no longer has anything to hide: at the moment the plate becomes opaque
   * every path in it still has zero length. It is kept because the glow lives
   * in here too, and the glow is a filled element that genuinely does need the
   * ground beneath it before it can be seen.
   */
  const plateOpacity = useTransform(progress, [N.start, N.end], [0, 1]);

  /* The hairline is drawn last, starting halfway through the run of items. */
  const S = MOTION.settle;
  const ruleAt = S.start + S.words * 0.5 + 10 * S.itemStagger * 0.5;
  const ruleScale = useTransform(
    progress,
    [ruleAt, ruleAt + S.items * 1.4],
    [0, 1],
  );

  /* 5 · the glow drifts across as the field is drawn. */
  const L = MOTION.figure.lines;
  const glowOpacity = useTransform(progress, [L.start, 1], [0, 1]);
  const glowX = useTransform(progress, [L.start, 1], ["-20%", "18%"]);
  const glowY = useTransform(progress, [L.start, 1], ["12%", "-10%"]);
  /* …and the arcs open out a little about their own measured centres. */
  const arcScale = useTransform(
    progress,
    [L.start, 1],
    [MOTION.figure.arcsFrom, 1],
  );
  /* The guides settle through the last stretch. */
  const guideY = useTransform(progress, [0.8, 1], [12, 0]);

  /* ---- The wordmark hands over from the header ------------------------ */

  const markRef = useRef<HTMLParagraphElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  /**
   * The mark's own box, taken relative to the STAGE and measured once.
   *
   * Reading the mark's live rect each frame and subtracting the current motion
   * values looks equivalent and is not: the rect reflects the transform from
   * the frame that has been PAINTED, while the values are already the next
   * frame's. Feeding one into the other made the wordmark chase itself — the
   * jumping and lagging on the way down.
   *
   * The stage carries no transform, so its rect is a clean reference. The
   * mark's place inside it never changes, so it only has to be found once.
   */
  const within = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const read = () => {
      const mark = markRef.current;
      const stage = stageRef.current;
      if (!mark || !stage) return;

      const previous = mark.style.transform;
      mark.style.transform = "none";
      const m = mark.getBoundingClientRect();
      const st = stage.getBoundingClientRect();
      within.current = {
        x: m.left - st.left,
        y: m.top - st.top,
        w: m.width,
        h: m.height,
      };
      mark.style.transform = previous;
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  const markX = useMotionValue(0);
  const markY = useMotionValue(0);
  const markScale = useMotionValue(1);
  /* The matching half of that cut: `autoAlpha 0 → 1` over 0.001 in the source.
     The two swap on the same frame, so there is never a moment with neither
     wordmark on screen. */
  const markOpacity = useTransform(
    progress,
    [MOTION.mark.start, MOTION.mark.start + 0.0001],
    [0, 1],
  );

  const taken = useRef(false);

  /**
   * The header's wordmark, measured once.
   *
   * It is `position: fixed`, so its box only ever changes when the window
   * does — reading it on every scroll frame forced a second layout per frame
   * for a number that had not moved, which is where the flight's lag came
   * from. The mark's own box still has to be read live; that one really is
   * travelling.
   */
  const logoBox = useRef<DOMRect | null>(null);

  useEffect(() => {
    const read = () => {
      const logo = document.querySelector<HTMLElement>(".site-header__logo");
      logoBox.current = logo?.getBoundingClientRect() ?? null;
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  /**
   * Placed on every frame rather than tweened between two fixed points.
   *
   * It has to be: the header's wordmark is `position: fixed` and holds still in
   * the viewport while this one travels with the page, so a delta taken once
   * would be right at exactly one scroll position and wrong everywhere else.
   *
   * This only works because the stage is PINNED. The header sits inside the
   * pinned box, so the mark can reach it without crossing the stage's
   * `overflow: hidden` — unpinned, it was clipped off at the footer's top edge,
   * which is what looked like the logo sliding under the work.
   */
  useMotionValueEvent(progress, "change", (p) => {
    if (reduced) return;

    const a = logoBox.current;
    const { x, y, w, h } = within.current;

    if (a && w > 0) {
      /**
       * Two cached boxes and some arithmetic — no measuring at all.
       *
       * This is what the source does: GSAP evaluates a `fromTo`'s function
       * values ONCE and then tweens between two fixed numbers. Recomputing
       * every frame, as this used to, reads a rect that carries the transform
       * from the last PAINTED frame and subtracts values that already belong
       * to the next one — the mark ends up chasing itself, which is the jitter.
       *
       * Both boxes are stable for the whole flight: the header's wordmark is
       * `position: fixed`, and the footer's stage is pinned at the top of the
       * window by the time this starts, so the mark's own untransformed centre
       * is simply its offset inside that stage.
       */
      const cx = x + w / 2;
      const cy = y + h / 2;

      const M = MOTION.mark;
      const t = Math.max(0, Math.min(1, (p - M.start) / (M.end - M.start)));
      /* power2.inOut, the source's easing for this move. */
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const away = 1 - e;

      markX.set((a.left + a.width / 2 - cx) * away);
      markY.set((a.top + a.height / 2 - cy) * away);
      markScale.set(1 + (a.width / w - 1) * away);
    }

    document.documentElement.toggleAttribute(
      "data-logo-handoff",
      p >= MOTION.mark.start,
    );

    const now = p >= LIVE_AT;
    if (now !== taken.current) {
      taken.current = now;
      setLive(now);
    }
  });

  /* Leaving the attribute set would hide the header's wordmark for good on
     whatever page this unmounts into. */
  useEffect(
    () => () => {
      document.documentElement.removeAttribute("data-logo-handoff");
    },
    [],
  );

  /**
   * Reduced motion gets the end state, and gets it announced.
   *
   * The scroll handler above returns early in that mode, so nothing ever told
   * the page the footer had arrived — which is why the filter bar was still
   * sitting over it. Derived rather than set, so this is not a render cascade:
   * in that mode the footer is simply live from the start.
   */

  return (
    <footer
      className={`footer${live || reduced || still ? " is-live" : ""}${still ? " footer--still" : ""}`}
    >
      <div className="footer__stage" ref={stageRef}>
        <m.div
          className="footer__ground"
          aria-hidden="true"
          /* Solid until the film is known to be running — an undriven footer
             must be an opaque footer, not a transparent hole onto the section
             above it. */
          style={
            reduced || !driven ? { opacity: 1 } : { opacity: groundOpacity }
          }
        />

        <m.div
          className="footer__pattern"
          aria-hidden="true"
          style={reduced || !driven ? undefined : { opacity: plateOpacity }}
        >
          <m.span
            className="footer__glow"
            style={
              reduced || !driven
                ? undefined
                : { opacity: glowOpacity, x: glowX, y: glowY }
            }
          />

          {/* Two plates, one per orientation — the wide one is laid out for a
              landscape viewport and the tall one for a phone. CSS swaps them at
              767px; drawing one and letting it stretch would flatten the arcs. */}
          <svg
            className="footer__lines footer__lines--wide"
            viewBox="0 0 1600 1000"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <m.g
              style={
                reduced
                  ? undefined
                  : { scale: arcScale, originX: "470px", originY: "500px" }
              }
            >
              <Line
                p={progress}
                driven={driven}
                at={0}
                circle={{ cx: 470, cy: 500, r: 180 }}
              />
              <Line
                p={progress}
                driven={driven}
                at={1}
                d="M 1232.3 632.3 A 520 520 0 0 1 1600.0 480.0"
              />
            </m.g>
            <m.g style={reduced || !driven ? undefined : { y: guideY }}>
              <Line p={progress} driven={driven} at={2} d="M 0 340 H 1600" />
              <Line p={progress} driven={driven} at={3} d="M 0 560 H 1600" />
              <Line p={progress} driven={driven} at={4} d="M 880 0 V 620" />
              <Line p={progress} driven={driven} at={5} d="M 0 640 L 880 340" />
              {/* THE CROSS TICKS ARE PART OF THIS SEQUENCE, not a separate
                  event. They were a plain `<path>` with nothing animating them,
                  so they were faded in bodily on `night` (0.233 -> 0.451) just
                  to stop them showing through the still-transparent stage —
                  which left them FINISHED at 0.451 while the guides around them
                  only begin at `figure.lines`, 0.46. Four plus marks alone on a
                  black field, a beat before anything they belong to.

                  Drafted now, and LAST in the stagger, which is where the
                  reference puts them. Measured on it, by stroke-dashoffset:
                  with 3000px of the page left its guides are already drawing
                  (1003 of 1131) while the crosses are still untouched at 144;
                  at 2400px the guides are ~89% and the crosses 43%; both finish
                  together. So the order is guides first, crosses closing behind
                  them — never the other way round.

                  `at={5}` is the last of the six slots the existing stagger
                  already defines, so this is a position in that sequence rather
                  than a delay bolted on beside it. */}
              <Line
                p={progress}
                driven={driven}
                at={5}
                cross
                d="M 871 340 H 889 M 880 331 V 349 M 871 560 H 889 M 880 551 V 569 M 291 560 H 309 M 300 551 V 569 M 631 560 H 649 M 640 551 V 569"
              />
            </m.g>
          </svg>

          <svg
            className="footer__lines footer__lines--tall"
            viewBox="0 0 390 844"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <m.g
              style={
                reduced
                  ? undefined
                  : { scale: arcScale, originX: "250px", originY: "545px" }
              }
            >
              <Line
                p={progress}
                driven={driven}
                at={0}
                circle={{ cx: 250, cy: 545, r: 95 }}
              />
              <Line
                p={progress}
                driven={driven}
                at={1}
                d="M 135.6 685.0 A 300 300 0 0 1 348.2 546.9"
              />
            </m.g>
            <m.g style={reduced || !driven ? undefined : { y: guideY }}>
              <Line p={progress} driven={driven} at={2} d="M 0 355 H 390" />
              <Line p={progress} driven={driven} at={3} d="M 0 545 H 390" />
              <Line p={progress} driven={driven} at={4} d="M 330 440 V 700" />
              <Line p={progress} driven={driven} at={5} d="M 0 650 L 330 440" />
              {/* The phone plate's three, on the same schedule — see the wide
                  plate above. */}
              <Line
                p={progress}
                driven={driven}
                at={5}
                cross
                d="M 325 545 H 335 M 330 540 V 550 M 150 545 H 160 M 155 540 V 550 M 325 440 H 335 M 330 435 V 445"
              />
            </m.g>
          </svg>
        </m.div>

        <div className="footer__grid">
          <p className="footer__statement">
            <span className="visually-hidden">
              A creative production studio for film, photography, design and
              visual storytelling.
            </span>
            <span aria-hidden="true">
              {STATEMENT.map(([word, em], i) => (
                <span key={`${word}-${i}`}>
                  <Word p={progress} driven={driven} at={i} em={em}>
                    {word}
                  </Word>
                  {/* Outside the word box: `.split__w` is inline-block with
                      nowrap, which eats a trailing space and runs the words
                      together. */}
                  {i < STATEMENT.length - 1 ? " " : null}
                </span>
              ))}
            </span>
          </p>

          <nav
            className="footer__group footer__group--index"
            aria-label="Footer"
          >
            <Item
              p={progress}
              driven={driven}
              at={1}
              as="p"
              className="footer__label"
            >
              <span>Index</span>
            </Item>
            <ul>
              {INDEX.map((link, i) => (
                <Item
                  key={link.label}
                  p={progress}
                  driven={driven}
                  at={2 + i}
                  as="li"
                >
                  <Link className="footer__link" href={link.href}>
                    <span className="footer__roll" data-text={link.label}>
                      <span>{link.label}</span>
                    </span>
                  </Link>
                </Item>
              ))}
            </ul>
          </nav>

          <div className="footer__group footer__group--social">
            <Item
              p={progress}
              driven={driven}
              at={3}
              as="p"
              className="footer__label"
            >
              <span>Follow</span>
            </Item>
            <ul>
              {SOCIAL.map((link, i) => (
                <Item
                  key={link.label}
                  p={progress}
                  driven={driven}
                  at={4 + i}
                  as="li"
                >
                  <a
                    className="footer__link"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="footer__roll" data-text={link.label}>
                      <span>{link.label}</span>
                    </span>
                    <Arrow />
                  </a>
                </Item>
              ))}
            </ul>
          </div>

          <div className="footer__contact">
            <Item
              p={progress}
              driven={driven}
              at={5}
              as="p"
              className="footer__label"
            >
              <span>New project</span>
            </Item>
            <Item p={progress} driven={driven} at={6}>
              {/* "New project / Say hello" — this is the footer's contact
                  call, and it went to the work index for want of anywhere
                  else. It has somewhere else now. */}
              <Link className="footer__say" href="/contact">
                <span className="footer__say-text">Say hello</span>
                <span className="footer__say-arrow">
                  <Arrow />
                </span>
              </Link>
            </Item>
          </div>

          <Item
            p={progress}
            driven={driven}
            at={7}
            as="p"
            className="footer__tagline"
          >
            <span>We do not hunt.</span>
            <span>We are not a park.</span>
          </Item>

          <div className="footer__base">
            {/* Drawn from the left, which is why the rule carries
                `transform-origin: 0` in the stylesheet. */}
            <m.span
              className="footer__rule"
              aria-hidden="true"
              style={reduced || !driven ? { scaleX: 1 } : { scaleX: ruleScale }}
            />
            <Item
              p={progress}
              driven={driven}
              at={8}
              as="p"
              className="footer__small"
            >
              © 2026 HunterPark
            </Item>
            <Item p={progress} driven={driven} at={9}>
              {/* `#main` was the source's anchor and does not exist on this
                  page, so the link did nothing. Aimed at the index instead of
                  the page origin: the top of the page is the carousel the
                  reader has already left, and the work in grid form is what
                  "back to top" means from down here.

                  Handled rather than left to the browser because the smooth
                  scroll owns the scroll position — a native jump fights it. */}
              <a
                className="footer__small footer__top"
                href="#work-index"
                onClick={(event) => {
                  const target = document.getElementById("work-index");
                  if (!target) return;
                  event.preventDefault();
                  target.scrollIntoView({
                    behavior: reduced ? "auto" : "smooth",
                    block: "start",
                  });
                }}
              >
                Back to top <span aria-hidden="true">↑</span>
              </a>
            </Item>
          </div>

          <m.p
            ref={markRef}
            className="footer__mark"
            /* `transform-origin: 0 0` matches the corner the offsets above are
               measured from; anything else and the scale pulls it off target. */
            /* Scaled about its CENTRE — motion's default origin, and what the
               offsets above are measured against. */
            style={
              reduced || !driven
                ? undefined
                : {
                    x: markX,
                    y: markY,
                    scale: markScale,
                    opacity: markOpacity,
                  }
            }
          >
            <Image
              src="/brand/logo.svg"
              alt="HunterPark"
              width={1096}
              height={179}
              unoptimized
            />
          </m.p>
        </div>
      </div>
    </footer>
  );
}

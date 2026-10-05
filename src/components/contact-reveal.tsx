"use client";

import { useEffect, useRef, useState } from "react";
import {
  m,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useBeat } from "@/components/use-beat";
import { ContactForm } from "@/components/contact-form";
import { ScrollChars } from "@/components/scroll-chars";
import { ContactMap } from "@/components/contact-map";
import {
  InstagramIcon,
  LinkedInIcon,
  MailIcon,
  PhoneIcon,
  ShareIcon,
} from "@/components/contact-icons";
import { CONTACT, SOCIAL } from "@/lib/contact";
import { GLOBE_PICTURES, globeSrc } from "@/lib/contact-globe";

/**
 * The second and last section: a picture out of the opening grows until it is
 * the whole screen, and the contact panel is read on it.
 *
 * The shape is flyward.com/contact — a photograph behind, and over it a single
 * block split into an information column and a form column. The motion is this
 * site's: `useBeat` for the scroll value, which is the hook every pinned chapter
 * already uses, and the picture's own box growing from the hero card to the
 * frame (see `frame` below).
 *
 * The panel is flyward's too: the information on frosted glass over the
 * picture and the form beside it, both in the site's dark theme.
 *
 * THE PICTURE IS ONE OF THE GLOBE'S, PICKED AT RANDOM. The moment the reader
 * starts to scroll, one of the prints turning on the globe — any one that is
 * fully in view right then — is chosen, and it grows from exactly where it is,
 * at exactly its size, until it is the frame. Scroll back to the top and the
 * next scroll picks again. It blurs as it grows, so the full frame is a soft
 * ground behind the panel.
 *
 * The map arrives LATER than the rest of the column, on its own window, because
 * the brief asks for it to appear on further scroll rather than with the panel.
 */

/** Where the picture starts if no print can be read (e.g. reduced motion):
    centred, this wide in vw. */
const FALLBACK_W = 16;

/**
 * THE WHOLE RUN, IN SCREENS OF SCROLL from the section's top — one table, so
 * the hand-over to the footer can be read in one place. The section is pulled
 * up over the hero (`margin-top: -100svh`), so its top IS the page's top and
 * the first notch of the wheel is the first frame of the card growing; before,
 * a whole screen went by sliding an invisible section over the hero first.
 *
 * NOTHING HERE SCROLLS PLAINLY. The stage is pinned from the first frame to
 * the footer, and every move is its own. The beats below are the shape of
 * the run; in the code each is ×1.4, the slower rhythm of /about and /work,
 * and the whole run is followed through a soft spring (see `p`):
 *
 *   0    → 1.6   the picked print opens to full screen — eased in and out,
 *                blurring and darkening as it goes
 *   1.42 → 2.5   the panel, then the map
 *   2.5  → 2.9   a hold — the panel is there to be read and used
 *   2.9  → 3.45  the information column lifts away and fades
 *   3.05 → 3.6   the form follows it, a beat behind
 *   3.1  → 3.95  the picture darkens to night
 *   3.2  → 4.2   the footer (a still one, see `ContactFooter`) comes up
 *                over the stage, its leading edge a fade
 *   4.0          the stage lets go, under the footer
 */
/* Ends as the map reaches the header — the footer is a plain one that simply
   follows, so there is no hand-over to keep the picture pinned for. */
const SCREENS = 7;
const SPAN = SCREENS - 1;
/** A point in screens → the section's own 0→1, as `useBeat` measures it. */
const at = (s: number) => s / SPAN;

/* The zoom takes 1.6 screens — it was 1, and read as a lurch. Everything
   after it moves along with it. */
const OPEN = at(2.24);
const PANEL = { from: at(1.99), to: at(2.73) };
/** Just past the panel's arrival, in screens — the "Send a brief" target. */
const ANCHOR = 2.8;
const MAP = { from: at(2.94), to: at(3.5) };
/** The heading builds itself across the panel's arrival. */
const HEAD_RUN = { from: at(2.1), to: at(2.94) };
const HEAD = ["Let’s make", "something", "together."];
/**
 * THE EXIT, still pinned: each column lifts away faster than the wheel and
 * fades — the information first, the form a beat behind — the picture goes to
 * night, and the footer comes up over it all. No plain scroll-away.
 */
const EXIT_INFO = { from: 4.06, fade: 4.69, to: 4.83 };
const EXIT_FORM = { from: 4.27, fade: 4.9, to: 5.04 };
/** How far a column travels as it leaves, in px. */
const EXIT_LIFT = 170;
const DARK = { from: 4.34, to: 5.53 };
/**
 * How far the footer is pulled up over this section, in screens: its top
 * enters at the foot of the window at 3.2 and it has the frame by 4.2.
 */
export const FOOTER_OVERLAP = SCREENS - 5.88;


export function ContactReveal() {
  const [ref, scrolled] = useBeat();
  /* The section's progress through a soft spring: every move here trails the
     wheel a little and glides, the way the rest of the site's motion does,
     instead of stepping with each notch. */
  const p = useSpring(scrolled, {
    stiffness: 90,
    damping: 24,
    mass: 1,
    restDelta: 0.0002,
  });
  const reduced = useReducedMotion();


  /**
   * THE PICTURE'S OWN BOX GROWS, from the hero card's exact place to the frame.
   *
   * It was a `clip-path` opening on a full-screen photograph — but a cropped
   * full-screen picture seen through a card-shaped hole is not the card: the
   * framing inside it was different, so it read as a new picture appearing
   * rather than that one growing. Here the box starts as the card itself — same
   * centre, same width, same tilt, the photograph's own ratio so `cover` shows
   * all of it — and widens to the stage, cropping only as it outgrows its
   * shape, which is what a zoom is.
   *
   * The stage and the hero are both the window at that moment (the hero is
   * sticky, the stage pins at the top), so the card's box is the same numbers
   * the hero places it with — re-measured on resize, `--card-scale` included.
   */
  const stageRef = useRef<HTMLDivElement>(null);
  const frame = useMotionValue({ W: 0, H: 0, cw: 0, ch: 0, cx: 0, cy: 0 });
  /* Which globe picture is growing, and whether its large copy has landed. */
  const [pic, setPic] = useState(0);
  const [large, setLarge] = useState(false);
  const picked = useRef(false);

  /* The stage's size, and — until something is picked — a centred start. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const f = frame.get();
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      if (f.cw > 0 && picked.current) {
        frame.set({ ...f, W, H });
        return;
      }
      const ratio = GLOBE_PICTURES[0].w / GLOBE_PICTURES[0].h;
      const cw = (FALLBACK_W * window.innerWidth) / 100;
      frame.set({ W, H, cw, ch: cw / ratio, cx: W / 2, cy: H / 2 });
    };
    measure();
    const sizes = new ResizeObserver(measure);
    sizes.observe(stage);
    return () => sizes.disconnect();
  }, [frame]);

  /**
   * Pick a print off the globe: any one fully on screen and clearly visible
   * at this instant, at random. Its box on screen IS where the picture starts
   * — the stage is pinned at the top, so screen and stage share coordinates —
   * and the print itself is hidden while its copy grows, so there are not two.
   */
  const pick = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const tiles = Array.from(
      document.querySelectorAll<HTMLElement>(".contact-globe__tile"),
    );
    tiles.forEach((t) => t.removeAttribute("data-picked"));
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const seen = (min: number) =>
      tiles.filter((t) => {
        const r = t.getBoundingClientRect();
        return (
          Number(t.style.opacity || 0) > min &&
          r.width > 40 &&
          r.left > 0 &&
          r.top > 0 &&
          r.right < vw &&
          r.bottom < vh
        );
      });
    const pool = seen(0.55).length ? seen(0.55) : seen(0.2);
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!pool.length) {
      picked.current = true;
      return;
    }
    const tile = pool[Math.floor(Math.random() * pool.length)];
    const r = tile.getBoundingClientRect();
    tile.setAttribute("data-picked", "");
    setPic(Number(tile.dataset.pic) || 0);
    setLarge(false);
    frame.set({
      W,
      H,
      cw: r.width,
      ch: r.height,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
    });
    picked.current = true;
  };

  /* First pixel of scroll from the top: pick. Back at the top: forget, so the
     next scroll picks afresh. */
  useMotionValueEvent(p, "change", (v) => {
    if (reduced) return;
    if (v > 0 && !picked.current) pick();
    else if (v <= 0 && picked.current) {
      picked.current = false;
      document
        .querySelectorAll(".contact-globe__tile[data-picked]")
        .forEach((t) => t.removeAttribute("data-picked"));
    }
  });

  /* 0 at the card, 1 at the full frame. */
  /* Eased in and out over the longer run: it leaves the globe gently and
     settles into the frame gently, rather than tracking the wheel 1:1. */
  const grow = useTransform(p, [0, OPEN], [0, 1], {
    ease: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  });
  const boxLeft = useTransform(() => {
    const f = frame.get();
    return (f.cx - f.cw / 2) * (1 - grow.get());
  });
  const boxTop = useTransform(() => {
    const f = frame.get();
    return (f.cy - f.ch / 2) * (1 - grow.get());
  });
  const boxWidth = useTransform(() => {
    const f = frame.get();
    return f.cw + (f.W - f.cw) * grow.get();
  });
  const boxHeight = useTransform(() => {
    const f = frame.get();
    return f.ch + (f.H - f.ch) * grow.get();
  });
  /* Not drawn until the stage has pinned exactly over the hero — before that
     it would be a second copy of the card rising up the page beneath it. */
  const shown = useTransform(p, (v) => (v > 0 ? 1 : 0));

  /* Still drifting once the frame is full, so a finished zoom does not read as
     a static photograph. Starts at 1 so the first frame IS the card. */
  const scale = useTransform(p, [0, OPEN, 1], [1, 1, 1.08]);

  /* The blur is a second, pre-blurred copy faded in over the sharp one — an
     opacity change is composited, while animating `filter: blur()` on a
     full-screen picture re-rasterises it every frame. */
  /* The picture blurs AS IT GROWS — sharp while it is still the card, fully
     soft once it is the frame — so by the time it is the section's ground it
     sits behind the panel the way the other pages' grounds do. */
  const blur = useTransform(p, [OPEN * 0.15, OPEN], [0, 1]);

  const scrim = useTransform(p, [OPEN * 0.6, OPEN], [0, 1]);
  /* A night shade over the picture itself, deepening as it grows — a
     light-ground photograph must not arrive as a white screen on a dark site. */
  const shade = useTransform(p, [OPEN * 0.1, OPEN], [0, 1]);
  /* The run-out into the footer: the picture's foot darkens to the footer's
     night over the last stretch, so when the stage lets go its bottom edge is
     already the footer's colour and there is no line between them. */
  const footFade = useTransform(p, [at(EXIT_INFO.from), at(DARK.to)], [0, 1]);
  /* …and the whole picture goes to night under the rising footer. */
  const exitDark = useTransform(p, [at(DARK.from), at(DARK.to)], [0, 1]);
  /* The panel arrives as one; it leaves column by column (below). */
  const panel = useTransform(p, [PANEL.from, PANEL.to], [0, 1]);
  /* The stage sits over the hero from the first frame now, so the panel only
     takes the pointer once it can be seen — otherwise it would swallow the
     hero's own "Send a brief". */
  const panelHit = useTransform(panel, (v) => (v > 0.5 ? "auto" : "none"));
  /* Settles into place as it arrives. */
  const lift = useTransform(p, [PANEL.from, PANEL.to], [26, 0]);
  /* The exit, per column: eased up and away, faster than the wheel, fading
     a little before the move ends. */
  const easeIn = (t: number) => t * t * t;
  const infoOut = useTransform(p, [at(EXIT_INFO.from), at(EXIT_INFO.fade)], [1, 0]);
  const infoUp = useTransform(p, [at(EXIT_INFO.from), at(EXIT_INFO.to)], [0, -EXIT_LIFT], { ease: easeIn });
  const formOut = useTransform(p, [at(EXIT_FORM.from), at(EXIT_FORM.fade)], [1, 0]);
  const formUp = useTransform(p, [at(EXIT_FORM.from), at(EXIT_FORM.to)], [0, -EXIT_LIFT], { ease: easeIn });
  /* The heading's letters, starting just after the panel begins to show and
     done before the map comes — a little over half a screen of scroll. */
  const headIn = useTransform(p, [HEAD_RUN.from, HEAD_RUN.to], [0, 1]);
  const mapIn = useTransform(p, [MAP.from, MAP.to], [0, 1]);
  const mapLift = useTransform(p, [MAP.from, MAP.to], [18, 0]);

  const hasMail = CONTACT.email.length > 0;
  const hasPhone = CONTACT.phone.length > 0;
  const hasCities = CONTACT.cities.length > 0;

  return (
    <section
      ref={ref}
      className="contact-reveal"
      aria-labelledby="reveal-head"
      style={{ "--reveal-h": `${Math.round(SCREENS * 100)}svh` } as React.CSSProperties}
    >
      {/* Where the hero's "Send a brief" lands: the scroll position at which
          the panel has fully arrived, not the section's top (which is now the
          page's top). */}
      <span
        id="contact-form"
        className="contact-reveal__anchor"
        style={
          { "--anchor-top": `${Math.round(ANCHOR * 100)}svh` } as React.CSSProperties
        }
      />
      <div className="contact-reveal__stage" ref={stageRef}>
        <m.div
          className="contact-reveal__media"
          /* Under reduced motion there is no zoom: the picture is simply the
             section's ground. */
          style={
            reduced
              ? { inset: 0, opacity: 1 }
              : {
                  left: boxLeft,
                  top: boxTop,
                  width: boxWidth,
                  height: boxHeight,
                  opacity: shown,
                }
          }
        >
          <m.div className="contact-reveal__shot" style={{ scale }}>
            {/* The globe's own thumbnail first — already loaded, so the
                first frame is exactly the print — then its large copy over
                it once that has arrived. Keyed by the picture so a new pick
                starts clean. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- the globe's cached thumbnail */}
            <img
              key={`t${pic}`}
              src={globeSrc.thumb(GLOBE_PICTURES[pic])}
              alt=""
              className="contact-reveal__img"
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- loaded only once picked */}
            <img
              key={`l${pic}`}
              src={globeSrc.large(GLOBE_PICTURES[pic])}
              alt=""
              className="contact-reveal__img contact-reveal__large"
              data-ready={large || undefined}
              onLoad={() => setLarge(true)}
            />
            {/* The shade — see `shade` above. Over the sharp layers, under
                the blur, so the blurred ground arrives already dark. */}
            <m.div
              className="contact-reveal__shade"
              style={reduced ? undefined : { opacity: shade }}
              aria-hidden
            />
            {/* The blur — see `blur` above: a pre-blurred file faded in, so
                nothing is filtered live while the box grows. */}
            <m.div
              className="contact-reveal__blur"
              style={{ opacity: blur }}
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small pre-blurred copy */}
              <img
                key={`b${pic}`}
                src={globeSrc.blur(GLOBE_PICTURES[pic])}
                alt=""
                className="contact-reveal__img"
              />
            </m.div>
          </m.div>
        </m.div>

        <m.div
          className="contact-reveal__scrim"
          style={{ opacity: scrim }}
          aria-hidden
        />

        <m.div
          className="contact-reveal__foot"
          style={reduced ? undefined : { opacity: footFade }}
          aria-hidden
        />
        <m.div
          className="contact-reveal__dark"
          style={reduced ? { opacity: 0 } : { opacity: exitDark }}
          aria-hidden
        />

        <m.div
          className="contact-section contact-reveal__panel"
          /* Static under reduced motion: the run-out would otherwise fade the
             panel away in a layout where nothing replaces it. */
          style={
            reduced
              ? undefined
              : { opacity: panel, y: lift, pointerEvents: panelHit }
          }
        >
          <div className="contact-reveal__grid">
            {/* Column one — the information. */}
            <m.div
              className="contact-reveal__info"
              style={reduced ? undefined : { opacity: infoOut, y: infoUp }}
            >
              {/* Built letter by letter on scroll, the way /about's headings
                  arrive — same component, same motion. The breaks are the
                  ones the line already took at this size. */}
              <h2 id="reveal-head" className="hp-display contact-reveal__line">
                <ScrollChars lines={HEAD} progress={headIn} />
              </h2>

              {/* Each fact on its own row: a lime-ruled icon box (the
                  ticket's frame, small) and the label over the value. */}
              <div className="contact-reveal__facts">
                <div className="contact-reveal__fact">
                  <span className="contact-reveal__icon">
                    <MailIcon />
                  </span>
                  <div>
                    <p className="label-xs contact-reveal__label">Email</p>
                    {hasMail ? (
                      <a
                        className="contact-reveal__mail"
                        href={`mailto:${CONTACT.email}`}
                      >
                        {CONTACT.email}
                      </a>
                    ) : (
                      <p className="hp-copy contact-reveal__reply">
                        {CONTACT.replyWithin}
                      </p>
                    )}
                  </div>
                </div>

                {/* The number goes in `lib/contact.ts`; until then the slot
                    says so rather than printing a guess. */}
                <div className="contact-reveal__fact">
                  <span className="contact-reveal__icon">
                    <PhoneIcon />
                  </span>
                  <div>
                    <p className="label-xs contact-reveal__label">Phone</p>
                    {hasPhone ? (
                      <a
                        className="contact-reveal__mail"
                        href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`}
                      >
                        {CONTACT.phone}
                      </a>
                    ) : (
                      <p className="label-xs contact-reveal__pending">
                        Number to come
                      </p>
                    )}
                  </div>
                </div>

                <div className="contact-reveal__fact">
                  <span className="contact-reveal__icon">
                    <ShareIcon />
                  </span>
                  <div>
                    <p className="label-xs contact-reveal__label">Socials</p>
                    <ul className="contact-reveal__social">
                      {SOCIAL.map((s) => (
                        <li key={s.label}>
                          <a href={s.href} target="_blank" rel="noreferrer">
                            {s.label === "Instagram" ? (
                              <InstagramIcon className="contact-reveal__social-icon" />
                            ) : (
                              <LinkedInIcon className="contact-reveal__social-icon" />
                            )}
                            <span>{s.label}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* THE MAP, arriving a beat after the panel it sits in. There is
                  no address yet, so it is a drawn stand-in (`ContactMap`) —
                  never a located pin — unless `CONTACT.cities` is filled. */}
              <m.div
                className="contact-reveal__map"
                style={{ opacity: mapIn, y: mapLift }}
              >
                <p className="label-xs contact-reveal__label">Where we are</p>
                {hasCities ? (
                  <div className="contact-reveal__plate">
                    <ul className="label-xs contact-reveal__cities">
                      {CONTACT.cities.map((city) => (
                        <li key={city}>{city}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <ContactMap />
                )}
              </m.div>
            </m.div>

            {/* Column two — the form, imported unchanged. */}
            <m.div
              className="contact-reveal__form"
              style={reduced ? undefined : { opacity: formOut, y: formUp }}
            >
              {/* A heading, in the display face — as a `label-xs` it read as
                  just another field label. */}
              <h3 className="hp-display contact-reveal__form-head">
                Shall we begin?
              </h3>
              <ContactForm bare />
            </m.div>
          </div>
        </m.div>
      </div>
    </section>
  );
}

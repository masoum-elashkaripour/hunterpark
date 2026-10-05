"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  m,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useBeat } from "@/components/use-beat";
import { ContactForm } from "@/components/contact-form";
import { ScrollChars } from "@/components/scroll-chars";
import { CONTACT, SOCIAL } from "@/lib/contact";
import { HERO_CARDS } from "@/components/contact-hero";

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
 * picture, the form on solid white — a form on a photograph is hard to read,
 * on white it cannot be anything else.
 *
 * THE OPENING BOX IS THE HERO CARD'S OWN, imported rather than re-typed, so the
 * picture that grows is visibly the one the reader just watched land.
 *
 * The map arrives LATER than the rest of the column, on its own window, because
 * the brief asks for it to appear on further scroll rather than with the panel.
 */

/** Which of the opening cards grows: the low one right of centre, just under
    the call to action — where the reader's eye is when they start to scroll. */
const CARD = HERO_CARDS[4];

/**
 * THE WHOLE RUN, IN SCREENS OF SCROLL from the section's top — one table, so
 * the hand-over to the footer can be read in one place.
 *
 * It used to end in a full black screen: the stage unpinned and scrolled away,
 * and the footer's first screen is transparent by design, so between the two
 * there was nothing but the page's night until the wordmark began. Now the
 * stage stays pinned through the hand-over and the footer is pulled up over it
 * (`FOOTER_OVERLAP`), so the photograph is still there while the footer comes:
 *
 *   0    → 1.01  the card opens to full screen
 *   0.88 → 1.89  the panel, then the map
 *   1.95 → 2.55  the panel rises until the map reaches the header
 *   2.55         HAND-OVER: the picture begins to blur, the wordmark starts
 *                down from the header and the footer begins
 *   → 3.5        the footer's night has risen over the blurred picture, so
 *                the picture has no edge — it dissolves rather than leaves
 */
const SCREENS = 4.6;
const SPAN = SCREENS - 1;
/** A point in screens → the section's own 0→1, as `useBeat` measures it. */
const at = (s: number) => s / SPAN;

const OPEN = at(1.01);
const PANEL = { from: at(0.88), to: at(1.36) };
const MAP = { from: at(1.5), to: at(1.89) };
/** The heading builds itself across the panel's arrival. */
const HEAD_RUN = { from: at(0.95), to: at(1.5) };
const HEAD = ["Let’s make", "something", "together."];
/** The panel's climb, until the map's top is at the header. */
const RISE = { from: at(1.95), to: at(2.55) };
/** The hand-over. */
const HANDOFF = 2.55;

/**
 * How far the footer is pulled up over this section, in screens.
 *
 * `ContactFooter` maps the footer's top arriving at the top of the window to
 * its progress 0.222 (one lead-in screen of 4.5), and the wordmark's flight
 * starts at 0.24 — 0.08 of a screen later. So the footer's top has to sit at
 * `HANDOFF - 0.08` for the wordmark to leave the header at the hand-over.
 * Its night then rises over 0.233 → 0.451, ending at `DISSOLVED`.
 */
export const FOOTER_OVERLAP = SCREENS - (HANDOFF - (0.24 * 4.5 - 1));

export function ContactReveal() {
  const [ref, p] = useBeat();
  const reduced = useReducedMotion();

  /* How far the panel must climb for the map to reach the header: the map's
     top inside the panel, less the panel's top padding (header + breathing
     room). `offsetTop` ignores transforms, so it is the resting position. */
  const panelRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const climb = useMotionValue(0);
  useEffect(() => {
    const panel = panelRef.current;
    const map = mapRef.current;
    if (!panel || !map) return;
    const measure = () => {
      const pad = parseFloat(getComputedStyle(panel).paddingTop) || 0;
      climb.set(Math.max(0, map.offsetTop - pad));
    };
    measure();
    const sizes = new ResizeObserver(measure);
    sizes.observe(panel);
    return () => sizes.disconnect();
  }, [climb]);

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
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const narrow = window.matchMedia("(max-width: 700px)");
    const measure = () => {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const cw = (CARD.w * (narrow.matches ? 1.8 : 1) * window.innerWidth) / 100;
      frame.set({
        W,
        H,
        cw,
        ch: cw / CARD.ratio,
        cx: (CARD.left / 100) * W,
        cy: (CARD.top / 100) * H,
      });
    };
    measure();
    const sizes = new ResizeObserver(measure);
    sizes.observe(stage);
    narrow.addEventListener("change", measure);
    return () => {
      sizes.disconnect();
      narrow.removeEventListener("change", measure);
    };
  }, [frame]);

  /* 0 at the card, 1 at the full frame. */
  const grow = useTransform(p, [0, OPEN], [0, 1]);
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

  /* The tilt it lay at in the scatter, straightening as it opens. */
  const rotate = useTransform(p, [0, OPEN], [CARD.rot, 0]);
  /* Still drifting once the frame is full, so a finished zoom does not read as
     a static photograph. Starts at 1 so the first frame IS the card. */
  const scale = useTransform(p, [0, OPEN, 1], [1, 1, 1.08]);

  /* The blur is a second, pre-blurred copy faded in over the sharp one — an
     opacity change is composited, while animating `filter: blur()` on a
     full-screen picture re-rasterises it every frame. */
  const blur = useTransform(p, [at(HANDOFF), at(HANDOFF + 0.6)], [0, 1]);

  const scrim = useTransform(p, [OPEN * 0.6, OPEN], [0, 1]);
  /* In, and out again once the footer has the frame. */
  const panel = useTransform(
    p,
    [PANEL.from, PANEL.to, at(HANDOFF + 0.1), at(HANDOFF + 0.7)],
    [0, 1, 1, 0],
  );
  /* Settles into place, then climbs: the map to the header by the hand-over,
     and on at the same rate after it, the way a page scrolls. */
  const lift = useTransform(() => {
    const v = p.get();
    if (v <= PANEL.to) {
      const t = Math.max(0, (v - PANEL.from) / (PANEL.to - PANEL.from));
      return 26 * (1 - t);
    }
    if (v <= RISE.from) return 0;
    return (-climb.get() * (v - RISE.from)) / (RISE.to - RISE.from);
  });
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
                  rotate,
                  opacity: shown,
                }
          }
        >
          <m.div className="contact-reveal__shot" style={{ scale }}>
            <Image
              src={CARD.src}
              alt=""
              fill
              sizes="100vw"
              quality={90}
              className="contact-reveal__img"
            />
            {/* The hand-over's blur — see `blur` above. Small and soft is all
                a picture this blurred needs. */}
            <m.div
              className="contact-reveal__blur"
              style={{ opacity: blur }}
              aria-hidden
            >
              <Image
                src={CARD.src}
                alt=""
                fill
                sizes="40vw"
                quality={60}
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
          className="contact-section contact-reveal__panel"
          /* Static under reduced motion: the run-out would otherwise fade the
             panel away in a layout where nothing replaces it. */
          style={reduced ? undefined : { opacity: panel, y: lift }}
          id="contact-form"
          ref={panelRef}
        >
          <div className="contact-reveal__grid">
            {/* Column one — the information. */}
            <div className="contact-reveal__info">
              {/* Built letter by letter on scroll, the way /about's headings
                  arrive — same component, same motion. The breaks are the
                  ones the line already took at this size. */}
              <h2 id="reveal-head" className="hp-display contact-reveal__line">
                <ScrollChars lines={HEAD} progress={headIn} />
              </h2>

              <div className="contact-reveal__facts">
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

                {/* The number goes in `lib/contact.ts`; until then the slot
                    says so rather than printing a guess. */}
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

                <div>
                  <p className="label-xs contact-reveal__label">Socials</p>
                  <ul className="contact-reveal__social">
                    {SOCIAL.map((s) => (
                      <li key={s.label}>
                        <a href={s.href} target="_blank" rel="noreferrer">
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* THE MAP, arriving a beat after the panel it sits in.

                  It is a slot, not a map: there is no address anywhere in this
                  repo, and a located map cannot be invented — a wrong pin is
                  worse than an honest gap. With `CONTACT.cities` filled this
                  prints them over the plate; one constant completes it. */}
              <m.div
                ref={mapRef}
                className="contact-reveal__map"
                style={{ opacity: mapIn, y: mapLift }}
              >
                <p className="label-xs contact-reveal__label">Where we are</p>
                <div className="contact-reveal__plate">
                  {hasCities ? (
                    <ul className="label-xs contact-reveal__cities">
                      {CONTACT.cities.map((city) => (
                        <li key={city}>{city}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="label-xs contact-reveal__pending">
                      Studio address to come
                    </p>
                  )}
                </div>
              </m.div>
            </div>

            {/* Column two — the form, imported unchanged. */}
            <div className="contact-reveal__form">
              {/* A heading, in the display face — as a `label-xs` it read as
                  just another field label. */}
              <h3 className="hp-display contact-reveal__form-head">
                Shall we begin?
              </h3>
              <ContactForm bare />
            </div>
          </div>
        </m.div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  m,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { Work } from "@/lib/works";

/**
 * The last film in the index, lifted out of the grid and pushed to fullscreen.
 *
 * This is the closing transition: the index's final card stops being a card and
 * becomes the ground the call to action stands on. There is no wash and no
 * picture behind the lockup any more — the work itself is the backdrop, still
 * running.
 *
 * A true FLIP, not a `scale()`. Scaling a thumbnail up to fullscreen enlarges
 * whatever crop the thumbnail had, so the shot gets coarser as it grows and the
 * framing lurches when it lands. Here the clip is ALWAYS laid out at fullscreen
 * and cover-fitted to the window; what moves is a `clip-path` window opening
 * from the card's box to the viewport, with the picture inside counter-scaled so
 * that at every point of the run it is cover-fitted to the window as it stands.
 * The aspect ratio is therefore exact throughout — it never stretches — and the
 * picture genuinely enlarges rather than being blown up. That is the difference
 * between a card growing and a camera pushing in.
 *
 * Both halves are `transform` and `clip-path` on one promoted layer, so the
 * whole move is composited.
 *
 * (An earlier attempt at a FLIP on this page — the reel handing over to the
 * grid — was rejected and reverted. That one measured two live elements and
 * animated between them while both were moving. This measures ONE box, once, at
 * the moment the transition arms, and treats it as a constant from then on.)
 */

/* ---------------------------------------------------------------- timeline ---
   All of it rides `entry`, the closing progress the index is measured against —
   0 at the moment the last row reaches the top of the window, 1 well after. No
   state, no timers, no independent easing: every value below is a pure function
   of a scroll position, which is what makes the whole thing reversible for free.
   ---------------------------------------------------------------------------- */

/** The handover. Long enough to cover the cut from still card to running clip. */
const TAKE = 0.05;

/**
 * The push-in itself — longer than it was, so it is slower under the hand.
 *
 * Roughly five eighths of the run, and the run itself has been stretched again
 * (see `ENTRY.hold` and `RUNWAY`). Between them the push crosses from card to
 * full screen over about 1380px of scroll — a screen and a half — against 540
 * when this was first built. Two and a half times slower under the hand.
 */
const ZOOM = { from: 0.03, to: 0.66 };

/**
 * When the still hands over to the moving picture.
 *
 * Deliberately AFTER the handover from the card, not with it. The card shows a
 * poster; this layer opens on that same poster, at the same box, so the moment
 * the card is swapped for the layer there is nothing to see — not a crossfade
 * that mostly works, but the identical image in the identical place. The clip
 * then comes up over it while the window is already opening, so the frame
 * changing reads as the picture coming to life rather than as a cut.
 */
const CLIP = { from: 0.08, to: 0.2 };

/**
 * The focus pull — begun BEFORE the push finishes, not after it.
 *
 * At 0.49 the window is about 83% of the way across, so the picture is already
 * most of the screen and is softening as it completes rather than snapping to
 * fullscreen and only then going out of focus. That overlap is the difference
 * between one continuous move and three that take turns.
 *
 * It tops out at 0.85 rather than at 1. Running the ramp all the way to the end
 * meant the full strength existed only at the very last pixel of the travel —
 * the state the lockup is supposed to stand on was never actually held. The
 * last sixth of the run is now spent at full blur, with the type completing
 * over a background that has already settled.
 *
 * `brightness` and `saturate` come down with the blur rather than after it:
 * a 25px blur on its own keeps all of the picture's light and goes milky, and
 * lime type over milky grey is the one thing this lockup cannot afford.
 */
const BLUR = { from: 0.49, to: 0.85 };

/** The dark glass over it. Starts after the blur has begun to bite. */
const GLASS = { from: 0.57, to: 0.85 };

/**
 * The camera does not stop when the window does.
 *
 * A frame that arrives at fullscreen and then sits perfectly still reads as a
 * photograph the moment the blur starts; five per cent of continued drift over
 * the rest of the run is under the threshold of being noticed as movement and
 * over the threshold of being noticed as stillness.
 */
const PUSH = 1.05;

/**
 * The footer's ground, verbatim from `FOOTER_MOTION.night`.
 *
 * The clip is viewport-locked, so without this it would still be sitting there
 * behind the footer — and on the way back up, over everything above. It leaves
 * on exactly the stretch the work above it leaves on, so the two go together.
 */
const NIGHT = { start: 0.233, end: 0.451 };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Smoothstep. Symmetrical and gentle at both ends, which is what a scrubbed
    move wants — an aggressive ease reads as rubber under the reader's own hand. */
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Width of a clip of aspect `a` cover-fitted into a box. Its height follows. */
const coverWidth = (w: number, h: number, a: number) => Math.max(w, h * a);

export function WorkFinale({
  work,
  entry,
  progress,
  live,
}: {
  /** The last film the index is showing. */
  work: Work;
  /** The closing progress. Drives the whole transition. */
  entry: MotionValue<number>;
  /** The footer's beat. Only used to take this layer back off the screen. */
  progress: MotionValue<number>;
  /** The reader is within reach — mount the clip and let it buffer. */
  live: boolean;
}) {
  const reduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  /**
   * The clip can play.
   *
   * No longer a gate on the TRANSITION — only on the moving picture. It used
   * to hold the whole thing back, which meant a clip that was slow to buffer,
   * or failed outright, fell the page back to blurring the grid and setting
   * the lockup on top of it. That fallback was the bug: it is the one result
   * this closing sequence is not allowed to produce.
   *
   * The still is always there to open with, so the transition always runs. If
   * the clip never arrives, the last card's own frame is what goes fullscreen
   * and blurs — which is the same picture, just not moving.
   */
  const [ready, setReady] = useState(false);

  /**
   * The transition has run at least once — mount the media whatever `live` says.
   *
   * A backstop, not the mechanism. `live` is supposed to have mounted the film
   * several screens ago; if it has not, the alternative is lifting the card out
   * of the grid and putting nothing in its place, which is a black hole where
   * the picture should be. This makes that outcome impossible: the worst case
   * becomes a still that arrives a moment late instead of a hole.
   */
  const [armed, setArmed] = useState(false);

  const clip = useMotionValue("inset(0px)");
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const ms = useMotionValue(1);
  const take = useMotionValue(0);
  /** The moving picture, fading up over the still. */
  const clipIn = useMotionValue(0);

  /**
   * The card's box, measured ONCE — this is the "First" of the FLIP.
   *
   * Taken at the frame the transition arms and treated as a constant after
   * that. Re-reading it every frame would mean interpolating towards a moving
   * target: the grid is still scrolling underneath, so the window's origin
   * would crawl upwards during the push and the move would never sit still.
   * Cleared when the transition disarms, so scrolling back up and coming down
   * again measures afresh.
   */
  const from = useRef<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );
  /** The card we took the film out of, kept so it can be given back. */
  const lifted = useRef<HTMLElement | null>(null);
  const aspect = useRef(16 / 9);
  const running = useRef(false);

  const away = useTransform(progress, [NIGHT.start, NIGHT.end], [1, 0]);
  const opacity = useTransform([take, away], ([t, a]: number[]) => t * a);

  const glass = useTransform(entry, [GLASS.from, GLASS.to], [0, 1]);
  const glassOpacity = useTransform([glass, away], ([g, a]: number[]) => g * a);

  /* One filter chain rather than three properties: the compositor resolves a
     chain in a single pass, and `filter` is the only one of the three that is
     GPU-accelerated on a video when it stands alone. */
  const media = useTransform(
    entry,
    [BLUR.from, BLUR.to],
    [
      "blur(0px) brightness(1) saturate(1)",
      /* Deeper than the 25px/0.65/0.70 it was. The lockup sits on this, and at
         25 the picture still had enough detail in it to compete with the type
         for the eye. Far enough to read as atmosphere, not so far that it stops
         being recognisably the film that was just on screen. */
      "blur(34px) brightness(0.6) saturate(0.62)",
    ],
  );

  useEffect(() => {
    const give = () => {
      if (!lifted.current) return;
      lifted.current.style.opacity = "";
      lifted.current = null;
    };

    const run = (on: boolean) => {
      const el = videoRef.current;
      /* Reduced motion gets the clip's first frame and nothing else. A
         full-screen moving picture is the largest piece of motion on the page;
         it is not exempt from the setting just because it is a backdrop. */
      if (!el || reduced || on === running.current) return;
      running.current = on;
      if (on) void el.play().catch(() => {});
      else el.pause();
    };

    const update = () => {
      const p = entry.get();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      /* Disarmed — either the reader is still in the index, or they have
         scrolled back up into it. Both want the same thing: the card back, and
         a fresh measurement next time.

         Not gated on the clip any more — see `ready`. */
      if (p <= 0.0005) {
        give();
        from.current = null;
        take.set(0);
        clipIn.set(0);
        run(false);
        return;
      }

      if (!from.current) {
        const card = document.querySelector<HTMLElement>("[data-work-finale]");
        if (!card) return;

        const box = card.getBoundingClientRect();
        /* Not laid out, or relaid under us. No opinion — try again next pass
           rather than freeze a box of zeroes. */
        if (box.width < 1 || box.height < 1) return;

        from.current = {
          /* Held inside the window. With a "See more" button below the films
             the transition arms after the last card has already gone off the
             top, and a window opening from somewhere off-screen opens out of
             nothing. Clamped, it opens from the top edge instead. */
          x: Math.min(Math.max(box.left, 0), Math.max(0, vw - box.width)),
          y: Math.min(Math.max(box.top, 0), Math.max(0, vh - box.height)),
          w: box.width,
          h: box.height,
        };

        /* The film is in one place at a time. Hidden rather than unmounted:
           the card keeps its slot, its ground and its shadow in the grid, so
           the composition does not lose a cell as the picture leaves it. */
        card.style.opacity = "0";
        lifted.current = card;
        /* One-way. Never cleared on the way back up — once the film has been
           asked for, keep it mounted. */
        setArmed(true);
      }

      const f = from.current;
      const z = reduced
        ? 1
        : smooth(clamp01((p - ZOOM.from) / (ZOOM.to - ZOOM.from)));

      /* The window at this point of the run: the card's box at z = 0, the
         whole viewport at z = 1. */
      const wx = f.x * (1 - z);
      const wy = f.y * (1 - z);
      const ww = f.w + (vw - f.w) * z;
      const wh = f.h + (vh - f.h) * z;

      clip.set(
        `inset(${wy}px ${Math.max(0, vw - wx - ww)}px ${Math.max(
          0,
          vh - wy - wh,
        )}px ${wx}px)`,
      );

      /* And the picture cover-fitted to THAT window rather than to either end
         of the move. Both boxes hold the clip's own aspect ratio, so the two
         fits differ by a single uniform scale — which is why this can be one
         `scale` and a translation, with nothing stretched at any point. */
      const a = aspect.current;
      const drift = reduced
        ? 1
        : 1 + (PUSH - 1) * clamp01((p - ZOOM.to) / (1 - ZOOM.to));

      ms.set((coverWidth(ww, wh, a) / coverWidth(vw, vh, a)) * drift);
      mx.set(wx + ww / 2 - vw / 2);
      my.set(wy + wh / 2 - vh / 2);

      take.set(clamp01(p / TAKE));

      /* The clip comes up over the still, and starts running at the same
         moment — both scrubbed, so reversing takes it back down and pauses it
         again. */
      const over = ready ? clamp01((p - CLIP.from) / (CLIP.to - CLIP.from)) : 0;
      clipIn.set(over);
      run(over > 0 && progress.get() < NIGHT.end);
    };

    /* Subscribed to the two progress values rather than to `scroll`. They are
       both set from the page's one scroll listener, so this runs in the same
       pass — and never on a scroll that did not move either of them. */
    const stopEntry = entry.on("change", update);
    const stopFilm = progress.on("change", update);
    window.addEventListener("resize", update);
    update();

    return () => {
      stopEntry();
      stopFilm();
      window.removeEventListener("resize", update);
      give();
    };
  }, [entry, progress, reduced, ready, clip, mx, my, ms, take, clipIn]);

  return (
    <m.div className="work__finale" aria-hidden style={{ opacity }}>
      <m.div className="work__finale-window" style={{ clipPath: clip }}>
        {/* ONE transformed layer carrying both, so the still and the clip are
            geometrically identical at every point of the push and the focus
            pull resolves over the pair in a single pass. */}
        <m.div
          className="work__finale-media"
          style={{ x: mx, y: my, scale: ms, filter: media }}
        >
          {live || armed ? (
            <>
              {/* The card's own poster, at the card's own aspect. This is what
                  makes the handover invisible: the reader is looking at this
                  exact image, cover-fitted to that exact box, at the frame the
                  transition arms. */}
              <Image
                src={work.poster}
                alt=""
                fill
                sizes="100vw"
                quality={90}
                className="work__finale-frame object-cover"
                /* The aspect has to be right even when there is no clip to ask
                   — the index runs 16:9 and 9:16 side by side, and the
                   cover-fit arithmetic is wrong for the vertical cuts without
                   it. The still knows its own shape. */
                onLoad={(e) => {
                  const el = e.currentTarget;
                  if (el.naturalWidth > 0 && el.naturalHeight > 0)
                    aspect.current = el.naturalWidth / el.naturalHeight;
                }}
              />

              <m.video
                ref={videoRef}
                src={work.video}
                muted
                loop
                playsInline
                preload="auto"
                tabIndex={-1}
                className="work__finale-frame"
                onLoadedMetadata={(e) => {
                  const el = e.currentTarget;
                  if (el.videoWidth > 0 && el.videoHeight > 0)
                    aspect.current = el.videoWidth / el.videoHeight;
                }}
                /* A new last film means a new clip, and the old one's
                   readiness must not carry over to it. `loadstart` fires on
                   every source change. */
                onLoadStart={() => setReady(false)}
                onCanPlay={() => setReady(true)}
                style={{ opacity: clipIn }}
              />
            </>
          ) : null}
        </m.div>
      </m.div>

      {/* Over the blurred picture, not in front of the type: dark enough to
          carry lime and off-white, open enough that the film is still legibly
          the film. */}
      <m.div className="work__finale-glass" style={{ opacity: glassOpacity }} />
    </m.div>
  );
}

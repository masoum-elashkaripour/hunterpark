"use client";

import { useEffect, useRef } from "react";
import { LazyVideo } from "@/components/lazy-video";
import {
  m,
  useMotionValue,
  useReducedMotion,
  useMotionTemplate,
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

/**
 * The handover is INSTANT.
 *
 * It was 0.05 — a ramp long enough to cover the cut from a still card to a
 * running clip. There is no cut left to cover: the layer now opens on the same
 * clip, already playing, in a box that is the card's own box, so a fade over
 * that is not a crossfade between two pictures but a dip to nothing. The reader
 * watches the picture they are looking at go translucent and come back.
 *
 * Kept as a constant so a future clip can give itself a ramp again.
 */
const TAKE = 0;

/**
 * The push-in itself — longer than it was, so it is slower under the hand.
 *
 * Roughly five eighths of the run, and the run itself has been stretched again
 * (see `ENTRY.hold` and `RUNWAY`). Between them the push crosses from card to
 * full screen over about 1380px of scroll — a screen and a half — against 540
 * when this was first built. Two and a half times slower under the hand.
 */
/**
 * AND IT STARTS WHERE THE LAYER ARMS, not three hundredths later.
 *
 * It began at 0.03 while the layer arms at 0.0005, which left a span where the
 * fullscreen layer was visible and `z` was still pinned at zero — so the window
 * did not move at all while the page scrolled underneath it. Measured on the
 * about page's identical sequence: seventy-eight pixels of scroll with the box
 * frozen at (63, -79, 684, 456) while the step it replaced travelled on to
 * -148. A stall in motion, which the eye reads as the picture lurching.
 */
const ZOOM = { from: 0, to: 0.66 };

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

export function WorkFinale({
  work,
  entry,
  progress,
}: {
  /** The last film the index is showing. */
  work: Work;
  /** The closing progress. Drives the whole transition. */
  entry: MotionValue<number>;
  /** The footer's beat. Only used to take this layer back off the screen. */
  progress: MotionValue<number>;
  /** The reader is within reach — mount the clip and let it buffer. */
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

  const clip = useMotionValue("inset(0px)");
  const mx = useMotionValue(0);
  const mw = useMotionValue(0);
  const mh = useMotionValue(0);
  const my = useMotionValue(0);
  const ms = useMotionValue(1);
  const take = useMotionValue(0);
  /** The moving picture, fading up over the still. */

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

  /**
   * ONE FILTER CHAIN, AND ITS RADIUS IS QUANTISED.
   *
   * A chain rather than three properties: the compositor resolves a chain in a
   * single pass, and `filter` is the only one of the three that is
   * GPU-accelerated on a video when it stands alone.
   *
   * The quantising is what fixed the hitch. A Gaussian blur is not a composited
   * property — every distinct radius forces a full re-rasterisation of the
   * layer, and this layer is the whole viewport with a playing video in it.
   * Interpolated continuously, the push asked for a different radius on every
   * single frame, so the browser re-blurred a fullscreen video ninety times
   * across the move. Measured: frames of 226, 263 and 285ms, all of them inside
   * the stretch where the blur is growing, against an 89ms median — spikes, not
   * slowness, which is exactly what a hitch is.
   *
   * Rounded to 2px the radius takes seventeen distinct values instead of
   * ninety, so there are seventeen re-rasters and the rest are composites of a
   * layer that already exists. Two pixels of a thirty-four pixel blur is below
   * anything the eye resolves — on a shot that is also moving and already out
   * of focus, it is not a visible step, and `brightness` and `saturate` are
   * left continuous because neither costs a re-raster.
   */
  const radius = useTransform(entry, [BLUR.from, BLUR.to], [0, 34], {
    /* Snapped before it is read, not after — a value that never takes the
       in-between numbers cannot ask for the in-between rasters. */
    ease: (t) => Math.round(t * 17) / 17,
  });
  const shade = useTransform(entry, [BLUR.from, BLUR.to], [1, 0.6]);
  const tint = useTransform(entry, [BLUR.from, BLUR.to], [1, 0.62]);
  const media = useMotionTemplate`blur(${radius}px) brightness(${shade}) saturate(${tint})`;

  useEffect(() => {
    const show = (on: boolean) => {
      const el = layerEl.current;
      if (el) el.style.visibility = on ? "visible" : "hidden";
    };

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

         Nothing is gated on the clip: it is mounted and playing before the
         transition arms — see the media below. */
      if (p <= 0.0005) {
        give();
        from.current = null;
        take.set(0);
        run(false);
        /* Hidden only AFTER the card has been handed back, so the picture is
           never in neither place. */
        show(false);
        return;
      }

      /**
       * VISIBLE BEFORE THE CARD IS HIDDEN, in this same synchronous pass.
       *
       * Driving this from a subscriber on `opacity` put a frame boundary in the
       * middle of the hand-over — Motion batches value updates, so the card was
       * hidden now and the layer shown one frame later, leaving a frame with
       * the picture in neither place. That is the flash the reader sees as "it
       * fades, then starts zooming". See `AboutFinale`.
       */
      show(true);

      if (!from.current) {
        const card = document.querySelector<HTMLElement>("[data-work-finale]");
        if (!card) return;

        const box = card.getBoundingClientRect();
        /* Not laid out, or relaid under us. No opinion — try again next pass
           rather than freeze a box of zeroes. */
        if (box.width < 1 || box.height < 1) return;

        /**
         * THE BOX IS TAKEN WHERE THE CARD ACTUALLY IS — see `AboutFinale`,
         * which documents this in full.
         *
         * Both coordinates were clamped into the viewport so a window could
         * never open from off-screen and grow out of nothing. The guard is
         * right; applying it always was not. On `/about` the same clamp was
         * measured opening the window 112px away from the picture it replaces,
         * which is a visible jump on the one frame the FLIP exists to make
         * seamless. Clamped only when the card really has left the screen.
         */
        const offScreen = box.top + box.height <= 0 || box.top >= vh;
        from.current = {
          x: offScreen
            ? Math.min(Math.max(box.left, 0), Math.max(0, vw - box.width))
            : box.left,
          y: offScreen
            ? Math.min(Math.max(box.top, 0), Math.max(0, vh - box.height))
            : box.top,
          w: box.width,
          h: box.height,
        };

        /* The film is in one place at a time. Hidden rather than unmounted:
           the card keeps its slot, its ground and its shadow in the grid, so
           the composition does not lose a cell as the picture leaves it. */
        /**
         * HIDDEN A FRAME LATER, so the two OVERLAP instead of leaving a gap.
         *
         * `visibility` is written straight to the node and takes effect at
         * once, but this layer's OPACITY is a MotionValue and Motion commits
         * those on the next frame — so hiding the card in the same pass left
         * exactly one frame with the picture in neither place. Measured on
         * `/about`, which has the same hand-over: one blank frame, and it is
         * the flash seen just before the zoom starts.
         *
         * Deferring by a frame inverts the error into the harmless direction:
         * the picture is briefly in BOTH places, and since the layer's first
         * frame is pixel-identical to the card it replaces, an overlap is
         * invisible where a gap is not.
         */
        lifted.current = card;
        requestAnimationFrame(() => {
          if (lifted.current === card) card.style.opacity = "0";
        });
        /* One-way. Never cleared on the way back up — once the film has been
           asked for, keep it mounted. */
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

      /**
       * THE PICTURE'S BOX IS THE WINDOW — see `AboutFinale`, which documents
       * this in full and where it was measured.
       *
       * The old comment claimed "both boxes hold the clip's own aspect ratio".
       * They do not: the media box holds the VIEWPORT's, with `object-fit:
       * cover` cropping inside it, so a single uniform scale cannot reproduce
       * the card's crop once the window's aspect differs from the screen's.
       * Measured on `/about`, the window wanted 684x456 and the box came out
       * 810x420 — the picture clipped to 420 rows and the window asking for
       * 456, which is the shift seen as "it moves, then zooms".
       *
       * Given the window's own rect, `object-fit: cover` does exactly what it
       * does in the grid. `scale` carries the push alone.
       */
      const drift = reduced
        ? 1
        : 1 + (PUSH - 1) * clamp01((p - ZOOM.to) / (1 - ZOOM.to));

      mx.set(wx);
      my.set(wy);
      mw.set(ww);
      mh.set(wh);
      ms.set(drift);

      take.set(TAKE > 0 ? clamp01(p / TAKE) : 1);

      /* Running for as long as the layer is on screen. It no longer waits for
         a crossfade to begin, because there is no longer a crossfade: the clip
         is the only thing in the frame and it is already playing when the
         transition arms. Still scrubbed — reversing past the end pauses it. */
      run(p > 0 && progress.get() < NIGHT.end);
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
  }, [entry, progress, reduced, clip, mx, my, ms, take, mw, mh]);

  /**
   * AT ZERO IT IS NOT MERELY TRANSPARENT — IT STOPS BEING PAINTED.
   *
   * This layer is the full viewport, carries `will-change`, and holds a video
   * and a 34px blur. It is also at opacity 0 for almost the entire page:
   * measured across `/about`, it sits transparent at every scroll position
   * except the three screens of the closing. A transparent promoted layer is
   * not free — it is composited, and its texture is held, for the whole of that
   * time.
   *
   * WRITTEN AFTER MOUNT, NOT RENDERED. Expressing this as a `visibility` value
   * in `style` put it in the server's HTML, and the server starts at zero —
   * so the markup said `visibility: hidden` while React's first client render
   * did not emit the property at all, and hydration failed on the mismatch.
   * The hero's film has the same arrangement and does NOT mismatch, because its
   * value starts at 1 and both sides agree; that this one starts hidden is the
   * whole of the difference.
   *
   * Setting it on the node by hand sidesteps the question: the server renders
   * no `visibility`, the client adds one once it exists, and the subscription
   * keeps it right from then on.
   */
  const layerEl = useRef<HTMLDivElement | null>(null);

  return (
    <m.div
      className="work__finale"
      aria-hidden
      ref={layerEl}
      style={{ opacity }}
    >
      <m.div className="work__finale-window" style={{ clipPath: clip }}>
        {/* ONE transformed layer carrying both, so the still and the clip are
            geometrically identical at every point of the push and the focus
            pull resolves over the pair in a single pass. */}
        <m.div
          className="work__finale-media"
          style={{ left: mx, top: my, width: mw, height: mh, scale: ms }}
        >
          {/**
           * THE GRADE IS ITS OWN LAYER, and that split is the fix for the hitch.
           *
           * The transform and the filter used to sit on one element. A blur is
           * not a composited property — it has to be rasterised — and an element
           * that is BOTH blurred and transformed gets re-blurred on every frame
           * the transform moves it. This layer is the whole viewport, so the
           * push was re-running a 34px Gaussian across a full-screen video on
           * every frame of the way in and every frame of the way back.
           *
           * Measured at the blurred stretch: 114ms a frame as it stood, 44ms
           * with the filter removed entirely, and pausing the clip underneath
           * saved only 6 — so it was never the video, it was the blur being
           * asked for again and again.
           *
           * Split, the parent moves and this one blurs. A blurred raster can be
           * reused and simply composited as the parent travels, which is the one
           * thing a GPU does for free.
           */}
          <m.div className="work__finale-grade" style={{ filter: media }}>
            {/**
             * ONE ELEMENT, MOUNTED ALWAYS, AND NEVER FADED.
             *
             * This was a poster and a clip, mounted only once the closing was
             * near and cross-faded into each other as the clip became playable.
             * Three separate things then happened at the trigger, and the
             * reader saw all of them: the media MOUNTED (a real re-render, with
             * an image to decode and a video to open), the whole layer ramped
             * up from zero opacity over `TAKE`, and then the clip faded in over
             * the poster. That is the "it fades, or disappears and comes back,
             * or resets" — three causes, not one.
             *
             * None of them is needed now. `LazyVideo` fetches the clip as the
             * closing approaches, so it is already decoding and already playing
             * before the trigger; the layer is `visibility: hidden` until it is
             * wanted, so mounting unconditionally costs nothing; and the box
             * the picture sits in is now the window itself, so the first frame
             * is the card's frame by construction rather than by a fade long
             * enough to hide the difference.
             *
             * The poster stays as the element's own `poster` attribute — the
             * same still, in the one place that cannot cause a second element
             * to appear.
             */}
            <LazyVideo
              onReady={(el) => {
                videoRef.current = el;
              }}
              className="work__finale-frame object-cover"
              src={work.video}
              poster={work.poster}
              tabIndex={-1}
              onLoadedMetadata={(e) => {
                const el = e.currentTarget;
                if (el.videoWidth > 0 && el.videoHeight > 0)
                  aspect.current = el.videoWidth / el.videoHeight;
              }}
            />
          </m.div>
        </m.div>
      </m.div>

      {/* Over the blurred picture, not in front of the type: dark enough to
          carry lime and off-white, open enough that the film is still legibly
          the film. */}
      <m.div className="work__finale-glass" style={{ opacity: glassOpacity }} />
    </m.div>
  );
}

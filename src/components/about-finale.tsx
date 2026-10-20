"use client";

import { useLatePoster } from "@/components/use-late-poster";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { LazyVideo } from "@/components/lazy-video";
import {
  m,
  useMotionValue,
  useReducedMotion,
  useMotionTemplate,
  useTransform,
  type MotionValue,
} from "motion/react";

/**
 * The closing transition — the last capability picture taken to fullscreen.
 *
 * This is `WorkFinale` with the moving picture taken out. There the index's
 * last film is lifted off its card, zoomed to fill the window and pulled out of
 * focus for the lockup to stand on; here it is the third step of the staircase,
 * which is a still. Everything else is that component's, down to the numbers:
 * the same FLIP, the same cover-fit arithmetic, the same depth of blur, the
 * same glass — so the two pages close the same way, because they are the same
 * move.
 *
 * It is a true FLIP, not a scale-up of a thumbnail. A window is clipped out of
 * a full-screen layer and grown from the step's own box to the viewport, while
 * the picture inside it is cover-fitted to THAT window at every point. The
 * handover is invisible because the first frame of the transition is, pixel for
 * pixel, the picture the reader is already looking at.
 *
 * Reversible throughout: every value is read from scroll POSITION, so scrolling
 * back up puts the picture down in the staircase again.
 */

/**
 * The handover is INSTANT, and it has to be.
 *
 * `WorkFinale` fades its layer up over the first 5% of the run, because there
 * the thing being handed over is a video that may still be buffering. Here it
 * is a still, at the same `src` the step is already showing, so it is decoded
 * and in cache before it is asked for — and the layer's first frame is, by
 * construction, pixel-identical to the box it replaces.
 *
 * A fade over that is not a crossfade between two pictures, it is a dip to
 * nothing: the real step is hidden the moment the run arms, so for the length
 * of the fade the reader watches the picture they were looking at go
 * translucent against the page's black and come back. That is the "it
 * disappears" this is here to stop.
 */
const TAKE = 0;
/**
 * The zoom's own window on the run — AND IT STARTS WHERE THE LAYER ARMS.
 *
 * It began at 0.03, and the layer arms at 0.0005, which left a span where the
 * fullscreen layer was visible and `z` was still pinned at zero. The window is
 * computed from `z`, so for the whole of that span it did not move at all —
 * while the page carried on scrolling underneath it.
 *
 * Crawled two hundredths of a screen at a time through the hand-over: the step
 * travels normally to top -61, the layer arms and freezes its box at
 * (63, -79, 684, 456), and that box is still EXACTLY (63, -79, 684, 456) four
 * samples later, by which point the step it replaced would have reached -148.
 * Seventy-eight pixels of scroll with the picture nailed to the glass while
 * everything around it moves.
 *
 * That is the shake. Not a jump in position — a stall in motion, which the eye
 * reads as the picture lurching because it stops when nothing else does.
 *
 * From zero, the first armed frame is also the first frame of the zoom: the
 * window is the step's box exactly (z = 0, so it is pixel-identical, which is
 * the claim the FLIP makes) and it begins growing immediately. There is no
 * frame on which this layer exists and is not moving.
 */
const ZOOM = { from: 0, to: 0.66 };
/** The focus pull, which starts well after the frame has filled. */
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
 * The layer is viewport-locked, so without this it would still be sitting there
 * behind the footer — and on the way back up, over everything above it.
 */
const NIGHT = { start: 0.233, end: 0.451 };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Smoothstep. Symmetrical and gentle at both ends, which is what a scrubbed
    move wants — an aggressive ease reads as rubber under the reader's own hand. */
const smooth = (t: number) => t * t * (3 - 2 * t);

export function AboutFinale({
  src,
  video,
  entry,
  progress,
}: {
  /** The last step's picture — the same file the staircase is showing. */
  src: string;
  /** When the step is moving, the clip it is playing — see `Capability`. */
  video?: string;
  /** The closing progress. Drives the whole transition. */
  entry: MotionValue<number>;
  /** The footer's beat. Only used to take this layer back off the screen. */
  progress: MotionValue<number>;
}) {
  /* (its still held back from a phone's first load — see `useLatePoster`) */
  const latePoster = useLatePoster(video ? src : undefined);
  const reduced = useReducedMotion();

  const clip = useMotionValue("inset(0px)");
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const mw = useMotionValue(0);
  const mh = useMotionValue(0);
  const ms = useMotionValue(1);
  const take = useMotionValue(0);

  /**
   * The step's box, measured ONCE — this is the "First" of the FLIP.
   *
   * Taken at the frame the transition arms and treated as a constant after
   * that. Re-reading it every frame would mean interpolating towards a moving
   * target: the page is still scrolling underneath, so the window's origin
   * would crawl upwards during the push and the move would never sit still.
   * Cleared when the transition disarms, so scrolling back up and coming down
   * again measures afresh.
   */
  const from = useRef<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );
  /** The step we took the picture out of, kept so it can be given back. */
  const lifted = useRef<HTMLElement | null>(null);
  const layer = useRef<HTMLVideoElement | null>(null);
  const aspect = useRef(3 / 2);

  const away = useTransform(progress, [NIGHT.start, NIGHT.end], [1, 0]);
  const opacity = useTransform([take, away], ([t, a]: number[]) => t * a);

  const glass = useTransform(entry, [GLASS.from, GLASS.to], [0, 1]);
  const glassOpacity = useTransform([glass, away], ([g, a]: number[]) => g * a);

  /* One filter chain rather than three properties: the compositor resolves a
     chain in a single pass. */
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

    const update = () => {
      const p = entry.get();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      /* Disarmed — either the reader is still in the staircase, or they have
         scrolled back up into it. Both want the same thing: the step back, and
         a fresh measurement next time. */
      if (p <= 0.0005) {
        give();
        from.current = null;
        take.set(0);
        /* Hidden only AFTER the step has been handed back, so the picture is
           never in neither place. */
        show(false);
        return;
      }

      /**
       * VISIBLE BEFORE THE STEP IS HIDDEN, in this same synchronous pass.
       *
       * This used to be a separate subscriber on `opacity`. Motion batches
       * value updates to the next frame, so the order on the arming frame came
       * out as: hide the step now, make the layer visible one frame later —
       * and in between there was a frame with the picture in neither place.
       * That is the flash the reader sees as "it fades, then starts zooming".
       *
       * Written here it cannot happen: the layer is shown, then the step is
       * taken, with no frame boundary in between.
       */
      show(true);

      if (!from.current) {
        const step = document.querySelector<HTMLElement>("[data-about-finale]");
        if (!step) return;

        const box = step.getBoundingClientRect();
        /* Not laid out, or relaid under us. No opinion — try again next pass
           rather than freeze a box of zeroes. */
        if (box.width < 1 || box.height < 1) return;

        /**
         * THE BOX IS TAKEN WHERE THE STEP ACTUALLY IS.
         *
         * Both coordinates used to be clamped into the viewport, to stop a
         * window opening from somewhere off-screen and growing "out of
         * nothing". The guard was real but it was applied always, and it is
         * what made the start of the zoom jump.
         *
         * The sequence is timed off the step's WORDS — deliberately, because
         * timing it off the frame started the push while the title was still
         * mid-screen. The words are centred against a frame two and a half
         * times their height, so by the time they reach the header the frame's
         * top has already passed it: measured at the arming frame, the step sat
         * at top −112px while the clamp opened the window at 0. A hundred and
         * twelve pixels of vertical jump, on the one frame this transition
         * exists to make seamless.
         *
         * Unclamped, the window opens exactly where the picture is and the
         * first frame is pixel-identical again — which is the whole claim the
         * FLIP makes. The original worry only applies when the step is
         * ENTIRELY above the fold, and that case is still handled, below.
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

        /* The picture is in one place at a time. Hidden rather than unmounted:
           the step keeps its slot in the staircase, so the chain's geometry and
           the run's length do not change under the reader mid-transition. */
        /**
         * HIDDEN A FRAME LATER, so the two OVERLAP instead of leaving a gap.
         *
         * `visibility` above is written straight to the node and takes effect
         * at once, but this layer's OPACITY is a MotionValue and Motion commits
         * those on the next frame. Hiding the step in the same pass therefore
         * produced exactly one frame with the picture in neither place —
         * crawled two pixels at a time through the hand-over, one blank frame
         * at 15.547, which is the flash the reader sees before the zoom starts.
         *
         * Deferring by a frame inverts the error into the harmless direction:
         * for one frame the picture is in BOTH places, and since the layer's
         * first frame is pixel-identical to the step it replaces — the whole
         * claim this FLIP makes — an overlap is invisible where a gap is not.
         *
         * `lifted` is set immediately regardless, so scrolling back out still
         * hands it back even if the frame never arrives.
         */
        lifted.current = step;
        requestAnimationFrame(() => {
          if (lifted.current === step) step.style.opacity = "0";
        });
      }

      const f = from.current;
      const z = reduced
        ? 1
        : smooth(clamp01((p - ZOOM.from) / (ZOOM.to - ZOOM.from)));

      /* The window at this point of the run: the step's box at z = 0, the whole
         viewport at z = 1. */
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
       * THE PICTURE'S BOX IS THE WINDOW, not a scaled copy of the viewport.
       *
       * This used to hold the media at viewport size and shrink it with one
       * uniform `scale`, on the stated reasoning that "both boxes hold the
       * picture's own aspect ratio, so the two fits differ by a single uniform
       * scale". The media box does NOT hold the picture's aspect — it holds the
       * VIEWPORT's, with `object-fit: cover` cropping the picture inside it.
       *
       * What that cost, measured at the hand-over: the window was 684x456 and
       * the media box came out 810x420, so `cover` clipped the picture to 420
       * rows and the window then asked for 456. Diffed against the step at the
       * same scroll position, 2076 sampled pixels differed across the whole
       * picture — which is the shift the reader sees as "it moves left, then
       * zooms".
       *
       * No uniform scale of a viewport-shaped box can reproduce the step's crop
       * once the window's aspect differs from the viewport's. So the box is
       * given the window's own rect and `object-fit: cover` does exactly what it
       * does in the staircase — the same element geometry, therefore the same
       * crop, by construction rather than by arithmetic.
       *
       * `scale` is left carrying the push alone, which is a true uniform zoom
       * on an already-correct box.
       */
      const drift = reduced
        ? 1
        : 1 + (PUSH - 1) * clamp01((p - ZOOM.to) / (1 - ZOOM.to));

      mx.set(wx);
      my.set(wy);
      mw.set(ww);
      mh.set(wh);
      ms.set(drift);

      /* `TAKE` is 0 — opaque from the first frame of the run, see above. Kept
         as an expression so a future clip can give itself a ramp again. */
      take.set(TAKE > 0 ? clamp01(p / TAKE) : 1);
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
  }, [entry, progress, reduced, clip, mx, my, mw, mh, ms, take]);

  /**
   * THE SAME PLAYHEAD, NOT A SECOND ONE.
   *
   * Two `<video>` elements on one file do not play in step: each starts when it
   * is mounted and they drift by however far apart those moments were. Left
   * alone, the picture the reader is watching would be replaced, at the instant
   * the zoom arms, by the same clip at a different second — a jump cut on the
   * one frame this sequence exists to make seamless, and the moving equivalent
   * of the "it disappears" that `TAKE` is set to 0 to prevent.
   *
   * So the layer is handed the step's position the moment it takes over: one
   * assignment, at the transition, from the element the staircase marked. After
   * that both simply run, and the half-second of drift they could accumulate
   * across the zoom is spent under a 40px blur.
   *
   * Nothing here ever pauses — not on arming, not on leaving. The brief is that
   * it keeps playing, and the simplest way to guarantee that is to have no code
   * anywhere that can stop it.
   */
  useEffect(() => {
    if (!video) return;

    let armed = false;
    const sync = () => {
      const el = layer.current;
      const source = document.querySelector<HTMLVideoElement>(
        "[data-about-finale-video]",
      );
      if (!el) return;

      /**
       * ONLY IF THE DRIFT IS WORTH A SEEK — measured, because the obvious
       * version made things worse.
       *
       * Assigning `currentTime` is a seek, and a seek stalls playback while it
       * resolves. Both elements mount within a frame of each other and run at
       * the same rate, so they were already within 0.09s at the handover;
       * seeking anyway cost about half a second of stall and opened the gap to
       * 0.70s. The correction was the biggest source of the error it existed to
       * remove.
       *
       * A quarter-second is under two frames of eye-noticeable difference on a
       * shot like this and well under what a seek costs. Below it, leave the
       * clip alone; above it something has genuinely diverged — a backgrounded
       * tab, a stalled buffer — and a seek is then the cheaper of the two.
       */
      const here = el.currentTime;
      const there = source?.currentTime;
      if (
        source &&
        Number.isFinite(there) &&
        Math.abs(here - (there as number)) > 0.25
      )
        el.currentTime = there as number;
      /* Autoplay can be refused before the reader has interacted; asking again
         here costs nothing and recovers it. A rejection is not an error worth
         propagating — the poster is the step's own frame either way. */
      void el.play().catch(() => {});
    };

    const read = (v: number) => {
      const now = v > 0;
      if (now === armed) return;
      armed = now;
      /* Both directions: scrubbing back up disarms, and the next arming picks
         the playhead up again rather than resuming from wherever it drifted. */
      if (now) sync();
    };

    read(entry.get());
    return entry.on("change", read);
  }, [entry, video]);

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
            {video ? (
              <LazyVideo
                onReady={(el) => {
                  layer.current = el;
                }}
                className="work__finale-frame object-cover"
                src={video}
                poster={latePoster}
                /* The cover arithmetic needs the clip's real shape, the same way
                 the still path reads it off the file. */
                onLoadedMetadata={(e) => {
                  const el = e.currentTarget;
                  if (el.videoWidth > 0 && el.videoHeight > 0)
                    aspect.current = el.videoWidth / el.videoHeight;
                }}
              />
            ) : (
              <Image
                src={src}
                alt=""
                fill
                /**
                 * THE STEP'S OWN `sizes`, not `100vw`, and that is deliberate.
                 *
                 * `next/image` picks a file from the srcset by this string, so a
                 * different one here is a different URL and therefore a second
                 * download. On a wide screen both happened to resolve to the same
                 * entry and the handover was seamless by luck; on a phone 92vw and
                 * 100vw pick different widths, and the layer would open on a file
                 * the browser had not fetched — a frame of nothing, then the
                 * picture, which reads as the image changing before it zooms.
                 *
                 * Matching it makes the handover a cache hit by construction. The
                 * cost is that a fullscreen layer is fed a half-width file, and it
                 * is the right trade: this picture is pulled out of focus before it
                 * is large, so there is no detail to lose and everything to gain
                 * from the first frame being identical.
                 */
                sizes="(max-width: 767px) 92vw, 46vw"
                quality={90}
                className="work__finale-frame object-cover"
                /* The cover-fit arithmetic needs the picture's real shape, not the
               3:2 the staircase happens to crop it to. The file knows it. */
                onLoad={(e) => {
                  const el = e.currentTarget;
                  if (el.naturalWidth > 0 && el.naturalHeight > 0)
                    aspect.current = el.naturalWidth / el.naturalHeight;
                }}
              />
            )}
          </m.div>
        </m.div>
      </m.div>

      {/* Over the blurred picture, not in front of the type: dark enough to
          carry lime and off-white, open enough that the picture is still
          legibly the picture. */}
      <m.div className="work__finale-glass" style={{ opacity: glassOpacity }} />
    </m.div>
  );
}

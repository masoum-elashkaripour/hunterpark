"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { animate, m, useMotionValue, useReducedMotion } from "motion/react";

/**
 * Opening a film: the card grows to fill the screen, the page loads behind it,
 * and the picture settles into its place on the project page.
 *
 * This REPLACES the `<ViewTransition share="morph">` pairing that used to sit on
 * the tiles and the project hero. Two reasons it had to go:
 *
 * 1. It cannot work from the reel. The carousel on the way into this page is a
 *    WebGL canvas — its cards are not elements, so there is nothing for the
 *    browser to take a snapshot of and nothing to name. Half of "click any film
 *    and it should grow" was unreachable by construction.
 * 2. It was not running. Reported twice as an instant cut, and a browser-owned
 *    transition gives you nothing to inspect when it declines: no callback, no
 *    state, no way to tell a skipped capture from a fast one.
 *
 * What is here instead is ordinary: a fixed layer, a rect, and two tweens. It
 * runs the same way from a grid tile, from the related rail and from the reel,
 * and every stage of it can be reasoned about.
 *
 * THE OVERLAY NEVER TAKES THE POINTER, and there is a hard failsafe that clears
 * it whatever happens. A launch layer that gets stuck is a page the reader
 * cannot use; this one, stuck, is at worst a picture they can scroll behind.
 */

const RISE = 0.75;
const SETTLE = 0.85;
const OUT = 0.35;

/** In-out for the rise — it is a journey between two known boxes. */
const EASE_RISE: [number, number, number, number] = [0.65, 0, 0.35, 1];
/** The site's own settle curve. */
const EASE_OUT: [number, number, number, number] = [0.19, 1, 0.22, 1];

/** Longest the destination gets to produce its frame before we give up on it. */
const WAIT_MS = 1500;
/** Whatever happens, the layer is gone by now. */
const FAILSAFE_MS = 4000;

type Box = { x: number; y: number; w: number; h: number };
type Shot = { poster: string; from: Box; aspect: number };

type LaunchFn = (opts: {
  href: string;
  poster: string;
  /** The card's box. Omit from the reel, which has no element to measure. */
  rect?: DOMRect | null;
  aspect?: number;
}) => void;

const LaunchContext = createContext<LaunchFn | null>(null);

/**
 * Call to open a film with the transition. Falls back to a plain push if the
 * provider is missing or the reader has asked for reduced motion.
 */
export function useLaunch() {
  return useContext(LaunchContext);
}

const coverWidth = (w: number, h: number, a: number) => Math.max(w, h * a);

export function LaunchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const reduced = useReducedMotion();

  const [shot, setShot] = useState<Shot | null>(null);

  /** 1 = filling the screen, 0 = sitting in `from`. */
  const t = useMotionValue(0);
  const fade = useMotionValue(0);
  const clip = useMotionValue("inset(0px)");
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const ms = useMotionValue(1);

  /* Read inside the subscription rather than closed over, so the settle can
     swap the box the interpolation runs against without re-subscribing. */
  const from = useRef<Box | null>(null);
  const aspect = useRef(16 / 9);

  /**
   * The geometry, identical in shape to the closing transition's.
   *
   * The picture is always laid out at full screen and cover-fitted; what moves
   * is a `clip-path` window between `from` and the viewport, with the picture
   * counter-scaled so that at every point it is cover-fitted to the window as
   * it stands. Aspect is therefore exact throughout and nothing stretches.
   */
  useEffect(() => {
    const paint = () => {
      const f = from.current;
      if (!f) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const z = t.get();

      const wx = f.x * (1 - z);
      const wy = f.y * (1 - z);
      const ww = f.w + (vw - f.w) * z;
      const wh = f.h + (vh - f.h) * z;

      clip.set(
        `inset(${Math.max(0, wy)}px ${Math.max(0, vw - wx - ww)}px ${Math.max(
          0,
          vh - wy - wh,
        )}px ${Math.max(0, wx)}px)`,
      );

      const a = aspect.current;
      ms.set(coverWidth(ww, wh, a) / coverWidth(vw, vh, a));
      mx.set(wx + ww / 2 - vw / 2);
      my.set(wy + wh / 2 - vh / 2);
    };

    paint();
    const stop = t.on("change", paint);
    window.addEventListener("resize", paint);
    return () => {
      stop();
      window.removeEventListener("resize", paint);
    };
  }, [t, clip, mx, my, ms]);

  const launch = useCallback<LaunchFn>(
    ({ href, poster, rect, aspect: a }) => {
      if (reduced) {
        router.push(href);
        return;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      /* The reel has no element to measure — it is a canvas. A centred box of
         roughly a card's proportions gives the same move from the same place
         the reader was looking. */
      const box: Box = rect
        ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
        : {
            w: vw * 0.62,
            h: vw * 0.62 * (9 / 16),
            x: vw * 0.19,
            y: vh / 2 - (vw * 0.62 * (9 / 16)) / 2,
          };

      from.current = box;
      aspect.current = a ?? 16 / 9;
      t.jump(0);
      fade.jump(1);
      setShot({ poster, from: box, aspect: aspect.current });

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        void animate(fade, 0, { duration: OUT, ease: EASE_OUT }).then(() => {
          setShot(null);
          from.current = null;
        });
      };

      /* Whatever else happens — a route that never resolves, a hero that never
         renders, a navigation the reader interrupts — this layer comes off. */
      const failsafe = window.setTimeout(finish, FAILSAFE_MS);

      void animate(t, 1, { duration: RISE, ease: EASE_RISE }).then(() => {
        router.push(href);

        /* Wait for the project page to put its film on screen, then bring the
           picture down onto it. Polled by frame rather than by timer: the
           destination is statically rendered and usually arrives within one. */
        const started = performance.now();
        const look = () => {
          if (done) return;

          const el = document.querySelector<HTMLElement>(
            "[data-launch-target]",
          );
          const box2 = el?.getBoundingClientRect();

          if (box2 && box2.width > 1 && box2.height > 1) {
            from.current = {
              x: box2.left,
              y: box2.top,
              w: box2.width,
              h: box2.height,
            };
            window.clearTimeout(failsafe);
            void animate(t, 0, { duration: SETTLE, ease: EASE_OUT }).then(
              finish,
            );
            return;
          }

          if (performance.now() - started > WAIT_MS) {
            window.clearTimeout(failsafe);
            finish();
            return;
          }
          requestAnimationFrame(look);
        };
        requestAnimationFrame(look);
      });
    },
    [reduced, router, t, fade],
  );

  return (
    <LaunchContext.Provider value={launch}>
      {children}

      {shot ? (
        <m.div className="work-launch" aria-hidden style={{ opacity: fade }}>
          <m.div className="work-launch__window" style={{ clipPath: clip }}>
            <m.div
              className="work-launch__media"
              style={{ x: mx, y: my, scale: ms }}
            >
              <Image
                src={shot.poster}
                alt=""
                fill
                sizes="100vw"
                quality={90}
                priority
                className="object-cover"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth > 0 && img.naturalHeight > 0)
                    aspect.current = img.naturalWidth / img.naturalHeight;
                }}
              />
            </m.div>
          </m.div>
        </m.div>
      ) : null}
    </LaunchContext.Provider>
  );
}

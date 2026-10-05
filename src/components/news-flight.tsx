"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  m,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
} from "motion/react";
import { useScrollY } from "@/components/use-beat";

/**
 * The featured story's picture, flown from the opening into its own box.
 *
 * It starts beside the hero's title (the `[data-flight-from]` slot) and, from
 * the first pixel of scroll, comes down the page into the featured section's
 * picture box (`[data-flight-to]`), easing as it arrives and taking that box's
 * size on the way. Scrubbed: stop and it stops, scroll back and it
 * flies back.
 *
 * THE HERO SLOT HAS ITS OWN COPY, server-rendered, so the picture is there on
 * first paint and arrives with the rest of the opening. This element stays
 * invisible while the page is at its top — exactly over that copy — and takes
 * over on the first pixel of scroll (`data-flight-moving` hides the copy), so
 * there is no moment before hydration with an empty slot, and no visible swap.
 * All three (slot, flight, featured box) ask for the same file at the same
 * `sizes`, so the browser downloads it once.
 *
 * ONE element, moved by `transform` only. Both slots have the picture's own
 * ratio, so the box is the destination's size throughout and the start is a
 * `scale` of it — no width/height animated, no layout per frame. Both slots
 * are measured once in the page's coordinates (and again on resize or when
 * the page's height changes), so each scroll tick is arithmetic.
 *
 * Desktop and motion only. Elsewhere — under 1024px, reduced motion, or
 * before this has hydrated — the page carries no `data-flight-on`, the hero
 * slot is not drawn, and the featured box shows its own copy of the picture.
 */

type Box = { x: number; y: number; w: number; h: number };

/** Shared by the slot, the flight and the featured box — one download. */
export const FLIGHT_SIZES = "(max-width: 1023px) 100vw, 58vw";

/**
 * easeOutSine: it leaves at once — an in-out curve sat still for the first
 * notches of the wheel and read as a stall — but at half the speed the cubic
 * set off at, and it eases into the box over a long, soft tail.
 */
const ease = (t: number) => Math.sin((t * Math.PI) / 2);

/** Where the box is on screen when the picture lands: just under the header. */
const LAND_AT = 0.16;

export function NewsFlight({
  src,
  href,
}: {
  src: string;
  href: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const scrollY = useScrollY();
  const frame = useMotionValue<{ from: Box; to: Box } | null>(null);
  const shown = useMotionValue(0);

  useEffect(() => {
    const el = ref.current;
    const page = el?.closest<HTMLElement>(".news-page");
    const from = page?.querySelector<HTMLElement>("[data-flight-from]");
    const to = page?.querySelector<HTMLElement>("[data-flight-to]");
    if (!el || !page || !from || !to) return;

    const wanted = window.matchMedia(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
    );

    const measure = () => {
      if (!wanted.matches) {
        page.removeAttribute("data-flight-on");
        frame.set(null);
        shown.set(0);
        return;
      }
      /* Set first: the hero slot only takes up room while the flight is on. */
      page.setAttribute("data-flight-on", "");
      const origin = page.getBoundingClientRect();
      const box = (node: HTMLElement): Box => {
        const r = node.getBoundingClientRect();
        return {
          x: r.left - origin.left,
          y: r.top - origin.top,
          w: r.width,
          h: r.height,
        };
      };
      const target = box(to);
      /* The box's size is the destination's, written straight onto the
         element when measured. It is static — only a resize changes it — and
         handed to Motion as a style value it was never applied: the picture
         sat at 0×0, moving correctly and invisibly. */
      el.style.width = `${target.w}px`;
      el.style.height = `${target.h}px`;
      frame.set({ from: box(from), to: target });
      shown.set(1);
    };

    measure();
    const sizes = new ResizeObserver(measure);
    sizes.observe(page);
    wanted.addEventListener("change", measure);
    return () => {
      sizes.disconnect();
      wanted.removeEventListener("change", measure);
      page.removeAttribute("data-flight-on");
      page.removeAttribute("data-flight-moving");
    };
  }, [frame, shown]);

  /* 0 at the top of the page, 1 once the box has come up to where the hero
     slot was on screen — so the picture lands at the height it left from. */
  /*
   * EVERY VALUE IS READ BEFORE ANY EARLY RETURN, in each of these. A function
   * `useTransform` subscribes to the MotionValues it reads on its FIRST run,
   * and on that run nothing is measured yet — so a `return` before reading
   * the scroll left the flight subscribed to nothing, and it never moved.
   */
  /* 0 at the top, 1 when the box has come up to just under the header — a
     longer run than "back to where the slot was", so the flight is slower. */
  const target = useTransform(() => {
    const f = frame.get();
    const sy = scrollY.get();
    if (!f) return 1;
    const vh = typeof window === "undefined" ? 0 : window.innerHeight;
    const span = f.to.y - vh * LAND_AT;
    if (span <= 0) return 1;
    return ease(Math.min(1, Math.max(0, sy / span)));
  });
  /* …followed through a soft spring, so the picture trails the wheel and
     glides rather than stepping with each notch of it. */
  const t = useSpring(target, {
    stiffness: 70,
    damping: 22,
    mass: 1,
    restDelta: 0.0005,
  });

  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  const x = useTransform(() => {
    const f = frame.get();
    const k = t.get();
    if (!f) return 0;
    const cx = lerp(f.from.x + f.from.w / 2, f.to.x + f.to.w / 2, k);
    return cx - f.to.w / 2;
  });
  const y = useTransform(() => {
    const f = frame.get();
    const k = t.get();
    if (!f) return 0;
    const cy = lerp(f.from.y + f.from.h / 2, f.to.y + f.to.h / 2, k);
    return cy - f.to.h / 2;
  });
  const scale = useTransform(() => {
    const f = frame.get();
    const k = t.get();
    if (!f) return 1;
    return lerp(f.from.w / f.to.w, 1, k);
  });
  /* Invisible at rest (the slot's own copy is showing), drawn once moving. */
  /* Handed over from the slot's copy once it has visibly left — a hair above
     zero, because a spring settles toward 0 rather than landing on it. */
  const opacity = useTransform(() => {
    const on = shown.get();
    const k = t.get();
    return on > 0 && k > 0.001 ? 1 : 0;
  });
  useMotionValueEvent(t, "change", (v) => {
    ref.current
      ?.closest(".news-page")
      ?.toggleAttribute("data-flight-moving", v > 0.001 && shown.get() > 0);
  });

  return (
    <m.a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={-1}
      aria-hidden
      className="news-flight"
      style={{ x, y, scale, opacity }}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes={FLIGHT_SIZES}
        quality={90}
        priority
      />
    </m.a>
  );
}

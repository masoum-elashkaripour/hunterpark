"use client";

import { m, useTransform, type MotionValue } from "motion/react";
import { type Shot } from "@/components/talent-stack";

/**
 * The room the Talent chapter is lit in, and it is lit by the picture on screen.
 *
 * A field behind the whole act, built out of the colours of the portrait
 * currently turned to face the reader. When the stack flips, the room changes
 * temperature with it — teal to rust to crimson — so the section reads as
 * breathing with its subject rather than as a dark page that pictures happen to
 * sit on.
 *
 * THE PALETTES ARE NOT READ AT RUNTIME. Every colour here was taken off the
 * actual JPEG ahead of time, quantised, and written down beside the shot it
 * belongs to — see `SHOTS` in `AboutStudio`. Pulling them in the browser would
 * mean a canvas per portrait, six decodes the page does not otherwise need, and
 * a first frame with no colour in it at all while the work happens. Extracting
 * once, at the point the pictures were chosen, is the same answer arrived at
 * before anyone is looking, which is the strongest form of the cache the brief
 * asks for: there is no runtime cost to amortise.
 *
 * They are also TEMPERED rather than used raw. The hue is the image's; the
 * saturation and lightness are the page's. Raw dominant colours off these
 * frames include a 0.89-saturation magenta and a near-white; dropped in behind
 * type they would be a backdrop competing for the eye instead of a mood behind
 * it. What survives tempering is the thing worth keeping, which is the hue.
 *
 * THE TEMPERING WAS TOO HEAVY AND HAS BEEN LIFTED. At the first setting the
 * brightest colour here was 1.60:1 against the ground (#0d0d0d) and the dimmest
 * 1.25:1 — a span of a third of a stop across the whole act, which is why the
 * room looked like one dark page rather than six. Worse, the first two accents
 * came out #173a3d and #173b3d: a single step apart in one channel, so the
 * change the section exists to show was not there to see.
 *
 * Saturation and lightness were scaled (x1.55 and x1.5, capped at 0.66 and
 * 0.235) and the hues left exactly as the photographs gave them, so what grew
 * is the visibility of a difference that was always in the data. The brightest
 * is now 2.63:1 and the teals, the rust and the crimsons separate. Still well
 * under anything that would read as a lit panel behind the type — the ceiling
 * was chosen by measurement, not by eye: 4.23:1 was reachable and is where a
 * backdrop starts competing with what is written on it.
 */

/** A shot's three colours: the field, what lights it, and where it travels to. */
export type Aura = { base: string; accent: string; far: string };

/**
 * ONE LAYER PER PORTRAIT, AND ONLY `opacity` MOVES.
 *
 * This was briefly built the other way round — a single layer whose gradient
 * COLOURS were interpolated — on the theory that one layer must be cheaper than
 * six. It is not, and the reason is the whole point of this file:
 *
 *   `opacity` is a COMPOSITED property. A layer whose opacity changes is
 *   rasterised once and then re-blended, which is work the GPU does for free.
 *   A gradient whose colour stops change is a NEW IMAGE every frame, so the
 *   whole viewport is re-painted on every scroll tick.
 *
 * Six cached rasters that cross-fade therefore beat one that is redrawn
 * continuously, however counter-intuitive the layer count makes that sound.
 *
 * It was also, as written, simply wrong: Motion interpolates a hex colour into
 * an `rgba()` string, so the `${accent}99` alpha suffixes this file used to
 * build its mid-stops produced `rgba(23, 58, 61, 1)99` — not a colour, so not a
 * gradient, so `background-image: none`. The room was painting NOTHING, and the
 * cost it appeared to have saved was the cost of drawing nothing. Static
 * declarations cannot have that bug: the suffixes are concatenated onto literal
 * hex at build time, where they mean what they say.
 *
 * NOTHING LEAVES, which is the stack's rule too. A layer fades up and stays;
 * the next fades up ON TOP of it. Closing the old one while opening the new puts
 * both at part strength at the midpoint, and the midpoint is exactly where a dip
 * in the light would be seen.
 */

/**
 * How much of the act one room takes to replace the last.
 *
 * Most of a stage, deliberately. The portrait it belongs to opens in about half
 * that time, so the light is still arriving after the picture has — which is the
 * order it happens in a room, where the lamp is seen before the wall it lights.
 */
const FADE = 0.075;

/**
 * Three radial fields, not a flat colour and not a linear ramp.
 *
 * Two off-centre pools of light — the accent high and left, where the portrait
 * stands, and the far hue low and right under the list — over one broad wash of
 * the dominant. Off-centre and different sizes on purpose: a centred gradient
 * reads as a vignette, which is a photographic effect and looks applied. Light
 * falling from somewhere just outside the frame is what a room looks like.
 *
 * THE MID-STOPS ARE WHAT REPLACED THE BLUR. There used to be a
 * `blur(clamp(60px, 7vw, 110px))` over this, to soften the seams between the
 * three pools. Each pool falls off through a mid-stop now — a curve rather than
 * a ramp — so there are no seams to soften and no long flat stretch for 8-bit
 * banding to show up in. See the note on the CSS rule for what that blur cost.
 */
const field = ({ base, accent, far }: Aura) =>
  [
    `radial-gradient(92% 86% at 20% 26%, ${accent} 0%, ${accent}99 34%, ${accent}00 76%)`,
    `radial-gradient(86% 92% at 82% 74%, ${far} 0%, ${far}99 36%, ${far}00 78%)`,
    `radial-gradient(125% 115% at 50% 50%, ${base} 0%, ${base}aa 46%, ${base}00 100%)`,
  ].join(", ");

/** One room, fading up over the one before it. */
function Room({
  aura,
  at,
  first,
  progress,
}: {
  aura: Aura;
  /** Where this room is fully up, on the chapter's own 0→1. */
  at: number;
  /** The first is the light the rest arrive over — always up. */
  first: boolean;
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(progress, [at - FADE, at], [0, 1]);
  return (
    <m.div
      className="talent-aura__layer"
      style={{
        background: field(aura),
        ...(first ? undefined : { opacity }),
      }}
    />
  );
}

export function TalentAura({
  shots,
  bounds,
  progress,
  presence,
}: {
  /** The same array the stack is given, so the two cannot describe different
      pictures — a shot carries its own colours. */
  shots: (Shot & { aura?: Aura })[];
  /** The same stage edges, for the same reason. */
  bounds: number[];
  progress: MotionValue<number>;
  /**
   * The act's own arrival and departure.
   *
   * Without it the room would be lit through the chapter either side of this
   * one: the studio's founders would sit in the first portrait's teal, and the
   * staircase would open in the last one's rust. The light belongs to the act,
   * so it comes and goes with it.
   */
  presence: MotionValue<number>;
}) {
  /* Each palette pinned to the moment its portrait takes the frame. */
  const rooms = shots
    .map((shot, i) => ({ at: bounds[i], aura: shot.aura }))
    .filter((r): r is { at: number; aura: Aura } => !!r.aura);
  if (!rooms.length) return null;

  return (
    <m.div className="talent-aura" style={{ opacity: presence }} aria-hidden>
      {rooms.map((room, i) => (
        <Room
          key={room.at}
          aura={room.aura}
          at={room.at}
          first={i === 0}
          progress={progress}
        />
      ))}
    </m.div>
  );
}

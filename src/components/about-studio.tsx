"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { m, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import {
  PLAY_SECONDS_PER_SCREEN,
  carryTo,
  compressHolds,
  useBeat,
  useEnter,
  useGated,
  usePlayMode,
  type Cue,
} from "@/components/use-beat";
import { ScrollChars } from "@/components/scroll-chars";
import { ScrollMorph } from "@/components/scroll-morph";
import { TalentStack, REVEAL } from "@/components/talent-stack";
import { TalentAura } from "@/components/talent-aura";

/**
 * Chapter 02 — Studio & Ethos, as a beat of the film.
 *
 * Pinned and scrubbed, after the homepage's own chapters: nothing here runs on
 * a clock. The heading assembles, the paragraphs arrive one after another, the
 * two portraits fly in between them and leave together by the right edge, and
 * the seal turns — all as functions of how far the reader has pushed the page,
 * and all of it reversing exactly when they go back. See `useBeat` for why that
 * is the whole point, and `CUE` below for the order it happens in.
 */

/**
 * Screens of scroll this chapter is pinned for.
 *
 * TWELVE, because it is now three acts in one stage. About Us plays out, its
 * heading travels across the frame and becomes TALENT a letter at a time, and
 * the Talent list arrives under it — all without the stage ever unpinning.
 *
 * That is the only way the title can actually cross: a heading cannot travel
 * from one section's layout into another's, so separate sections would have
 * meant one title leaving and another arriving, which is a cut dressed as a
 * transition. One stage, one element, three texts, two continuous moves.
 */
const BEATS = 12;

/**
 * The share of the chapter that is still About Us.
 *
 * Act one's cues below are written as fractions of their OWN act and scaled by
 * this, so the studio's pacing is unchanged in pixels by the chapter growing
 * around it — five screens of scroll, exactly as before. Change `BEATS` and the
 * first act keeps its rhythm; only the second gets longer or shorter.
 */
const ACT_ONE = 5 / BEATS;
const act1 = (c: Cue): Cue => [c[0] * ACT_ONE, c[1] * ACT_ONE];

/**
 * And the same trick for act two.
 *
 * Its cues were written as fractions of a nine-screen chapter, back when there
 * were only two acts. Scaling them by the share it still owns keeps Talent's
 * pacing identical in pixels while act three is added underneath it — nothing
 * in the second act had to be re-tuned to make room for the third.
 */
const ACT_TWO = 9 / BEATS;
const act2 = (c: Cue): Cue => [c[0] * ACT_TWO, c[1] * ACT_TWO];

/**
 * The heading is NOT on this chapter's beat, and it is NOT measured from the
 * heading either.
 *
 * On the beat it would start a whole screen late: `useBeat` reads 0 only once
 * the section's top reaches the top of the window, which is one screen AFTER
 * the hero has finished collapsing — a screen of nothing happening, which is
 * the gap this is meant to close.
 *
 * Measured from the h2 it would never finish. The h2 lives inside the sticky
 * stage, so the moment the chapter pins its rect STOPS MOVING, and a progress
 * built from a frozen rect freezes with it, part way through the word.
 *
 * So it is measured from the section, whose top is a pure function of scroll
 * whatever its children are doing, over the one screen between those two
 * events:
 *
 *   top = 0.17 × vh  the hero's own line is down to its last letters. It
 *                    leaves over 0.12 → 0.8 of a chapter half a screen long,
 *                    so it is nearly gone by 0.36vh of scroll — and with this
 *                    section pulled up a screen (see the style on it) this edge
 *                    is then about 0.17vh from the top of the window. The first
 *                    glyph here goes on while the last one there is going.
 *   top = −0.9 × vh  nearly a screen AFTER the stage has pinned
 *
 * Past the pin, deliberately. The section's own top keeps travelling long after
 * its sticky child has stopped — that is what a pin IS — so measuring the
 * section buys the heading half a screen of scroll it could not otherwise have.
 * It reads a glyph at a time over 1350px instead of 810, which is the whole
 * difference between a heading assembling and a heading appearing.
 *
 * Both numbers fall out of the layout rather than being dialled in: change the
 * hero's height and the handover stays welded to it.
 */
const HEAD_ENTER: Cue = [0.17, -0.9];

/**
 * The chapter's score, as pairs of stops on its own 0→1.
 *
 * One timeline, read in one place. The order below IS the order the reader
 * meets it in, and the overlaps are deliberate — a stage that waits for the
 * previous one to reach 1 reads as a queue being served, not as a sequence:
 *
 *   the heading has finished assembling by 0.10 — and then STAYS. Everything
 *   this chapter has to say stands together in one frame:
 *
 *   0.18 ─ paragraph 1 ──── 0.36
 *      0.22 ─ portrait 1 ──────── 0.42
 *                              0.42 ─ name 1 ─ 0.50
 *                 0.36 ─ paragraph 2 ──── 0.54
 *                                   0.48 ─ portrait 2 ──────── 0.68
 *                                                           0.68 ─ name 2 ─ 0.76
 *                                                 [ the composition holds ]
 *                                                   0.80 ─ the portraits leave ─ 0.98
 *                                                   0.80 ─ words go ─ 0.92
 *                                                              0.94 ─ stage ─ 1.00
 *
 * `swap` is gone with the crossfade it drove. The frame used to hold both
 * portraits and show exactly one, changing at a position on this beat; the two
 * are now a standing composition, so there is nothing to swap.
 */
const CUE = {
  /** The paragraphs' span. `Beat` cuts each one's window out of it. */
  body: act1([0.18, 0.54]),
  /** Each paragraph's own window, overlapping its neighbour. */
  /**
   * How much of `body` ONE paragraph owns — a share of that window, not a
   * number on the chapter.
   *
   * It was `0.18` written flat, while `body` either side of it went through
   * `act1` and came out as a 0.15-wide window. A paragraph wider than the
   * window holding it makes the step between paragraphs NEGATIVE, and a
   * negative step runs the list backwards: paragraph two opened at 0.045 and
   * paragraph one at 0.075, so the second half of the argument arrived first.
   * Arithmetic, and the second time a bare number has drifted from a cue that
   * got scaled around it — so this one is expressed in the only units it can be
   * read against.
   */
  beatEach: 0.44,
  /**
   * Picture, then its name, then the next picture, then ITS name. Four stages
   * where there were two, and strictly in order — a name never opens while a
   * portrait is still travelling, and the second portrait never sets off until
   * the first one has been named.
   *
   * The pictures keep the long windows and the names get short ones, which is
   * the right way round: a card crossing a third of the screen needs the room
   * or the move reads as a flick, and a line of type arriving in place needs
   * almost none.
   */
  founder: act1([0.22, 0.42]),
  founderName: act1([0.42, 0.5]),
  second: act1([0.48, 0.68]),
  secondName: act1([0.68, 0.76]),
  /**
   * And their departure, by the right edge of the window.
   *
   * Travel, not a fade: the composition leaves the frame the way a camera move
   * would take it out, and scrolling back brings it in from the same side.
   *
   * A QUARTER of the chapter, which is 1170px of scroll against the 450 it had.
   * It is the longest single move on the page and it should be: the pair are
   * crossing a screen and a quarter, and at the old length that was a swipe.
   * The stage's own clearing (`out`) catches whatever is left at the very end.
   */
  /**
   * NOT `act1` any more, and that is the point: the departure runs past act
   * one's own share of the chapter and finishes as the morph does.
   *
   * At act one's scale it owned 810px, which sounds generous until it is
   * measured against what the pair actually travel. The arrival covers 34vw in
   * 900px — about 26px of scroll per vw. The departure was covering 128vw in
   * 810px, which is 6px per vw: five times the pace of the entrance, on the
   * same pair of pictures. 1426px and a shorter path brings it to about 19,
   * which reads as the same move going the other way.
   */
  exit: act2([0.444, 0.62]),
  /**
   * The words clearing, on the stretch the portraits are leaving on.
   *
   * The chapter does not end with a cut: the argument dissolves while the faces
   * are still travelling out of frame, so by the time the stage itself goes
   * there is nothing left in it to miss and the next chapter's title is already
   * rising into the gap.
   */
  leave: act1([0.8, 0.92]),
  /**
   * ACT TWO — the handover, and Talent.
   *
   * `morph` is the whole transition: the heading travels and changes over it,
   * starting while act one's words and faces are still leaving so the two
   * overlap rather than queue. Everything after it is the Talent list arriving
   * under the title it just became.
   */
  morph: act2([0.46, 0.63]),
  talentLine: act2([0.63, 0.69]),
  /** The first card's window, and the step to the next. */
  cardFrom: 0.7 * ACT_TWO,
  cardEach: 0.075 * ACT_TWO,
  /* Wider than it was (0.055), and the reason is the PORTRAITS. A shot's stage
     is the gap between two card arrivals, and a turn has to fit inside a stage
     with room left over to stand still in — so how far apart the cards are is
     the ceiling on how slowly the picture beside them can turn. See `TURN`. */
  cardStep: 0.068 * ACT_TWO,
  /**
   * ACT THREE — Talent leaving, and the title becoming the next chapter's.
   *
   * The elements go in REVERSE: the last card first, then back up the column to
   * the line, then the portrait. A list that arrived top-down and leaves
   * top-down reads as a conveyor; one that leaves the way it came reads as the
   * reader backing out of it, which is what scrolling past actually is.
   */
  outFrom: 0.76,
  outEach: 0.08,
  outStep: 0.03,
  /** Talent → What we do, down and to the left. */
  morph2: [0.8, 0.95] as Cue,
  /** The whole chapter clearing as the next takes the window. */
  out: [0.96, 1] as Cue,
};

/**
 * The LOADING stretches, for a phone (see `useGated`): act one from the pin to
 * the second founder's name; then Talent — the founders leaving, the title
 * turning into TALENT, the portrait arriving, the line and the cards — from
 * there to just before the first card leaves. The two touch, so the moment act
 * one has loaded, the next scroll plays Talent in whole.
 *
 * Talent's way IN is part of its loading on purpose. Left on the scroll it was
 * almost two screens of a stage half-way between two things — a portrait
 * stalled at an angle, a title blurred mid-word — wherever the thumb stopped.
 * Only the way on to What we do, the chapter's exit, stays on the scroll.
 */
const HOLDS: [number, number][] = [
  [0, CUE.secondName[1]],
  [CUE.secondName[1], CUE.outFrom],
  /* And the way OUT, played too: the cards leaving, the portrait turning
     away, the title becoming What we do. On the scroll it was nearly three
     screens of a chapter half-gone; one swipe now plays it through, and the
     staircase's heading takes the title over as it would have. */
  /* Stopping where the stage itself starts to clear (`CUE.out`): its last
     stretch shrinks the stage, title included, and a title handed over at 97%
     of its size is a title that jumps. That stretch stays on the scroll. */
  [CUE.outFrom, CUE.out[0]],
];
/**
 * Screens of scroll a hold takes on a phone: one — a swipe. Shorter, and a
 * single flick back up crossed both acts at once and dropped the reader into
 * the hero with the stage still unwinding; at one screen each act is one swipe
 * to leave, in either direction.
 */
const PLAY_HOLD = 1;

/**
 * ON A PHONE act one is two beats, not one. The prose takes the column at the page's own
 * size, so the founders cannot stand under it as well: first the words (the title, the line
 * under it, both paragraphs) arrive and the frame rests on them to be read; the next gesture
 * then lifts the paragraphs away and brings the founders into the room they leave — the pair
 * as a diptych under the title. Two holds where the larger screens have one.
 */
const PHONE_CUE = {
  bodyEnd: act1([0, 0.56])[1],
  beatsOut: act1([0.56, 0.62]),
  founder: act1([0.58, 0.68]),
  founderName: act1([0.66, 0.71]),
  second: act1([0.62, 0.72]),
  secondName: act1([0.71, 0.76]),
};
const PHONE_HOLDS: [number, number][] = [
  [0, PHONE_CUE.bodyEnd],
  [PHONE_CUE.bodyEnd, PHONE_CUE.secondName[1]],
  [PHONE_CUE.secondName[1], CUE.outFrom],
  [CUE.outFrom, CUE.out[0]],
];

/** How many things leave in act three, newest first — see `outFrom`. */
const LEAVE_ORDER = { cards: 4, line: 4, media: 5 };

/**
 * The stage edges the left-hand portrait turns on — see `TalentStack`.
 *
 * One more than there are pictures, because a picture is live from its own edge
 * until the next. They are the moments the chapter changes what it is talking
 * about: the title landing, the line under it, then each card in turn.
 *
 * DERIVED from those cues rather than written out beside them. They used to be
 * seven literals that happened to equal the same positions, which is two places
 * holding one fact — and this file has already been bitten twice by exactly
 * that: a bare `0.48` that stopped matching the cue it sat between, and a
 * `beatEach` that never got scaled with the window around it. Moving a card now
 * moves its portrait, because they are the same number.
 */
/**
 * FOUR pictures, three changes — spread EVENLY over the stretch where the
 * portrait stands still: from the moment it lands (the end of its arrival,
 * `CUE.morph[1]`) to the act handing over (`CUE.morph2[0]`). Each change is
 * one blinds-length (`REVEAL`, shared with the stack so they cannot drift) and
 * each picture gets the same rest before the next one begins; the last one
 * then stays through the exit. Tying them to card arrivals put two changes
 * closer together than one slow blind takes.
 */
const TURNS = 3;
const TURN_REST =
  (CUE.morph2[0] - CUE.morph[1] - TURNS * REVEAL) / (TURNS + 1);
const SHOT_BOUNDS = [
  /* The first picture is live from the start of the arrival. */
  CUE.morph[0],
  ...Array.from(
    { length: TURNS },
    (_, k) => CUE.morph[1] + (k + 1) * (TURN_REST + REVEAL),
  ),
  /* And the act handing over. */
  CUE.morph2[0],
];

/**
 * The portraits, each carrying the colours it lights the room with.
 *
 * Taken off the actual files ahead of time — quantised, the dominant and two
 * supporting hues kept, then tempered into the page's own register. They live
 * HERE, on the shot, rather than in a table beside it, because a palette that
 * can be edited without the picture it came from is a palette that will one day
 * describe a different picture. See `TalentAura`.
 */
const SHOTS = [
  /* The most colourful of the archive, measured (Hasler–Süsstrunk): magenta
     satin (95), green-and-red (63), an orange-and-teal paper ruff (123, from
     the supplied photographs, cropped to the stack's 3:4), a graffiti wall
     (77) — four different palettes in a row. */
  {
    src: "/talent/stage-4.jpg",
    aura: { base: "#183b40", accent: "#631434", far: "#16434a" },
  },
  {
    src: "/talent/stage-3.jpg",
    aura: { base: "#183440", accent: "#633e14", far: "#162e4a" },
  },
  {
    src: "/talent/stage-7.jpg",
    aura: { base: "#183d36", accent: "#633014", far: "#3a2418" },
  },
  {
    src: "/talent/stage-6.jpg",
    aura: { base: "#401b18", accent: "#631b14", far: "#161d4a" },
  },
]

/**
 * ON A PHONE, FIVE pictures: the first standing from the start, and one more turned up with
 * each of the four cards as it arrives under it — Direction, Cinematography, Edit, Creative —
 * so the portrait and the list move as one. The fifth, a studio session in teal, is a palette
 * none of the four has. Each change is set to begin the moment its card does (the stack plays
 * a change from the middle of its stretch, see `Panel`).
 */
const PHONE_SHOTS = [
  ...SHOTS,
  {
    src: "/talent/stage-1.jpg",
    aura: { base: "#163f3e", accent: "#1d5a58", far: "#162f4a" },
  },
];
const PHONE_SHOT_BOUNDS = [
  CUE.morph[0],
  ...[0, 1, 2, 3].map((k) => CUE.cardFrom + k * CUE.cardStep + REVEAL / 2),
  CUE.morph2[0],
];

/** Deliberately short — the four cards under it carry the detail. */
const TALENT_LINE =
  "A roster, and a far deeper network past the end of it. The team is cast for the brief, every time.";

const CRAFT = [
  {
    id: "direction",
    title: "Direction",
    line: "Narrative, documentary, fashion, performance.",
  },
  {
    id: "camera",
    title: "Cinematography",
    line: "Studio and location, available light, high-speed.",
  },
  {
    id: "edit",
    title: "Edit",
    line: "Long form, broadcast cutdowns, social, finish.",
  },
  {
    id: "creative",
    title: "Creative",
    line: "Concept, copy, art direction, campaign strategy.",
  },
];

/**
 * The chapter's TITLE and its SUBTITLE, now two things instead of one.
 *
 * "The studio" is the Title: ten characters, the same count as "What we do",
 * which matters because they are the same piece of type. The crossing heading
 * carries three texts — this, then Talent, then What we do — and all three now
 * set at a comparable width (5.8em, 3.6em, 6.6em), where three long lines
 * morphing into one short word meant the box changed shape under the reader
 * halfway through the exchange.
 *
 * The claim it replaces is not gone; it is demoted to the subtitle beneath,
 * which is where a three-line statement of credentials actually belongs — it
 * was never a title, it was the argument's opening.
 */
const TITLE = ["The studio"];
const SUBTITLE = [
  "Emmy Award-winning.",
  "Female-founded.",
  "Built on relationships.",
];

const BODY = [
  "Bethanie Schwartz and Lauren Tuttman founded HunterPark in 2018, having left the corporate agency world to build the thing they had spent years working around: a production company that answers to the work and to the people paying for it, and to nothing in between.",
  "The name is their sons', Hunter and Parker. That is not a flourish — it is the whole operating principle. A studio run like a family runs: on relationships, on mutual respect, on being the people a client trusts with something that matters.",
];

/**
 * The founders.
 *
 * ORDER UNCONFIRMED: the two portraits were supplied as a pair and mapped to
 * these names in the order they arrived. If they are the wrong way round it is
 * these two `src` values that swap and nothing else.
 */
const FOUNDERS = [
  {
    name: "Bethanie Schwartz",
    role: "Founder",
    src: "/portraits/bethanie-schwartz.jpg",
  },
  {
    name: "Lauren Tuttman",
    role: "Founder",
    src: "/portraits/lauren-tuttman.jpg",
  },
];

/**
 * The window paragraph `order` owns, cut out of `CUE.body`.
 *
 * Pulled out of `Beat` so the backdrop can ride the FIRST paragraph's window
 * rather than a copy of it. Two components agreeing on three numbers is two
 * components that will one day disagree; this is one expression they both
 * call, so "the backdrop and paragraph one are one animation" is a fact about
 * the code rather than a note in a comment.
 */
const beatWindow = (order: number): Cue => {
  const [from, to] = CUE.body;
  const span = to - from;
  /**
   * They QUEUE now, and that is a change of intent.
   *
   * This used to spread them so the paragraphs overlapped, on the reasoning
   * that a scrubbed beat should not read as a list being ticked off. Read
   * against the brief that is the wrong call for this column: the reader is
   * being asked to follow an argument in order — who founded it, then what the
   * name means — and two paragraphs rising together is the one arrangement in
   * which the order cannot be seen at all.
   *
   * At 0.44 each, the two own just under nine tenths of the window between
   * them and what is left becomes the pause: paragraph one has landed before
   * paragraph two starts, with a beat of daylight in between.
   */
  const each = span * CUE.beatEach;
  const step = (span - each) / Math.max(1, BODY.length - 1);
  const at = from + order * step;
  return [at, at + each];
};

/**
 * On a TABLET the split is one column at full type size, and a pinned frame one
 * screen tall cannot hold the title, the subtitle, both paragraphs AND the
 * founders stacked — so there the paragraphs share one cell (see
 * `.about-studio__beats`) and the first makes way as the second arrives.
 *
 * NOT on a phone. There the copy loads on a clock (see `useGated`), and a
 * paragraph swapped for the next before it can be read is a paragraph lost; the
 * type is set a step down instead so both stand, one after the other, with the
 * founders under them. Same breakpoints as the stylesheet.
 */
const SINGLE_COLUMN = "(min-width: 768px) and (max-width: 1023px)";
const subscribeColumn = (change: () => void) => {
  const mq = window.matchMedia(SINGLE_COLUMN);
  mq.addEventListener("change", change);
  return () => mq.removeEventListener("change", change);
};
const useSingleColumn = () =>
  useSyncExternalStore(
    subscribeColumn,
    () => window.matchMedia(SINGLE_COLUMN).matches,
    () => false,
  );

/* ---------------------------------------------------------------- parts --- */

/** One paragraph, arriving on its own stretch of the beat. */
function Beat({
  text,
  order,
  p,
  stacked,
}: {
  text: string;
  order: number;
  p: MotionValue<number>;
  /** Single column: the paragraphs share a cell, so each but the last leaves. */
  stacked: boolean;
}) {
  const [at, end] = beatWindow(order);
  /* Leaves over the first half of the next paragraph's arrival — up and out,
     the way the next one rises in. Never, when they stand in a column. */
  const leaves = stacked && order < BODY.length - 1;
  const [next, nextEnd] = leaves ? beatWindow(order + 1) : [2, 3];
  const gone = next + (nextEnd - next) * 0.5;

  /* Opacity and travel share one window, so a paragraph is never visible
     anywhere but on its way up. 44px rather than 26: far enough that the rise
     is read as a rise, short enough that it is still the type settling rather
     than the type making an entrance. */
  const opacity = useTransform(p, [at, end, next, gone], [0, 1, 1, 0]);
  const y = useTransform(p, [at, end, next, gone], [44, 0, 0, -28]);

  return (
    <m.p className="hp-copy about-studio__body" style={{ opacity, y }}>
      {text}
    </m.p>
  );
}

/**
 * Where each portrait comes IN from and where it goes OUT to.
 *
 * Both arrive over the TOP-RIGHT corner and leave past the BOTTOM-RIGHT — one
 * diagonal, read downwards, rather than the two different directions they used
 * to come from.
 *
 * The departure is 76vw, not 128. The composition's own left edge sits at about
 * 43vw, so 76 carries it to 119 — clear of the frame with margin, and nothing
 * further is travel anybody sees. The 128 was distance spent off-screen, and it
 * was the reason the exit had to be hurried to fit its window. In viewport units rather than pixels, so the move is the
 * same gesture on a phone and on a 27-inch screen: at a fixed 300px the founder
 * would have drifted in from just outside her own frame on a laptop and from
 * three screens away on a phone.
 *
 * `z` is the depth, and it is what makes this dimensional rather than a tilted
 * slide. The card starts hundreds of pixels BEHIND the screen plane and comes
 * forward onto it; against a 900px perspective that is a real change of
 * distance, and it is also where the size change comes from now — there is no
 * `scale` on these any more, because a scale is a drawing getting bigger and a
 * translation in z is an object getting nearer. Those look different.
 *
 * `rx`, `ry` and `tilt` are the attitude it carries while it travels: pitch,
 * yaw, and a little roll in the picture plane. All three resolve to ZERO at
 * rest, by construction — a portrait still a degree or two off square at its
 * destination reads as a mistake rather than as depth, so the whole point of
 * the move is that it ends flat, front-facing and stays that way.
 *
 * The two cards differ throughout on purpose. Identical attitudes and identical
 * depths make them one rigid object being carried; different ones make them two
 * things moving through the same space, which is the only way a composition of
 * two reads as having room in it.
 *
 * Kept deliberately shy of theatre: 38° of yaw at 460px of depth is clearly
 * dimensional and nowhere near a card flip.
 */
const ARRIVE = {
  lead: { x: "34vw", y: "-26vh", z: -460, rx: -18, ry: 38, tilt: -5 },
  follow: { x: "30vw", y: "-20vh", z: -360, rx: -14, ry: 30, tilt: -3 },
};
const DEPART = {
  lead: { x: "76vw", y: "26vh", z: -400, rx: 20, ry: -38, tilt: 6 },
  follow: { x: "76vw", y: "18vh", z: -320, rx: 15, ry: -30, tilt: 3.5 },
};

/**
 * One portrait, arriving on its own stretch of the beat and leaving on the
 * chapter's.
 *
 * Arrival and departure are ONE MotionValue per axis, with four stops rather
 * than two animations fighting over the same property. The element is at its
 * entrance offset at the start, at rest through the middle, and past the right
 * edge at the end — so every point of the chapter has exactly one answer for
 * where this portrait is, which is what makes scrubbing back take it apart in
 * the order it went together.
 */
type Travel = {
  x: string;
  y: string;
  /** Depth, in px behind the screen plane. */
  z: number;
  rx: number;
  ry: number;
  tilt: number;
};

function Shot({
  person,
  cue,
  name,
  from,
  away,
  p,
  className,
  lift = 0,
}: {
  person: (typeof FOUNDERS)[number];
  /** This portrait's own arrival window on the beat. */
  cue: Cue;
  /** And its NAME's, which does not open until the picture has landed. */
  name: Cue;
  /** Where it comes in from. */
  from: Travel;
  /** And where it goes. */
  away: Travel;
  p: MotionValue<number>;
  className: string;
  /**
   * Where this portrait RESTS in depth, and it is a sorting instruction.
   *
   * The two shots overlap, and the lower one's caption runs about eight pixels
   * under the upper one's frame — enough to bite the last letter off FOUNDER.
   * `.about-cast__shot--follow` already carries a `z-index: 2` for exactly this
   * and it does nothing: the composition is `transform-style: preserve-3d`, and
   * inside one of those children are sorted by their position in SPACE, not by
   * z-index. The property is simply not consulted.
   *
   * So the instruction has to be given in the units the sort actually reads. A
   * single pixel forward is enough to order them and, against the 900px
   * perspective this composition is seen through, works out to a scale change
   * of about one part in a thousand — far below anything visible.
   */
  lift?: number;
}) {
  const [a, b] = cue;
  const [out, gone] = CUE.exit;

  /**
   * Four stops per axis — the arrival, the rest, and the departure, as ONE
   * answer rather than two animations sharing a property. The card is at its
   * entrance attitude at the start, square and still through the middle, and
   * carried out past the bottom-right at the end, so every point of the chapter
   * has exactly one answer for where this portrait is and which way it is
   * facing. That is what makes scrubbing back take it apart in the order it
   * went together.
   */
  const stops: [number, number, number, number] = [a, b, out, gone];
  const x = useTransform(p, stops, [from.x, "0vw", "0vw", away.x]);
  const y = useTransform(p, stops, [from.y, "0vh", "0vh", away.y]);
  const z = useTransform(p, stops, [from.z, lift, lift, away.z]);
  const rotateX = useTransform(p, stops, [from.rx, 0, 0, away.rx]);
  const rotateY = useTransform(p, stops, [from.ry, 0, 0, away.ry]);
  const rotate = useTransform(p, stops, [from.tilt, 0, 0, away.tilt]);
  /* Up early and STAYS up. They leave by travelling; a fade on top of that
     would be the thing the brief rules out, dressed as a flourish. */
  const opacity = useTransform(p, [a, a + (b - a) * 0.35], [0, 1]);

  /**
   * The name runs on its OWN window, which starts where the picture's ends.
   *
   * Independent in time and independent in mechanism: it is not a late slice of
   * the card's own arrival, it is a second arrival that happens to be anchored
   * to the first one's corner. So the order the reader sees is picture, name,
   * picture, name — never two of anything at once.
   */
  const [n0, n1] = name;
  /**
   * The NAME assembles glyph by glyph; the ROLE simply fades in behind it.
   *
   * That split is the reference's, not a decision taken here: on the homepage
   * the client's name is a `SplitText` and the year beside it is a plain
   * opacity on a later delay. Two weights of type and two weights of arrival,
   * so the eye is given the name first and the qualifier second even though
   * they share a baseline. `ScrollChars` is the scrubbed form of `SplitText` —
   * same letter-by-letter assembly, driven by position instead of a clock,
   * which is the only kind of motion this chapter has.
   *
   * The role's window starts at a third of the name's, which is the same
   * proportion the delay on the homepage works out to.
   */
  const nameRun = useTransform(p, [n0, n1], [0, 1]);
  const roleOpacity = useTransform(p, [n0 + (n1 - n0) * 0.34, n1], [0, 1]);

  return (
    <m.figure
      className={`about-cast__shot ${className}`}
      style={{ x, y, z, rotateX, rotateY, rotate, opacity }}
      aria-hidden
    >
      {/**
       * ABOVE the frame and ranged LEFT — on the page's ground, not on the
       * photograph.
       *
       * It sat inside the still's bottom-left corner for a while, following the
       * reference strip. Out here it needs no scrim to stay legible, which is
       * why the one that was carrying it over those two lit faces has gone with
       * it: it existed only to make white type work at 1.15:1, and nothing is
       * written on the picture any more.
       *
       * Ranged left, which puts it on the same edge as every other piece of
       * type in this chapter: the heading, the subtitle and the body all start
       * at the page gutter, and a caption that started somewhere else was the
       * only thing in the column reading against that grain.
       */}
      <m.figcaption className="about-cast__tag">
        <span className="about-cast__name">
          <ScrollChars lines={[person.name]} progress={nameRun} />
        </span>
        <m.span className="about-cast__role" style={{ opacity: roleOpacity }}>
          {person.role}
        </m.span>
      </m.figcaption>

      {/* The picture's own box. */}
      <div className="about-cast__frame">
        <div className="about-cast__media">
          <Image
            src={person.src}
            alt=""
            fill
            sizes="(max-width: 1023px) 56vw, 32vw"
            quality={90}
            className="about-cast__img"
          />
        </div>
      </div>
    </m.figure>
  );
}

/**
 * The founders' composition: two portraits, standing together.
 *
 * It used to be one window with both portraits laid in it and exactly one
 * visible, crossfading at a position on the beat. Two things were wrong with
 * that: only one founder was ever on screen, and the crossfade was a CSS
 * `transition` — once the class flipped it ran itself out on a clock, which is
 * the one behaviour a scrubbed page must not have. Both are gone. The two
 * portraits are now positioned against each other by the LAYOUT (see
 * `.about-cast__shot--lead` / `--follow`), and every pixel of their movement is
 * a function of scroll position.
 */
function Cast({ p, phone }: { p: MotionValue<number>; phone: boolean }) {
  const cue = phone ? PHONE_CUE : CUE;
  return (
    <div className="about-cast">
      <div className="about-cast__composition">
        <Shot
          person={FOUNDERS[0]}
          cue={cue.founder}
          name={cue.founderName}
          from={ARRIVE.lead}
          away={DEPART.lead}
          p={p}
          className="about-cast__shot--lead"
        />
        <Shot
          person={FOUNDERS[1]}
          cue={cue.second}
          name={cue.secondName}
          from={ARRIVE.follow}
          away={DEPART.follow}
          p={p}
          className="about-cast__shot--follow"
          /* In front of the lead at rest, by a pixel — see `lift`. */
          lift={1}
        />
      </div>

      {/* Said once for anything that reads rather than looks: the frames are
          `aria-hidden` and arrive without a page change. */}
      <p className="visually-hidden">
        Founders: {FOUNDERS.map((f) => f.name).join(" and ")}.
      </p>
    </div>
  );
}

/** One card of the Talent list, arriving on its own slice of act two. */
function Card({
  item,
  order,
  p,
}: {
  item: (typeof CRAFT)[number];
  order: number;
  p: MotionValue<number>;
}) {
  const at = CUE.cardFrom + order * CUE.cardStep;
  const to = at + CUE.cardEach;

  /**
   * And its place in the way out, which is the way in REVERSED.
   *
   * The last card arrives last and leaves first. Four stops per property, as
   * everywhere else on this page: in, held, out — one answer at every scroll
   * position, so scrubbing back puts the column together in the order it came.
   */
  const outAt = CUE.outFrom + (LEAVE_ORDER.cards - 1 - order) * CUE.outStep;
  const gone = outAt + CUE.outEach;
  const stops: [number, number, number, number] = [at, to, outAt, gone];

  const opacity = useTransform(
    p,
    [at, at + (to - at) * 0.55, outAt, gone],
    [0, 1, 1, 0],
  );
  const y = useTransform(p, stops, [30, 0, 0, -40]);
  /* The same few degrees off the surface the chapter's other type arrives on,
     and no more: these are lines, not objects, and anything that pitches text
     far enough to be obvious also makes it briefly unreadable. */
  const rotateX = useTransform(p, stops, [10, 0, 0, -8]);
  const z = useTransform(p, stops, [-140, 0, 0, -120]);

  return (
    <m.li className="talent-card" style={{ opacity, y, z, rotateX }}>
      <span className="talent-card__num" aria-hidden>
        {String(order + 1).padStart(2, "0")}
      </span>
      <h3 className="talent-card__title">{item.title}</h3>

      {/**
       * The line, set as the reference sets it: the words spaced out along a
       * row with a middot between them rather than run together as a sentence.
       *
       * NOTHING IS REWRITTEN TO DO THIS. Every one of these lines was already a
       * comma-separated list — "Narrative, documentary, fashion, performance."
       * — so the commas become the separators and the full stop goes, which is
       * a change of setting and not of copy.
       *
       * The dots are drawn by the stylesheet rather than written into the text,
       * so a screen reader is given the four words and not four words and four
       * pieces of punctuation. They also wrap for free, which matters: measured,
       * a single row of these would need to be 7px on a phone.
       */}
      <p className="talent-card__tags">
        {item.line
          .replace(/\.$/, "")
          .split(/,\s*/)
          .map((tag) => (
            <span key={tag} className="talent-card__tag">
              {tag}
            </span>
          ))}
      </p>
    </m.li>
  );
}

/* -------------------------------------------------------------- chapter --- */

export function AboutStudio() {
  /**
   * ON A PHONE the two acts' ELEMENTS load on a clock (see `useGated`): once the
   * scroll is inside an act, its paragraphs and founders — or its line, cards
   * and portrait turns — arrive in their order at the beat's own pace, however
   * the thumb moves. Everything between the acts, and the way in and out of the
   * chapter, still runs on the scroll as on a desktop. Each act takes only a
   * sliver of scroll there (`PLAY_HOLD`), so the pin is shorter by what used to
   * be scrubbing — see the section's height below.
   */
  const playing = usePlayMode();

  /* ON A PHONE a reload starts this page from the top rather than where it was left. The
     closing half's place is only known once the chapter's title has rested (see the hand-over
     below), so a reload restored to the call to action measured it late — and the whole
     closing moved by a hundred pixels under the reader as they scrolled back up. */
  useEffect(() => {
    if (!playing || !("scrollRestoration" in history)) return;
    const was = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = was;
    };
  }, [playing]);
  const [ref, scrollP] = useBeat();
  const phoneBeat = compressHolds(PHONE_HOLDS, BEATS, PLAY_HOLD);
  /* On a phone the paragraphs follow the title and the line under it by themselves: once those
     have arrived, the act's first played stretch is set going (a nudge past its start) rather
     than waiting on a scroll the reader has no reason to make. Withdrawn as they leave. */
  const kick = useMotionValue(0);
  const mapped = useTransform([scrollP, kick], ([v, k]: number[]) =>
    playing ? Math.max(phoneBeat.map(v), k ? 0.002 : 0) : v,
  );
  const p = useGated(mapped, { holds: playing ? PHONE_HOLDS : HOLDS, screens: BEATS, enabled: playing });
  /* The heading and the subtitle are act one's first elements: on a phone they
     too load on a clock once they have started — the same span the scroll gave
     them (`HEAD_ENTER`, a screen and a bit), as one hold. */
  const [headRef, headScroll] = useEnter(HEAD_ENTER[0], HEAD_ENTER[1]);
  const headP = useGated(headScroll, {
    holds: [[0, 1]],
    screens: HEAD_ENTER[0] - HEAD_ENTER[1],
    enabled: playing,
  });
  const singleColumn = useSingleColumn();

  /**
   * THE TITLE AND THE SUBTITLE NO LONGER SHARE A CLOCK.
   *
   * Both ran on the whole of `headP`, which meant both assembled across exactly
   * the same stretch of scroll — four lines of type coming up at once, and no
   * order for the reader to follow even though there plainly is one.
   *
   * Split, with the handover a little past half: the title owns the first 55%
   * and the subtitle the last 50%, so the subtitle's first letter moves as the
   * title's last is settling. Butted exactly end to end would read as a stall
   * between them; a five-point overlap is the join being hidden rather than a
   * second thing starting.
   *
   * `headP` reaching 1 is also where `CUE.body` begins, which is what carries
   * the sequence across the two clocks this chapter runs on: the subtitle is
   * finished at the moment the first paragraph is due.
   */
  /* …and with the paragraphs in, the next gesture goes straight on to the founders: the rest of
     that first stretch's scroll (it no longer has anything to play) is carried over. */
  const sectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!playing) return;
    const holdTwoAt = 1 / compressHolds(PHONE_HOLDS, BEATS, PLAY_HOLD).total;
    let lastY = window.scrollY;
    let busy = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const down = y > lastY + 2;
      lastY = y;
      const el = sectionRef.current;
      if (!down || busy || !el) return;
      const top = el.getBoundingClientRect().top + y;
      const span = el.offsetHeight - window.innerHeight;
      if (span <= 0) return;
      const at = (y - top) / span;
      if (at > 0 && at < holdTwoAt && p.get() >= PHONE_CUE.bodyEnd - 0.001) {
        busy = window.setTimeout(() => (busy = 0), 900);
        carryTo(top + span * holdTwoAt + 6, 0.7);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(busy);
    };
  }, [playing, p]);

  /* …and at the act's end the next chapter starts by itself: once the title has become WHAT WE
     DO (the last played stretch done), the page is carried on until the staircase's first
     step is in view, so its pictures begin to open — not left on the title until the reader
     has scrolled the rest of the pin and the gap below it by hand. On the way the title hands
     over to the staircase's own heading, as it always has. */
  useMotionValueEvent(p, "change", (v) => {
    if (!playing) return;
    const end = CUE.out[0] - 0.0001;
    const prev = p.getPrevious() ?? 0;
    if (!(prev < end && v >= end)) return;
    const first = document.querySelector<HTMLElement>(".stair__frame");
    if (!first) return;
    const y = window.scrollY;
    // carried to the hand-over itself: the staircase's own heading risen to where this title
    // stands, so the first picture lies at its natural step under the heading — landing short
    // of it (the first picture at 60% of the screen) left the pinned title a long way above it
    const head = document.querySelector<HTMLElement>(".caps-section__head");
    const title = titleBox.current;
    const to =
      head && title
        ? y + head.getBoundingClientRect().top - title.getBoundingClientRect().top
        : first.getBoundingClientRect().top + y - window.innerHeight * 0.6;
    if (to > y + 10) carryTo(to, ((to - y) / window.innerHeight) * PLAY_SECONDS_PER_SCREEN);
  });

  useMotionValueEvent(headP, "change", (v) => {
    if (!playing) return;
    if (v >= 0.999) kick.set(1);
    else if (v < 0.5) kick.set(0);
  });
  const titleIn = useTransform(headP, [0, 0.55], [0, 1]);
  const subIn = useTransform(headP, [0.5, 1], [0, 1]);

  /* Act one's words and faces go — see `CUE.leave`. */
  /**
   * Act one's exit, with the chapter's own exit folded in.
   *
   * `stageOpacity` used to sit on the stage and multiply everything it holds —
   * including the heading, which is the one thing meant to OUTLIVE the chapter
   * and be handed to the staircase. Composed here instead, so the parts that
   * belong to act one leave twice over and the heading leaves on neither.
   */
  const claimOpacity = useTransform(
    [useTransform(p, CUE.leave, [1, 0]), useTransform(p, CUE.out, [1, 0])],
    ([a, b]: number[]) => a * b,
  );
  const claimY = useTransform(p, CUE.leave, [0, -40]);

  /* On a phone the paragraphs give the column up to the founders (see `PHONE_CUE`). */
  const beatsAway = useTransform(p, PHONE_CUE.beatsOut, [0, 1]);
  const beatsOpacity = useTransform([claimOpacity, beatsAway], ([o, a]: number[]) =>
    playing ? o * (1 - a) : o,
  );
  const beatsY = useTransform([claimY, beatsAway], ([y, a]: number[]) => (playing ? y - 28 * a : y));

  /* …and the founders take the room the paragraphs stood in: where that room starts, for
     the stylesheet (offsets, so the paragraphs' own travel does not move it). */
  const splitRef = useRef<HTMLDivElement | null>(null);
  const beatsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const split = splitRef.current;
    const beats = beatsRef.current;
    if (!split || !beats) return;
    const measure = () => {
      let top = 0;
      let n: HTMLElement | null = beats;
      while (n && n !== split) {
        top += n.offsetTop;
        n = n.offsetParent as HTMLElement | null;
      }
      if (n === split) split.style.setProperty("--beats-top", `${top}px`);
    };
    measure();
    const sizes = new ResizeObserver(measure);
    sizes.observe(split);
    document.fonts?.ready.then(measure);
    return () => sizes.disconnect();
  }, []);

  /**
   * THE TITLE RESTS IN ACT ONE'S COLUMN, and the path is written from there.
   *
   * It is the first flow child of `.about-studio__claim`, so where it sits in
   * act one — its left edge on the page gutter, its distance to the subtitle
   * under it — is a LAYOUT FACT and not a viewport offset that happened to look
   * right at one screen size. It lived in the Talent column before and reached
   * act one by a `-46vw` transform, which can only ever be approximately the
   * gutter: the gutter caps at 65px while the page keeps growing, so one vw
   * number is correct at exactly one width.
   *
   * And the Talent state is measured too, now — see `land`. It was the last
   * tuned offset in the path and it was wrong: "38vw" put the heading 105px
   * short of the column it belongs to, straight across the standfirst. Nobody
   * could see that, because the heading was composited out by its parent for
   * the whole of that leg. A column's left edge is a clamped gutter plus a
   * percentage track plus a fixed gap — three scaling laws — so no single
   * viewport unit can name it at more than one window width.
   *
   * NO SCALE. All three texts are one size, as the reference's section titles
   * are; the growth that used to be here made the last of them nearly twice the
   * first, which is three sizes for one piece of type.
   */
  /**
   * THE APEX OF THE ARC, and the bug that cost the chapter two of its titles.
   *
   * The middle stop used to be the literal number `0.48`. That was correct when
   * it was written: the cues either side of it were raw act-two fractions, and
   * 0.48 sat between 0.46 and 0.63. Then the acts were introduced and those two
   * went through `act2` — 0.345 and 0.4725 — while the bare number did not. The
   * input range became [0.345, 0.48, 0.4725, …], which is NOT ASCENDING, and an
   * interpolator given a range that goes backwards does not fail; it reads off
   * the wrong segment.
   *
   * What it did in practice: the heading travelled its arc normally to 18.9vw /
   * 17vh, and then, in the single frame between 0.4725 and 0.48, teleported
   * 19vw right and 13vh up. The morph was running correctly the whole time —
   * Talent was assembling, and What we do after it — but on a piece of type that
   * had jumped out from under the reader at exactly the moment it became
   * readable. The titles were never missing. They were never WHERE THEY WERE
   * BEING LOOKED FOR.
   *
   * Written as a point inside the morph, it cannot drift from it again: move
   * the cue, retune the act, change `BEATS`, and the apex follows.
   */

  const APEX = CUE.morph[0] + (CUE.morph[1] - CUE.morph[0]) * 0.55;
  const PATH = [CUE.morph[0], APEX, CUE.morph[1], CUE.morph2[0], CUE.morph2[1]];

  /**
   * The offset from act one's column to act two's, read off the page.
   *
   * Both rects come from UNTRANSFORMED elements — the claim column, which the
   * heading is the first flow child of, and the Talent column — so what is
   * measured is the layout and not the move being described. The Talent column
   * carries a `padding-top` the size of a heading, and this lands in it: the
   * space is reserved by the stylesheet and filled by the transform, which is
   * why the two cannot drift apart.
   */
  const claimBox = useRef<HTMLDivElement | null>(null);
  const talentBox = useRef<HTMLDivElement | null>(null);
  const [land, setLand] = useState({ x: 0, y: 0, vh: 0 });

  useEffect(() => {
    const read = () => {
      const a = claimBox.current;
      const b = talentBox.current;
      if (!a || !b) return;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      setLand({
        x: rb.left - ra.left,
        y: rb.top - ra.top,
        vh: window.innerHeight,
      });
    };
    /* Deferred a frame — the stage has just been committed, and a path built
       from zero-sized rects is a path of zeroes. */
    const frame = requestAnimationFrame(read);
    const observer = new ResizeObserver(read);
    const host = claimBox.current;
    if (host) observer.observe(host);
    window.addEventListener("resize", read);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", read);
    };
  }, []);

  /* Pixels, because the landing is a measurement. The apex keeps the bow the
     vw version had — half way across, and a seventh of a screen below the
     line it is heading for, so the heading swings into place rather than
     sliding there. */
  const titleX = useTransform(p, PATH, [0, land.x * 0.52, land.x, land.x, 0]);
  const titleY = useTransform(p, PATH, [
    0,
    land.y + land.vh * 0.14,
    land.y,
    land.y,
    land.vh * 0.26,
  ]);
  /**
   * The second exchange: Talent → What we do, down and to the left.
   *
   * Same component, same constants, same feel — it is the first morph again,
   * one link further along. `talentIn` is the first morph's own INCOMING band
   * remapped to 0→1, so the middle word arrives on exactly the stretch it
   * always did; without that it would start assembling from the first frame of
   * the first exchange rather than half way through it.
   */
  /** The morph's own 0→1, carved out of the chapter. */
  const morph = useTransform(p, CUE.morph, [0, 1]);
  const morph2 = useTransform(p, CUE.morph2, [0, 1]);

  /**
   * THE HAND-OVER TO THE SCROLLING HEADING.
   *
   * The staircase draws its own "What we do" and that one travels with the
   * pictures. This one is pinned, so the two are the same words in two places
   * for the stretch where both are on screen — measured, scroll 12.2 to 12.4,
   * which is the duplicate this chapter was explicitly told not to produce.
   *
   * A pinned title and a scrolling one can coincide at exactly ONE scroll
   * position, so that is where the swap happens: the moment the section's
   * heading rises to the height this one rests at, this one stops being drawn.
   * Same words, same size, same place, same instant — the reader sees one title
   * that stops being pinned and starts moving.
   *
   * Both positions are read once and then arithmetic: the heading's place in
   * the document minus the scroll, against this title's own resting height.
   */
  const [swap, setSwap] = useState(1);
  const titleBox = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    let headTop = 0;
    let restAt = 0;

    const measure = () => {
      const head = document.querySelector<HTMLElement>(".caps-section__head");
      if (head) headTop = head.getBoundingClientRect().top + window.scrollY;
    };

    /**
     * WHERE THIS TITLE RESTS IS CAPTURED WHERE IT RESTS — not at mount.
     *
     * The first attempt computed it from the claim column's rect taken on
     * mount, with the page at the top, so it described where the column sits
     * before the chapter has pinned. The swap then fired at scroll 12.2 with
     * the travelling heading still 264px lower, leaving a stretch with the
     * title in neither place.
     *
     * The stage is pinned by the time the heading matters, so the title's
     * viewport position is a constant then — read it once, on the first frame
     * the morph has finished, and it is the right constant by construction.
     */
    const capture = () => {
      const self = titleBox.current;
      if (!self || restAt) return;
      if (morph2.get() < 0.995) return;
      /* Where the title stands in the window WHILE THE STAGE IS PINNED — read off the stage it
         is pinned with (sticky at the top, so its offset there is its place in the window), not
         off the window itself. Read straight from the window, the value was only right if the
         stage happened to be pinned at the moment the title finished turning: arriving any
         other way — a refresh far down the page, a fling, a link — it came from wherever the
         stage had scrolled to, and the margin below set the whole closing half a screen or
         more out of place, the page jumping under the call to action. */
      const stage = self.closest<HTMLElement>(".beat__stage");
      restAt = stage
        ? self.getBoundingClientRect().top - stage.getBoundingClientRect().top
        : self.getBoundingClientRect().top;
      /**
       * ON A PHONE the pin is shorter (see `HOLDS`), so it lets go before the
       * staircase's heading has risen to this title — both then travel up
       * together a fixed distance apart, and the swap is a jump. So there the
       * staircase is pulled up by exactly what puts its heading at this
       * height on the frame the pin lets go: from then on the two are one
       * line moving, and the swap cannot be seen.
       */
      if (playing) {
        const head = document.querySelector<HTMLElement>(".caps-section__head");
        const caps = head?.closest<HTMLElement>(".caps-section");
        if (head && caps) {
          const headOffset =
            head.getBoundingClientRect().top - caps.getBoundingClientRect().top;
          caps.style.marginTop = `${restAt - window.innerHeight - headOffset}px`;
          measure();
        }
      }
    };

    const read = () => {
      capture();
      if (!headTop || !restAt) return;
      const handed = headTop - window.scrollY <= restAt;
      setSwap(handed ? 0 : 1);
      /**
       * And the same instant told to the OTHER heading.
       *
       * The staircase's heading travels up from below, so for the stretch
       * before the swap it is on screen underneath this one — the same words
       * twice, 264px apart, which is the duplicate this chapter was told not to
       * produce. It stays dark until this moment and lights at it.
       *
       * One boolean on the root element rather than lifted state: the two
       * headings are in different chapters and this is the only fact they share,
       * so a data attribute and a CSS rule is the whole of the coupling.
       */
      document.documentElement.dataset.titleHandedOver = handed ? "1" : "0";
    };

    measure();
    const frame = requestAnimationFrame(() => {
      measure();
      read();
    });
    const sizes = new ResizeObserver(() => {
      measure();
      read();
    });
    sizes.observe(document.documentElement);
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", () => {
      measure();
      read();
    });
    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [morph2, playing]);
  /* The first exchange's INCOMING band, remapped to 0→1 — see above. */
  const talentIn = useTransform(morph, [0.38, 1], [0, 1]);

  /* Act two, arriving under the title it just became. */
  /* The short line: in on its own cue, out after the last card — see
     `LEAVE_ORDER`. */
  const lineOut = CUE.outFrom + LEAVE_ORDER.line * CUE.outStep;
  const lineOpacity = useTransform(
    p,
    [CUE.talentLine[0], CUE.talentLine[1], lineOut, lineOut + CUE.outEach],
    [0, 1, 1, 0],
  );
  const lineY = useTransform(
    p,
    [CUE.talentLine[0], CUE.talentLine[1], lineOut, lineOut + CUE.outEach],
    [26, 0, 0, -40],
  );

  /* The portrait goes last of all, which is what makes the column empty out
     from the bottom and leaves the picture holding the frame on its own for a
     moment before it turns away too. */
  const mediaOut = CUE.outFrom + LEAVE_ORDER.media * CUE.outStep;
  /**
   * THE FOUNDERS' MOVE, given to the talent portrait — the same
   * `ARRIVE.lead` / `DEPART.lead` the shots above travel on, MIRRORED because
   * this portrait stands on the left: in over the top-left corner from deep
   * behind the screen, square and still at rest, out past the bottom-left. Four stops per axis, as
   * there, so scrubbing back takes it apart the way it came.
   *
   * The departure runs from a little before `mediaOut` to the stage's own
   * clearing: a card crossing past the frame needs the room, as the founders'
   * exit did.
   */
  const media: [number, number, number, number] = [
    CUE.morph[0],
    CUE.morph[1],
    mediaOut - CUE.outEach * 0.6,
    /* On a phone the act's last played stretch stops where the stage starts to clear
       (`CUE.out[0]`, see `PHONE_HOLDS`) — so the portrait is gone by then, not left half-way
       out of the frame until the next gesture. */
    playing ? CUE.out[0] : CUE.out[1],
  ];
  /* MIRRORED. The founders stand on the RIGHT and come and go by the right
     edge; this portrait stands on the LEFT, so the same move is flipped about
     the vertical: in over the top-LEFT corner, out past the bottom-LEFT, with
     the yaw and roll reversed so it turns toward the frame it is entering. */
  const flip = (v: string) => (v.startsWith("-") ? v.slice(1) : `-${v}`);
  const mediaX = useTransform(p, media, [flip(ARRIVE.lead.x), "0vw", "0vw", flip(DEPART.lead.x)]);
  const mediaY = useTransform(p, media, [ARRIVE.lead.y, "0vh", "0vh", DEPART.lead.y]);
  const mediaZ = useTransform(p, media, [ARRIVE.lead.z, 0, 0, DEPART.lead.z]);
  const mediaRX = useTransform(p, media, [ARRIVE.lead.rx, 0, 0, DEPART.lead.rx]);
  const mediaRY = useTransform(p, media, [-ARRIVE.lead.ry, 0, 0, -DEPART.lead.ry]);
  const mediaTilt = useTransform(p, media, [-ARRIVE.lead.tilt, 0, 0, -DEPART.lead.tilt]);
  /* Up early and stays up — it leaves by travelling, as the founders do. */
  /* (On a phone it also fades over the second half of its way out: the departure's end, made
     for a wide screen, still leaves a corner of it in a phone's frame, and the stage that
     would clear it is not played there — see `PHONE_HOLDS`.) */
  const talentOpacity = useTransform(
    p,
    [
      media[0],
      media[0] + (media[1] - media[0]) * 0.35,
      media[2] + (media[3] - media[2]) * 0.5,
      media[3],
    ],
    [0, 1, 1, playing ? 0 : 1],
  );

  /**
   * The room's own presence — NOT the portraits'.
   *
   * It rises with the act, as they do, and then leaves on `morph2`: the light
   * goes out over exactly the stretch the heading stops saying Talent and
   * starts saying What we do. Borrowing the portraits' value instead left the
   * last room 92% lit while that title was landing, so the next chapter opened
   * in the previous one's colour — a measurable thing, and the sort that reads
   * as the page not having finished rather than as atmosphere.
   *
   * Tied to the morph rather than to a number near it, so it cannot drift out
   * of step with the handover it exists to end on.
   */
  const auraPresence = useTransform(
    p,
    [CUE.morph[0], CUE.morph[1], CUE.morph2[0], CUE.morph2[1]],
    [0, 1, 1, 0],
  );

  const stageOpacity = useTransform(p, CUE.out, [1, 0]);
  /* Not on a phone: there the pin lets go at the very end of this stretch,
     and the title is handed over at that instant — at 97% it would jump. */
  const stageScale = useTransform(p, CUE.out, playing ? [1, 1] : [1, 0.97]);

  return (
    <section
      ref={(el) => {
        /* Both read the same edge — the beat for the chapter, the entry for the
           heading that runs before it. */
        ref(el);
        headRef(el);
        sectionRef.current = el;
      }}
      className="beat"
      /**
       * PULLED UP A WHOLE SCREEN, and that is what closes the gap between the
       * chapters.
       *
       * A `position: sticky` stage always takes its own height to leave: the
       * hero's pins for half a screen and then spends a full one scrolling
       * away, and that screen had nothing in it. Starting this section a screen
       * earlier puts its stage at the top of the window on the frame the hero's
       * leaves it, so one chapter hands straight to the next.
       *
       * Everything here is measured from this section's own rect — `useBeat`,
       * `useEnter`, the closing run — so the offset costs no arithmetic
       * anywhere else. It is a position, not a parameter.
       */
      style={{
        /* On a phone the acts' scrubbing is played instead, so the pin is
           only as long as the transitions it still carries — see `HOLDS`. */
        height: `${Math.round(((playing ? phoneBeat.total : BEATS) + 1) * 100)}svh`,
        marginTop: "-100svh",
      }}
      aria-labelledby="studio-heading"
      /**
       * KEPT, and load-bearing — but no longer for a marker.
       *
       * `AboutHero` reads this attribute to know when its film has stopped
       * being the ground for anything and can fade out, so the handle outlived
       * the chapter index it was named for.
       */
      data-chapter-section="1"
    >
      <m.div
        className="beat__stage about-studio__stage px-gutter"
        /**
         * SCALE ONLY. The fade moved down onto the stage's PARTS.
         *
         * `stageOpacity` here multiplied everything the stage holds, including
         * the heading — so the heading faded with the chapter even though it is
         * the one thing meant to survive it and be handed to the staircase. The
         * same correction act one needed, for the same reason: a container's
         * exit is not every child's exit.
         */
        style={{ scale: stageScale }}
      >
        {/* ACT ONE — the studio's argument and its founders.

            THE EXIT IS ON THE PARTS, NOT ON THE ACT — the same rule act two
            below already states, and the reason is the same one: the title
            lives inside this act but does not belong to it.

            It was on this wrapper, which made act one's departure the title's
            departure too. Everything looked right until you scrolled past it:
            the morph ran perfectly, "Talent" assembled letter by letter and
            "What we do" after it, on a piece of type whose PARENT had already
            faded to zero. An element cannot be more opaque than its ancestor,
            so neither of the two titles was ever drawn — they were composited
            out one level up, which is why they left no trace to find in the
            markup or in their own values. Both read exactly as they should.

            The subtitle, the body and the founders leave. The heading stays,
            because it is about to become the next chapter's. */}
        <div className="about-studio__split" ref={splitRef}>
          <div className="about-studio__claim" ref={claimBox}>
            {/* THE TITLE LIVES HERE — three texts on one piece of type, and
                this is the first of them. It leaves for the Talent column and
                comes back by transform, which moves nothing, so this column's
                alignment and spacing are the layout's and not the animation's.
                See `titleX`. */}
            <m.h2
              ref={titleBox}
              id="studio-heading"
              className="hp-display about-title"
              /* `swap` is 1 until the staircase's own heading reaches this
                 height, then 0 — see the hand-over above. Multiplied in rather
                 than animated, so there is no fade: one is drawn or the other
                 is, never a blend of both. */
              style={{ x: titleX, y: titleY, opacity: swap }}
            >
              <ScrollMorph from={TITLE} progress={morph} enter={titleIn} />
              <ScrollMorph
                from={["Talent"]}
                to={["What we do"]}
                progress={morph2}
                enter={talentIn}
              />
            </m.h2>

            {/* The subtitle. Same letter-by-letter arrival the claim always
                had — same component, same `headP` — at a subtitle's size and
                in the subtitle's colour. */}
            <m.p
              className="hp-display about-studio__sub"
              style={{ opacity: claimOpacity, y: claimY }}
            >
              <ScrollChars lines={SUBTITLE} progress={subIn} from={54} />
            </m.p>

            <m.div
              className="about-studio__beats"
              ref={beatsRef}
              style={{ opacity: beatsOpacity, y: beatsY }}
            >
              {BODY.map((text, i) => (
                <Beat
                  key={i}
                  text={text}
                  order={i}
                  p={p}
                  stacked={singleColumn}
                />
              ))}
            </m.div>
          </div>

          <m.div
            className="about-studio__people"
            style={{ opacity: claimOpacity, y: claimY }}
          >
            <Cast p={p} phone={playing} />
          </m.div>
        </div>

        {/* ACT TWO — the portrait that turns over, and the list beside it. */}
        {/* ACT TWO. The opacity is on the act's PARTS rather than on the act,
            because the title lives inside it and must be visible through the
            whole of act one. */}
        <m.div className="talent-act" style={{ opacity: stageOpacity }}>
          {/* The room, lit by whichever portrait is turned to face the reader.
              Behind everything in this act and driven by the same `p` and the
              same `SHOT_BOUNDS` the stack turns on, so the light and the
              picture cannot come apart. It adds nothing to the layout: it is
              absolutely positioned and takes no pointer. */}
          <TalentAura
            shots={playing ? PHONE_SHOTS : SHOTS}
            bounds={playing ? PHONE_SHOT_BOUNDS : SHOT_BOUNDS}
            progress={p}
            presence={auraPresence}
          />

          <m.div
            className="talent-act__media"
            style={{
              opacity: talentOpacity,
              x: mediaX,
              y: mediaY,
              z: mediaZ,
              rotateX: mediaRX,
              rotateY: mediaRY,
              rotate: mediaTilt,
              /* The founders' composition is seen through 900px; so is this. */
              transformPerspective: 900,
            }}
          >
            <TalentStack
              shots={playing ? PHONE_SHOTS : SHOTS}
              bounds={playing ? PHONE_SHOT_BOUNDS : SHOT_BOUNDS}
              progress={p}
            />
          </m.div>

          <div className="talent-act__body" ref={talentBox}>
            <div>
              <m.p
                className="hp-copy talent-act__line"
                style={{ opacity: lineOpacity, y: lineY }}
              >
                {TALENT_LINE}
              </m.p>

              <ol className="talent-act__list">
                {CRAFT.map((item, i) => (
                  <Card key={item.id} item={item} order={i} p={p} />
                ))}
              </ol>
            </div>
          </div>
        </m.div>
      </m.div>
    </section>
  );
}

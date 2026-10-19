/**
 * The footer's line figure on a PHONE, laid out from where the footer's blocks actually stand
 * — shared by the homepage footer (scripts/footer.ts) and the inner pages' (site-footer.tsx),
 * so the two draw one figure.
 *
 * A fixed board sliced to the window put the guides through the words on most phones. Here the
 * figure is composed around the type, the way the desktop plate is: one guide in the gap above
 * the call to talk and one in the gap below it, and two circles (the small ring is not drawn on
 * a phone — see footer.css; nor, now, the upright). The large one is centred on the right edge,
 * so exactly its left half is drawn — top and bottom held inside the footer, above the small
 * print — and it is placed to cut both guides: the two registration crosses sit on its true
 * crossings with them (the upper guide, and the lower one further left), computed, not
 * eyeballed. Nothing reaches the wordmark.
 *
 * Measured with `offset*`, which ignores the reveals' own transforms.
 */
export interface PhonePlate {
  w: number;
  h: number;
  yA: number;
  yB: number;
  vx: number;
  vTop: number;
  vBottom: number;
  /** the small ring */
  ring: { cx: number; cy: number; r: number };
  /** the large circle's visible half, a path */
  sweep: string;
  crosses: [number, number][];
}

const boxIn = (el: HTMLElement | null, stage: HTMLElement) => {
  if (!el) return null;
  let top = 0;
  let left = 0;
  let n: HTMLElement | null = el;
  while (n && n !== stage) {
    top += n.offsetTop;
    left += n.offsetLeft;
    n = n.offsetParent as HTMLElement | null;
  }
  if (n !== stage) return null;
  return { top, left, bottom: top + el.offsetHeight, right: left + el.offsetWidth };
};

export function phonePlate(stage: HTMLElement): PhonePlate | null {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  const groups = Array.from(stage.querySelectorAll<HTMLElement>(".footer__group"))
    .map((g) => boxIn(g, stage))
    .filter((b): b is NonNullable<typeof b> => !!b);
  const contact = boxIn(stage.querySelector<HTMLElement>(".footer__contact"), stage);
  const say = boxIn(stage.querySelector<HTMLElement>(".footer__say-text"), stage);
  const base = boxIn(stage.querySelector<HTMLElement>(".footer__base"), stage);
  // the block under the call to talk: the tagline — or, where a phone hides it, the small print
  const tagline = boxIn(stage.querySelector<HTMLElement>(".footer__tagline"), stage) ?? base;
  if (!w || !h || !groups.length || !contact || !tagline) return null;

  const r1 = (v: number) => Math.round(v * 10) / 10;
  const groupsEnd = Math.max(...groups.map((g) => g.bottom));
  const yA = r1((groupsEnd + contact.top) / 2);
  const yB = r1((contact.bottom + tagline.top) / 2);
  const gap = yB - yA;
  const below = tagline.top - contact.bottom;

  // The large circle: centred on the right edge a little below the guides' midline, so the
  // lower guide cuts it further left than the upper one. As large as the room allows — its
  // foot at the footer's own, never past it — and larger than it was: it may run
  // behind the words SAY HELLO now (it is a hairline at 16%), as the figure's one big shape.
  const cy = r1(yA + gap * 0.62);
  // (down to the footer's own foot now, behind the small print, rather than stopping above it)
  void base;
  void say;
  const floor = h - 6;
  let R = Math.min(w * 0.36, floor - cy, cy - groups[0].top); // (about 1.4× its old size on a 375px phone)
  R = r1(Math.min(Math.max(R, (cy - yA) * 1.18), cy, h - cy)); // it must cut the upper guide cleanly
  const sweep = `M ${w} ${r1(cy - R)} A ${R} ${R} 0 0 0 ${w} ${r1(cy + R)}`;
  // its true crossings with the two guides
  const vx = r1(w - Math.sqrt(R * R - (yA - cy) ** 2));
  const xB = r1(w - Math.sqrt(Math.max(0, R * R - (yB - cy) ** 2)));

  // The small ring: on the upper guide, in the open gap left of the links' second column
  const room = Math.min(yA - groupsEnd, contact.top - yA);
  const ring = { cx: r1(w * 0.5), cy: yA, r: r1(Math.max(10, Math.min(w * 0.06, room * 0.8))) };

  return {
    w,
    h,
    yA,
    yB,
    vx,
    vTop: r1(Math.max(groupsEnd - (contact.top - groupsEnd) * 0.2, yA - Math.max(contact.top - groupsEnd, 24) * 0.9)),
    // no upright on a phone any more: drawn as nothing (the crosses still mark the circle's
    // true crossings with the two guides)
    vBottom: r1(Math.max(groupsEnd - (contact.top - groupsEnd) * 0.2, yA - Math.max(contact.top - groupsEnd, 24) * 0.9)),
    ring,
    sweep,
    crosses: [
      [vx, yA],
      [xB, yB],
    ],
  };
}

export const crossD = (pts: [number, number][], t: number) =>
  pts.map(([x, y]) => `M ${x - t} ${y} H ${x + t} M ${x} ${y - t} V ${y + t}`).join(" ");

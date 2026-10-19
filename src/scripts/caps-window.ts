/**
 * The capability window's resting box, READ OFF THE STYLESHEET.
 *
 * `--wt/--wr/--wb/--wl` in capabilities.css are the only definition of the window.
 * Two timelines need it as numbers: Chapter 02's film shrinks into it (studio.ts) and the
 * capabilities hand-off grows out of it (capabilities.ts). They used to carry their own copy
 * as literal percentages, so a window defined any other way — on a phone its foot is set by
 * the title list's height, a `calc()` — left the film landing short of the frame and the
 * hand-off tweening from a value it could not parse.
 *
 * Resolved by a probe inside the stage, so a percentage resolves against the same box the
 * frame's own insets do, and returned as percentages of that stage.
 */
export interface CapsWindow {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function capsWindow(ref?: HTMLElement | null): CapsWindow | null {
  const stage = document.querySelector<HTMLElement>(".caps__stage");
  if (!stage || stage.clientWidth === 0 || stage.clientHeight === 0) return null;

  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;";
  stage.appendChild(probe);
  const read = (axis: "height" | "width", name: string) => {
    probe.style[axis] = `var(${name}, 0px)`;
    return axis === "height" ? probe.offsetHeight : probe.offsetWidth;
  };
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  const px = { top: read("height", "--wt"), bottom: read("height", "--wb"), right: read("width", "--wr"), left: read("width", "--wl") };
  probe.remove();
  // As percentages of `ref`'s own box when one is given (the film shrinking into the window
  // lives in another stage): the same frame in pixels — its top and left from the top-left,
  // its foot and right edge where they stand in this stage — so a stage of another height
  // (a phone's browser bars can leave the two a few dozen pixels apart) cannot stretch it
  const rw = ref?.clientWidth || w;
  const rh = ref?.clientHeight || h;
  return {
    top: (px.top / rh) * 100,
    left: (px.left / rw) * 100,
    bottom: (Math.max(0, rh - (h - px.bottom)) / rh) * 100,
    right: (Math.max(0, rw - (w - px.right)) / rw) * 100,
  };
}

/** The same box as a `clip-path` inset, the form studio.ts keeps its windows in. */
export const capsInset = (fallback: string, ref?: HTMLElement | null) => {
  const b = capsWindow(ref);
  return b ? `inset(${b.top}% ${b.right}% ${b.bottom}% ${b.left}%)` : fallback;
};

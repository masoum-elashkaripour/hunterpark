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

export function capsWindow(): CapsWindow | null {
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
  const box = {
    top: (read("height", "--wt") / h) * 100,
    bottom: (read("height", "--wb") / h) * 100,
    right: (read("width", "--wr") / w) * 100,
    left: (read("width", "--wl") / w) * 100,
  };
  probe.remove();
  return box;
}

/** The same box as a `clip-path` inset, the form studio.ts keeps its windows in. */
export const capsInset = (fallback: string) => {
  const b = capsWindow();
  return b ? `inset(${b.top}% ${b.right}% ${b.bottom}% ${b.left}%)` : fallback;
};

/**
 * Tiny shared lifecycle so sections can choreograph their intro against the preloader.
 * The preloader calls `markSiteReady()` the moment its exit reveals the page;
 * anything that animates in on load subscribes with `onSiteReady()`.
 */
let ready = false;
const listeners: Array<() => void> = [];

export function onSiteReady(callback: () => void): void {
  if (ready) callback();
  else listeners.push(callback);
}

export function markSiteReady(): void {
  if (ready) return;
  ready = true;
  document.documentElement.dataset.siteReady = "";
  listeners.splice(0).forEach((cb) => cb());
}

export const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * An SVG shape's length, for drawing it with stroke-dashoffset.
 * getTotalLength() throws in Chrome while the shape isn't rendered (e.g. a hidden
 * ancestor at this breakpoint) — then normalise the path to a length of 1 instead.
 */
export function strokeLength(el: SVGGeometryElement): number {
  try {
    return el.getTotalLength();
  } catch {
    el.setAttribute("pathLength", "1");
    return 1;
  }
}

/**
 * Whether the reel is allowed to play with sound.
 *
 * A module-level store rather than React state because the two ends of it are
 * nowhere near each other in the tree: the switch is in the site header, and
 * the thing it controls is a bare `<video>` element created imperatively
 * inside the 3D stage's `useEffect`. Threading a prop between them would mean
 * passing it through the page, the carousel and the lazy wrapper, and would
 * re-render the stage — which rebuilds its whole scene — on every toggle.
 *
 * Starts muted, and must: browsers refuse `play()` on an unmuted element that
 * the reader has not yet interacted with, so the reel would simply not start.
 */

let enabled = false;
const listeners = new Set<(on: boolean) => void>();

export function soundEnabled() {
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  if (on === enabled) return;
  enabled = on;
  for (const listener of listeners) listener(on);
}

/** Returns an unsubscribe function, so effects can clean up. */
export function onSoundChange(listener: (on: boolean) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

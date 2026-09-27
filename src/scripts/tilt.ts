import { gsap } from "gsap";
import { prefersReducedMotion } from "./lifecycle";

/**
 * Physical tilt: an element leans toward the pointer as if it had weight.
 *
 * Pointer position (relative to `area`) sets a target; each axis then chases that
 * target through a damped spring on GSAP's ticker, so the element lags, overshoots
 * a hair and settles — never a 1:1 cursor follow. Only transforms are written
 * (GPU-composited), and the ticker sleeps once everything has come to rest.
 *
 * Pointer-only: touch devices, coarse pointers and reduced motion get nothing.
 */
export interface TiltOptions {
  /** Element whose bounds the pointer is measured against (defaults to the target). */
  area?: HTMLElement;
  /** Max translation in px at the area's edges. */
  moveX?: number;
  moveY?: number;
  /** Max rotation in degrees at the area's edges. */
  rotateX?: number;
  rotateY?: number;
  /** Perspective distance in px — larger reads flatter. */
  perspective?: number;
  /** Spring stiffness / damping — lower stiffness = heavier; damping just under critical = soft settle. */
  stiffness?: number;
  damping?: number;
}

type Axis = "x" | "y" | "rotationX" | "rotationY";

export function createTilt(target: HTMLElement, options: TiltOptions = {}): () => void {
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!canHover || prefersReducedMotion()) return () => {};

  const {
    area = target,
    moveX = 16,
    moveY = 10,
    rotateX = 4,
    rotateY = 4.5,
    perspective = 1400,
    stiffness = 55,
    damping = 13,
  } = options;

  gsap.set(target, { transformPerspective: perspective, force3D: true });

  const axes: Axis[] = ["x", "y", "rotationX", "rotationY"];
  const setters = Object.fromEntries(axes.map((a) => [a, gsap.quickSetter(target, a, a.startsWith("r") ? "deg" : "px")])) as Record<Axis, (v: number) => void>;
  const pos: Record<Axis, number> = { x: 0, y: 0, rotationX: 0, rotationY: 0 };
  const vel: Record<Axis, number> = { x: 0, y: 0, rotationX: 0, rotationY: 0 };
  const goal: Record<Axis, number> = { x: 0, y: 0, rotationX: 0, rotationY: 0 };
  let running = false;

  const tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs, 48) / 1000; // clamp so a dropped frame can't fling it
    let moving = false;
    for (const a of axes) {
      const accel = stiffness * (goal[a] - pos[a]) - damping * vel[a];
      vel[a] += accel * dt;
      pos[a] += vel[a] * dt;
      setters[a](pos[a]);
      if (Math.abs(goal[a] - pos[a]) > 0.01 || Math.abs(vel[a]) > 0.01) moving = true;
    }
    if (!moving) stop();
  };

  const start = () => {
    if (running) return;
    running = true;
    gsap.ticker.add(tick);
  };
  const stop = () => {
    running = false;
    gsap.ticker.remove(tick);
  };

  const onLeave = () => {
    for (const a of axes) goal[a] = 0;
    start();
  };

  // Tracked on the window (the fixed header overlaps the area), measured against the area.
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const rect = area.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) return onLeave();
    // -1…1 from the area's centre, eased at the edges so corners don't max out harshly
    const nx = gsap.utils.clamp(-1, 1, (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2));
    const ny = gsap.utils.clamp(-1, 1, (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2));
    const soft = (n: number) => Math.sin((n * Math.PI) / 2);
    goal.x = soft(nx) * moveX;
    goal.y = soft(ny) * moveY;
    goal.rotationY = soft(nx) * rotateY; // pointer right → right edge swings away
    goal.rotationX = -soft(ny) * rotateX; // pointer up → top edge swings away
    start();
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);

  return () => {
    stop();
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    gsap.set(target, { clearProps: "transform" });
  };
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * A tile's still, with its clip playing while the pointer is on it.
 *
 * The clip is only attached on the FIRST hover and kept afterwards: mounting a
 * `<video>` per tile up front would put thirty-one of them on the page, and
 * even at `preload="none"` that is thirty-one elements the browser has to keep
 * warm. Nothing is fetched until a card is actually pointed at.
 *
 * Hover only — `pointerenter` from a touch would start a clip the user cannot
 * as easily stop, and reduced motion opts out entirely.
 */
export function TileMedia({
  poster,
  video,
  sizes,
}: {
  poster: string;
  /** Absent for a photo project: the still IS the work, so nothing plays. */
  video?: string;
  sizes: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  /** Set once the pointer has ever been over this tile. */
  const [armed, setArmed] = useState(false);
  /** The clip has a frame and may be shown. */
  const [playing, setPlaying] = useState(false);

  const enter = () => {
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Coarse pointers scroll past tiles; they should not trigger playback.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    setArmed(true);
  };

  const leave = () => {
    setPlaying(false);
    const el = videoRef.current;
    if (el) {
      el.pause();
      // Back to the first frame so the next hover starts the shot again.
      el.currentTime = 0;
    }
  };

  // Runs on the hover that mounts the clip, and on every later one.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !armed) return;

    const onReady = () => setPlaying(true);
    if (el.readyState >= 3) setPlaying(true);
    el.addEventListener("canplay", onReady);

    return () => el.removeEventListener("canplay", onReady);
  }, [armed]);

  const play = () => {
    const el = videoRef.current;
    if (!el) return;
    void el.play().catch(() => {
      /* Refused — the still simply stays up. */
    });
  };

  return (
    <span
      className="absolute inset-0 block"
      onPointerEnter={enter}
      onPointerLeave={leave}
      // `armed` only mounts the element; this starts it, including on the
      // second and later hovers when the element is already there.
      onPointerOver={armed ? play : undefined}
    >
      {/* `quality={90}`: these stills are already one generation of
          compression away from the footage, so the optimiser's default 75 puts
          a second one on top and the softness shows at card size. */}
      <Image
        src={poster}
        alt=""
        fill
        sizes={sizes}
        quality={90}
        className="object-cover"
      />

      {armed && video ? (
        <video
          ref={videoRef}
          src={video}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          tabIndex={-1}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-hp-out ${
            playing ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}
    </span>
  );
}

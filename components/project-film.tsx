"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * The project's film.
 *
 * The poster stays painted underneath until the clip actually has a frame —
 * swapping on `play()` alone leaves a black panel for as long as the file takes
 * to buffer, and the poster is a still lifted from this same clip, so the cut
 * between them is invisible.
 *
 * Autoplay is muted and inline (nothing else is allowed to start on its own),
 * and is skipped entirely for reduced motion: those users get the still plus
 * the native controls.
 */
export function ProjectFilm({
  video,
  poster,
  label,
}: {
  video: string;
  poster: string;
  label: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onReady = () => setShowing(true);
    // `canplay` can have fired before this effect ran on a cached clip.
    if (el.readyState >= 3) setShowing(true);
    el.addEventListener("canplay", onReady);

    /* Reduced motion means DON'T AUTOPLAY, not "no film" — the element is
       visible either way and its controls work, so the reader can start it. */
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void el.play().catch(() => {
        /* Refused — the poster stays up and the controls still work. */
      });
    }

    return () => el.removeEventListener("canplay", onReady);
  }, []);

  return (
    <>
      <Image
        src={poster}
        alt={label}
        fill
        sizes="100vw"
        quality={90}
        priority
        className={`object-cover transition-opacity duration-500 ease-hp-out ${
          showing ? "opacity-0" : "opacity-100"
        }`}
      />
      <video
        ref={videoRef}
        src={video}
        poster={poster}
        muted
        loop
        playsInline
        controls
        preload="metadata"
        aria-label={label}
        /* Always visible. It used to be faded in on `canplay`, which meant a
           clip that never reported one — autoplay refused, or reduced motion
           skipping `play()` entirely — sat at zero opacity with its controls
           invisible, indistinguishable from a video that had failed to load.
           It needs no cover: the element paints its own `poster` until it has
           a frame, and the still below is the same image. */
        className="absolute inset-0 h-full w-full object-cover"
      />
    </>
  );
}

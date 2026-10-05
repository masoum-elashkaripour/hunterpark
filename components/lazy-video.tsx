"use client";

import { useEffect, useState } from "react";

/**
 * A clip that costs nothing until the reader is near it.
 *
 * The staircase's films sit twelve and fourteen screens down the page, and they
 * were written as plain `<video autoPlay preload="auto">` — which downloads the
 * WHOLE file the moment the element mounts. Measured on `/about`: 9.22MB for a
 * clip the reader would not reach for another thirteen screens, inside a page
 * that pulled 38MB in total. Nothing was wrong with the clips; they were simply
 * all being fetched at once, at the top of the page.
 *
 * THE DEFERRAL IS IN `src`, NOT IN `preload`. `preload="none"` is only a hint,
 * and `autoPlay` overrides it outright — an autoplaying element starts loading
 * as soon as it has a source, whatever preload says. An element with no `src`
 * at all has nothing to fetch, so the attribute is set when the observer says
 * the clip is close and not before. That is the difference between a hint and a
 * guarantee.
 *
 * It also stops when the clip is far away, which is the same contract the WebGL
 * scenes on this site run under: a render loop gated by an IntersectionObserver
 * so it pauses off-screen. A decoding video is work whether or not anybody can
 * see it.
 */
export function LazyVideo({
  src,
  poster,
  className,
  /**
   * How close is close enough, as a share of the viewport.
   *
   * Generous on purpose. The margin has to cover the distance the reader can
   * cross between the observer firing and the first frame being wanted — and
   * for the closing sequence it also has to cover the hand-over, where the
   * fullscreen layer continues the playhead the step was already on. A clip
   * that begins loading as it enters the window arrives visibly late.
   */
  near = "200% 0px",
  onReady,
  ...rest
}: {
  src: string;
  poster?: string;
  className?: string;
  near?: string;
  /** Handed the element once it exists, for callers that drive it directly. */
  onReady?: (el: HTMLVideoElement | null) => void;
} & React.VideoHTMLAttributes<HTMLVideoElement>) {
  const [el, setEl] = useState<HTMLVideoElement | null>(null);
  const [close, setClose] = useState(false);

  useEffect(() => {
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setClose(entry.isIntersecting),
      { rootMargin: near },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, near]);

  useEffect(() => {
    if (!el) return;

    if (!close) {
      el.pause();
      return;
    }

    /* Set once. Re-assigning `src` to the value it already holds reloads the
       element and throws away everything it has buffered. */
    if (!el.getAttribute("src")) el.setAttribute("src", src);
    /* Autoplay can be refused before the reader has interacted with the page;
       asking again costs nothing and recovers it. The poster is the step's own
       frame either way, so a refusal is not a blank box. */
    void el.play().catch(() => {});
  }, [el, close, src]);

  return (
    <video
      ref={(node) => {
        setEl(node);
        onReady?.(node);
      }}
      poster={poster}
      className={className}
      muted
      loop
      playsInline
      preload="none"
      {...rest}
    />
  );
}

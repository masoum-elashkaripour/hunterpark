/**
 * Preloader → Hero image hand-off.
 *
 * The hero's first background (<img> or <video>) is borrowed by the preloader, shown as the
 * final card of the collage, expanded to full bleed, then put back exactly where
 * it came from. One element, one request, one decode: nothing is reloaded or swapped.
 */
let marker: Comment | null = null;
let borrowed: HTMLImageElement | HTMLVideoElement | null = null;

export function borrowHeroImage(): HTMLImageElement | HTMLVideoElement | null {
  const img = document.querySelector<HTMLImageElement | HTMLVideoElement>('[data-hero-bg="0"]');
  if (!img?.parentNode) return null;
  marker = document.createComment("hero-bg-0");
  img.parentNode.insertBefore(marker, img);
  borrowed = img;
  return img;
}

export function returnHeroImage(): void {
  if (!marker || !borrowed) return;
  const film = borrowed instanceof HTMLVideoElement && !borrowed.paused ? borrowed : null;
  marker.parentNode?.insertBefore(borrowed, marker);
  marker.remove();
  // Re-parenting can pause a playing <video>; carry straight on from the same frame.
  film?.play().catch(() => {});
  marker = borrowed = null;
}

/**
 * A film used as a moving layer inside a scroll stage (not a player):
 * muted, looping, inline, no controls. It loads nothing until the stage asks
 * for it (preload="none"; scripts/stage-video.ts plays/pauses by visibility),
 * and its poster frame stands in until then — and under reduced motion.
 */
import { getImageProps } from "next/image";
import type { StageFilm } from "../../data/media";

export default function StageVideo({ film, className, ...data }: { film: StageFilm; className?: string } & Record<`data-${string}`, string | boolean>) {
  const poster = getImageProps({ src: film.poster, alt: "", width: 1080, quality: 70 }).props.src;
  return (
    <video
      className={className}
      style={{ objectPosition: film.focus }}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      data-stage-video
      {...data}
    >
      <source src={film.sd} type="video/mp4" media="(max-width: 767px)" />
      <source src={film.hd} type="video/mp4" />
    </video>
  );
}

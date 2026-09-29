/**
 * Preloader — "the drop".
 * Photographs from the studio's archive are dropped one by one behind the
 * HunterPark wordmark as loading progresses. The last one to land is the
 * hero's own background element: at 100% it opens out to full bleed while the
 * wordmark flies up into the header, and the page is simply… there.
 * Behaviour lives in scripts/preloader.ts (started by <SiteScripts />).
 */
import { getImageProps } from "next/image";
import { collagePool } from "../../data/media";
import type { PreloaderCard } from "../../scripts/preloader";

// Candidate photographs, serialised for the script: it picks a random handful and
// only then creates the <img>s, so unused candidates are never downloaded.
const cards: PreloaderCard[] = collagePool.map((still) => {
  const { props } = getImageProps({
    src: still.src,
    alt: "",
    sizes: "(max-width: 767px) 34vw, 18vw",
    quality: 70,
  });
  return {
    src: props.src,
    srcSet: props.srcSet,
    sizes: props.sizes,
    ratio: Number((still.src.width / still.src.height).toFixed(3)),
  };
});

export default function Preloader() {
  return (
    <div className="preloader" data-preloader aria-hidden="true">
      <div className="preloader__stack" data-stack></div>

      {/* The hero's first background element is moved in here at runtime (see hero-handoff.ts) */}
      <div className="preloader__final" data-final>
        <span className="preloader__shade" data-shade></span>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- SVG wordmark, FLIP-animated by the script */}
      <img className="preloader__logo" src="/brand/logo.svg" alt="" width={1096} height={179} data-logo />

      <p className="preloader__count">
        <span data-count>00</span>
        <span className="preloader__unit">%</span>
      </p>

      <script type="application/json" data-cards dangerouslySetInnerHTML={{ __html: JSON.stringify(cards) }} />
    </div>
  );
}

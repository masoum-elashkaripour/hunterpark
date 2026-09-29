import Hero from "../components/hero/Hero";
import Studio from "../components/studio/Studio";
import ChapterIndicator from "../components/chapter/ChapterIndicator";
import Capabilities from "../components/capabilities/Capabilities";
import Work from "../components/work/Work";

export default function HomePage() {
  return (
    <>
      <ChapterIndicator />
      {/* One continuous "film": with motion on, the chapters are stacked in a single
          pinned stage and play into each other (scripts/film.ts). Without motion
          they simply follow one another. */}
      <div className="film" data-film>
        {/* Chapter 01 — Intro */}
        <Hero />
        {/* Chapter 02 — Studio */}
        <Studio />
        {/* Chapter 02 — What we do: the capabilities, handing off to Chapter 03 */}
        <Capabilities />
        {/* Chapter 03 — Work: WORK clears, the last capability becomes the first project */}
        <Work />
      </div>
    </>
  );
}

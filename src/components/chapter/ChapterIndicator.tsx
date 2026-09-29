/**
 * The film's running chapter marker — "01 — INTRO", later "02 — STUDIO".
 * Fixed bottom-left (down the left edge on small screens), tiny and quiet.
 * One row per chapter in a masked track; scripts/chapter-indicator.ts rolls
 * the track as the page moves from one chapter into the next.
 * Decorative: each section carries its own accessible chapter label.
 */
export const chapters = [
  { number: "01", title: "Intro" },
  { number: "02", title: "Studio" },
  { number: "03", title: "Work" },
] as const;

export default function ChapterIndicator() {
  return (
    <div className="chapter-index" aria-hidden="true" data-chapter-index>
      <span className="chapter-index__track" data-chapter-track style={{ ["--rows" as string]: chapters.length }}>
        {chapters.map((chapter) => (
          <span className="chapter-index__row" key={chapter.number}>
            <span className="chapter-index__num">{chapter.number}</span>
            <span className="chapter-index__rule" />
            <span className="chapter-index__title">{chapter.title}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

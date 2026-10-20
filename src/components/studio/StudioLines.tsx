/**
 * The WHO WE ARE lime line system: large-scale editorial linework behind the
 * typography — a wide arc, two hairline guides, a vertical and a long diagonal —
 * over a very soft glow. Lives inside the WHO WE ARE block only; drawn directly by
 * scroll (scripts/studio.ts), using each shape's measured length so every browser
 * draws it the same way.
 */
export default function StudioLines() {
  return (
    <div className="studio-lines" aria-hidden="true" data-studio-lines>
      <span className="studio-lines__glow" data-studio-glow />
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="studio-lines__svg">
        <g data-studio-line-group>
          <circle cx="1180" cy="560" r="440" data-studio-line="arc" />
          <line x1="0" y1="330" x2="1600" y2="330" data-studio-line />
          <line x1="0" y1="742" x2="1600" y2="742" data-studio-line="low" />
          <line x1="470" y1="0" x2="470" y2="1000" data-studio-line />
          <line x1="0" y1="1000" x2="1600" y2="150" data-studio-line />
        </g>
      </svg>
    </div>
  );
}

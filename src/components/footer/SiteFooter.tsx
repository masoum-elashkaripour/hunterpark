/**
 * Site footer — the film's last frame.
 * With motion on it is the final beat of the homepage film (scripts/footer.ts): the call to
 * action's words part to either edge of the frame, the header's wordmark leaves its slot and
 * descends, growing, to sign the page across the bottom, and the footer's information
 * settles around it. Without motion it simply follows the page.
 *
 * An asymmetric editorial composition, not columns: a statement top-left, the index and
 * social links stepped down the right, the invitation to get in touch, the tagline and the
 * small print, all resting on the wordmark — over a line field that spans the whole section.
 */

import { socialLinks, tagline } from "../../data/navigation";
import { SplitWords } from "../motion/SplitText";

// The site's pages. (A "#chapter" href here would still be moved to by the film —
// scripts/footer.ts — rather than jumped to.)
const index = [
  { label: "About", href: "/about" },
  { label: "Work", href: "/work" },
  { label: "News", href: "/news" },
] as const;

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 12L12 4M5.5 4H12v6.5" />
    </svg>
  );
}

/**
 * The footer's line field — WHO WE ARE's system (lime hairlines, one great curve, full-width
 * guides, a vertical and a long diagonal, over a soft glow) in a new figure that spans the
 * whole section. Laid out around the footer's type rather than across it: the guides run in
 * the bands between the blocks, the vertical in the gutter between the statement and the
 * links, a whole circle and a long arc through the open space, and every line stops short of
 * the wordmark.
 * Registration crosses mark where the figure meets itself.
 *
 * Two arrangements, because the type sits differently: a landscape field (1600 × 1000, laid
 * out against the desktop footer) and a portrait one (390 × 844, against the phone footer).
 */
type Pt = [number, number];
const arcPath = (c: Pt, r: number, from: number, to: number) => {
  const at = (deg: number) => [c[0] + r * Math.cos((deg * Math.PI) / 180), c[1] + r * Math.sin((deg * Math.PI) / 180)].map((v) => v.toFixed(1));
  const [x1, y1] = at(from);
  const [x2, y2] = at(to);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};
const crossPath = (points: Pt[], size: number) => points.map(([x, y]) => `M ${x - size} ${y} H ${x + size} M ${x} ${y - size} V ${y + size}`).join(" ");

const FIELDS = {
  wide: {
    viewBox: "0 0 1600 1000",
    // (endpoints held clear of the small print and the wordmark at every desktop proportion)
    ring: { c: [470, 500] as Pt, r: 180 }, // a whole circle in the open band, left: clear of the statement, tagline and wordmark
    sweep: { c: [1600, 1000] as Pt, r: 520, from: 225, to: 270 }, // the open band, right: under SAY HELLO, above the small print
    guides: ["M 0 340 H 1600", "M 0 560 H 1600", "M 880 0 V 620"], // between the blocks; the vertical stops above the small print
    diagonal: "M 0 640 L 880 340",
    crosses: [[880, 340], [880, 560], [300, 560], [640, 560]] as Pt[], // where the circle meets the guide
    cross: 9,
  },
  // (before it is measured: lib/footer-plate.ts lays the same figure from the real layout)
  tall: {
    viewBox: "0 0 390 844",
    ring: { c: [195, 355] as Pt, r: 22 },
    sweep: { c: [390, 472.8] as Pt, r: 156, from: 90, to: 270 }, // the large circle's left half
    guides: ["M 0 355 H 390", "M 0 545 H 390", "M 287.7 290 V 600"],
    diagonal: null,
    crosses: [[287.7, 355], [251.7, 545]] as Pt[], // on its crossings with the guides
    cross: 5,
  },
};

function FooterLines({ field }: { field: keyof typeof FIELDS }) {
  const f = FIELDS[field];
  /* The phone figure is redrawn from the footer's real layout (scripts/footer.ts →
     lib/footer-plate.ts): its parts are named for that, and drawn on a normalised length so
     their reveal holds whatever shape they are given. */
  const tall = field === "tall";
  const part = (name: string) => (tall ? { "data-plate": name, pathLength: 1 } : {});
  return (
    <svg className={`footer__lines footer__lines--${field}`} viewBox={f.viewBox} preserveAspectRatio="xMidYMid slice" aria-hidden="true" {...(tall ? { "data-footer-tall": "" } : {})}>
      <g data-footer-arcs data-origin={f.ring.c.join(" ")}>
        <circle cx={f.ring.c[0]} cy={f.ring.c[1]} r={f.ring.r} data-footer-line {...part("ring")} />
        <path d={arcPath(f.sweep.c, f.sweep.r, f.sweep.from, f.sweep.to)} data-footer-line {...part("sweep")} />
      </g>
      <g data-footer-guides>
        {f.guides.map((d, i) => (
          <path d={d} data-footer-line key={d} {...part(`g${i}`)} />
        ))}
        {f.diagonal && <path d={f.diagonal} data-footer-line />}
        <path d={crossPath(f.crosses, f.cross)} data-footer-line="cross" {...part("cross")} />
      </g>
    </svg>
  );
}

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer" data-footer>
      <div className="footer__stage" data-footer-stage>
        {/* The night the footer is set on — rises over the call to action's blurred frame */}
        <div className="footer__ground" aria-hidden="true" data-footer-ground />

        {/* The line field: the whole section, behind the type (decorative) */}
        <div className="footer__pattern" aria-hidden="true" data-footer-pattern>
          <span className="footer__glow" data-footer-glow />
          <FooterLines field="wide" />
          <FooterLines field="tall" />
        </div>

        <div className="footer__grid">
          <SplitWords
            as="p"
            className="footer__statement"
            segments={[
              { text: "A creative production studio for" },
              { text: "film, photography, design", em: true },
              { text: "and visual storytelling." },
            ]}
          />

          <nav className="footer__group footer__group--index" aria-label="Footer">
            <p className="footer__label" data-footer-item>
              <span>Index</span>
            </p>
            <ul>
              {index.map((item) => (
                <li key={item.label} data-footer-item>
                  <a className="footer__link" href={item.href} data-footer-jump={item.href.startsWith("#") ? item.href.slice(1) : undefined}>
                    <span className="footer__roll" data-text={item.label}>
                      <span>{item.label}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="footer__group footer__group--social">
            <p className="footer__label" data-footer-item>
              <span>Follow</span>
            </p>
            <ul>
              {socialLinks.map((item) => (
                <li key={item.label} data-footer-item>
                  <a className="footer__link" href={item.href} target="_blank" rel="noopener noreferrer">
                    <span className="footer__roll" data-text={item.label}>
                      <span>{item.label}</span>
                    </span>
                    <Arrow />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__contact">
            <p className="footer__label" data-footer-item>
              <span>New project</span>
            </p>
            <a className="footer__say" href="/contact" data-footer-item>
              <span className="footer__say-text">Say hello</span>
              <span className="footer__say-arrow">
                <Arrow />
              </span>
            </a>
          </div>

          <p className="footer__tagline" data-footer-item>
            {tagline.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>

          <div className="footer__base">
            <span className="footer__rule" aria-hidden="true" data-footer-rule />
            <p className="footer__small" data-footer-item>
              © {year} HunterPark
            </p>
            <a className="footer__small footer__top" href="#main" data-footer-top data-footer-item>
              Back to top <span aria-hidden="true">↑</span>
            </a>
          </div>

          {/* The signature: the header's wordmark, descended and grown across the bottom */}
          <p className="footer__mark" data-footer-mark>
            <img src="/brand/logo.svg" alt="HunterPark" width={1096} height={179} decoding="async" />
          </p>
        </div>
      </div>
    </footer>
  );
}

import type { Metadata, Viewport } from "next";
import "@fontsource-variable/instrument-sans";
import "../styles/global.css";
import "../styles/components/header.css";
import "../styles/components/not-found.css";

/**
 * The 404 for unmatched URLs. The app has two root layouts — (home) and
 * (site) — so there is no single layout to build one from; see
 * `experimental.globalNotFound` in next.config.ts. It bypasses both layouts,
 * so it brings its own stylesheets: the homepage's base (tokens, fonts, the
 * night ground), the header's Contact ticket, and its own composition.
 *
 * Static and script-free: the homepage's lockup ("We do not HUNT, we are not
 * a PARK.") turned on itself, a way home and the site's pages.
 */
export const metadata: Metadata = {
  title: "Page not found — HunterPark",
  description: "This page went hunting. Everything else is where we left it.",
  robots: { index: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d0d0d",
};

const pages = [
  { label: "Work", href: "/work" },
  { label: "About", href: "/about" },
  { label: "News", href: "/news" },
  { label: "Contact", href: "/contact" },
];

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 12L12 4M5.5 4H12v6.5" />
    </svg>
  );
}

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <div className="nf">
          {/* The bar, as the site's: wordmark centred, Contact ticket right */}
          <header className="nf__bar">
            <a href="/" className="nf__home">
              <span aria-hidden="true">←</span> Home
            </a>
            <a href="/" className="nf__logo">
              {/* eslint-disable-next-line @next/next/no-img-element -- the SVG wordmark */}
              <img src="/brand/logo.svg" alt="HunterPark — home" width={1096} height={179} />
            </a>
            <a href="/contact" className="header-cta nf__cta">
              <span className="header-cta__label">
                <span className="header-cta__roll" data-text="Contact Us">
                  <span>Contact Us</span>
                </span>
              </span>
              <span className="header-cta__arrow" aria-hidden="true">
                <Arrow />
              </span>
            </a>
          </header>

          <main className="nf__main">
            {/* The numeral, set huge and outlined behind everything */}
            <span className="nf__ghost" aria-hidden="true">
              404
            </span>

            <p className="nf__eyebrow">Error 404 — Page not found</p>

            <h1 className="nf__title">
              <span className="nf__row nf__row--1">
                <span className="nf__small">This page went</span>
                <span className="nf__big">Hunting.</span>
              </span>
              <span className="nf__row nf__row--2">
                <span className="nf__small">It is not in the</span>
                <span className="nf__big">Park.</span>
              </span>
            </h1>

            <p className="nf__copy">
              The link may be broken, or the page has moved. Everything else is right where we left it.
            </p>

            <div className="nf__actions">
              <a href="/" className="header-cta nf__back">
                <span className="header-cta__label">
                  <span className="header-cta__roll" data-text="Back to home">
                    <span>Back to home</span>
                  </span>
                </span>
                <span className="header-cta__arrow" aria-hidden="true">
                  <Arrow />
                </span>
              </a>

              <nav aria-label="Pages">
                <ul className="nf__pages">
                  {pages.map((page) => (
                    <li key={page.href}>
                      <a href={page.href} className="nf__page">
                        {page.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </main>

          <footer className="nf__foot">
            <p className="nf__tagline">
              We do not hunt.
              <br />
              We are not a park.
            </p>
            <p className="nf__copyright">© {new Date().getFullYear()} HunterPark</p>
          </footer>
        </div>
      </body>
    </html>
  );
}

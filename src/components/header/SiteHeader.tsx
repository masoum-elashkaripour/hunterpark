/**
 * Site header — transparent over media, the wordmark does the talking.
 * Menu trigger (left) · centred wordmark · sound toggle + Contact Us CTA (right), at every size.
 * The trigger expands a short editorial list directly beneath it — Work, About,
 * News (the site's pages, from data/navigation; Contact is the CTA) and the social icons.
 * The wordmark is where the preloader's logo lands.
 * Persistent and transparent on every section — it never changes with scroll.
 * Behaviour (menu only): scripts/header.ts.
 */
import { primaryNav, socialLinks } from "../../data/navigation";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3.5a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM20.44 13.4c0-3.1-1.65-5.15-4.4-5.15-1.6 0-2.62.86-3.05 1.62V8.5H9.72c.04.9 0 11.5 0 11.5h3.27v-6.42c0-1.62.72-2.72 2.1-2.72 1.3 0 1.98.9 1.98 2.72V20h3.37v-6.6Z" />
    </svg>
  );
}

export default function SiteHeader() {
  return (
    <header className="site-header" data-header>
      <div className="site-header__inner">
        <a href="/" className="site-header__logo" data-header-logo>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG wordmark, the preloader's landing slot */}
          <img src="/brand/logo.svg" alt="HunterPark — home" width={1096} height={179} decoding="async" />
        </a>

        <div className="site-header__actions">
          {/* Sound: the site's ambient soundtrack on / off (scripts/soundtrack.ts). The bars stand
              when it plays and lie flat when it's muted. */}
          <button type="button" className="sound-toggle" aria-pressed="false" data-sound-toggle>
            <span className="visually-hidden">Sound</span>
            <span className="sound-toggle__bars" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          {/* CTA: a lime-ruled ticket; lime floods in from the left on hover */}
          <a href="/contact" className="header-cta" data-header-cta>
            <span className="header-cta__label">
              <span className="header-cta__roll" data-text="Contact Us">
                <span>Contact Us</span>
              </span>
            </span>
            <span className="header-cta__arrow" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 12L12 4M5.5 4H12v6.5" />
              </svg>
            </span>
          </a>
        </div>

        {/* Menu trigger: expands the list below it */}
        <button type="button" className="menu-toggle" aria-expanded="false" aria-controls="site-menu" data-menu-toggle>
          <span className="menu-toggle__label" aria-hidden="true">
            <span className="menu-toggle__word">Menu</span>
            <span className="menu-toggle__word">Close</span>
          </span>
          <span className="visually-hidden" data-menu-toggle-sr>
            Open menu
          </span>
          <span className="menu-toggle__icon" aria-hidden="true">
            <span></span>
            <span></span>
          </span>
        </button>

        {/* Expanded menu, off a lime rule: in the hero it hangs down from the trigger; past the
            hero it runs sideways from it, in one row (scripts/header.ts) */}
        <div id="site-menu" className="menu-panel" data-menu inert>
          <span className="menu-panel__rule" aria-hidden="true" data-menu-rule></span>
          <ul className="menu-panel__list" aria-label="Menu">
            {primaryNav.map((item) => (
              <li className="menu-panel__row" key={item.label}>
                <a href={item.href} className="menu-panel__item" data-menu-item>
                  <span className="menu-panel__dash" aria-hidden="true" />
                  <span className="menu-panel__roll" data-text={item.label}>
                    <span>{item.label}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <ul className="menu-panel__social" aria-label="Social">
            {socialLinks.map((link) => (
              <li data-menu-social key={link.label}>
                <a href={link.href} className="menu-panel__icon" target="_blank" rel="noopener noreferrer">
                  <span className="visually-hidden">{link.label} (opens in a new tab)</span>
                  {link.label === "Instagram" ? <InstagramIcon /> : <LinkedInIcon />}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
}

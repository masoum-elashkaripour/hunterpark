"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { setSoundEnabled, soundEnabled } from "@/lib/sound";

/**
 * Header ported from the live build (hunterpark.vercel.app): centred wordmark,
 * a menu trigger on the left whose rules fold into a cross, and a lime-ruled
 * "Contact Us" ticket on the right.
 *
 * Only /work exists in this prototype, so every destination points at it —
 * wire the real routes up on merge.
 */

/**
 * The menu, pointed at the real destinations.
 *
 * Every one of these used to go to `/work`, this prototype's only page — so
 * the wordmark did nothing and "Works" went where you already were. They now
 * address the merged site: the homepage at `/`, the index at `/work`.
 *
 * The three pages — the same list the homepage's header carries. News has no
 * page yet, so it is left out; `href: null` still renders an inert entry if
 * one is ever needed.
 */
const MENU: { label: string; href: string | null }[] = [
  { label: "Works", href: "/work" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const SOCIAL = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/hunterparktv/",
    filled: false,
    path: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/hunter-park-productions/",
    /* The repo's own glyph — a FILLED mark, not the stroked box-and-stick this
       stood in with. Next to Instagram's outline the two read as a pair there;
       the outline version read as a different icon set. */
    filled: true,
    path: (
      <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3.5a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM20.44 13.4c0-3.1-1.65-5.15-4.4-5.15-1.6 0-2.62.86-3.05 1.62V8.5H9.72c.04.9 0 11.5 0 11.5h3.27v-6.42c0-1.62.72-2.72 2.1-2.72 1.3 0 1.98.9 1.98 2.72V20h3.37v-6.6Z" />
    ),
  },
];

/** px before scrolling down tucks the header away.
 *  Exported because the work index's filter bar has to be the header's exact
 *  opposite — see its own comment. Two copies of this number drift apart and
 *  let both bars sit at the top at once. */

/**
 * Where the hero ends, as a fraction of the window — the repo's own figure.
 *
 * Below it the menu drops from the trigger; above it the menu runs sideways
 * along the bar. On this page the reel never scrolls, so it is always the
 * drop-down there, and the index gets the row — which is the same distinction
 * the homepage draws, by the same measurement.
 */
const HERO_END = 0.35;

/** Clearance the row must keep from the centred wordmark before it gives up. */
const LOGO_CLEAR = 24;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  /** This opening runs sideways, and if so whether it had to drop a line. */
  const [shape, setShape] = useState<{ row: boolean; below: boolean }>({
    row: false,
    below: false,
  });
  /** Mirrors the shared store so the button can render its pressed state. */
  const [sound, setSound] = useState(soundEnabled);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);

  /**
   * Decide the shape, once, at the moment it opens.
   *
   * Not on scroll: a menu left open while the reader scrolls would reshape
   * itself under them, which is the one thing a menu must not do. The repo
   * settles it the same way, in `layOut`.
   */
  const lay = () => {
    const panel = menuRef.current;
    const trigger = toggleRef.current;
    if (!panel || !trigger) return;

    /* Past the hero by either measure: scrolled clear of it, or — on /work,
       where the reel never scrolls — the index has taken over. See the effect
       that sets `data-work-index` in WorkCarousel. */
    const row =
      window.scrollY >= window.innerHeight * HERO_END ||
      "workIndex" in document.documentElement.dataset;
    if (!row) {
      panel.style.removeProperty("--menu-row-left");
      setShape({ row: false, below: false });
      return;
    }

    /* The row starts just past the trigger. Measured rather than guessed: the
       trigger is as wide as the word "Menu", so it moves with the font. */
    const header = trigger.closest(".site-header") as HTMLElement | null;
    const left = header
      ? trigger.getBoundingClientRect().right -
        header.getBoundingClientRect().left +
        8
      : 0;
    panel.style.setProperty("--menu-row-left", `${left}px`);

    /* …unless it would reach the centred wordmark, in which case it runs along
       the line under the bar instead. Measured after the offset is applied, so
       the panel's own width is the real one. */
    const logo = logoRef.current?.getBoundingClientRect();
    const reaches =
      !!logo && panel.getBoundingClientRect().right > logo.left - LOGO_CLEAR;
    setShape({ row: true, below: reaches });
  };

  /* No scroll listener at all. The live header is `position: fixed` and
     nothing else — its stylesheet carries no hidden or scrolled state, so it
     simply stays put over the work the whole way down the page. */

  // Escape closes the menu wherever focus happens to be, and a click outside
  // the trigger and the list folds it away — the page stays live underneath,
  // so there is no scroll lock and no backdrop to catch the click.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        toggleRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const className = [
    "site-header",
    open && "is-menu-open",
    open && shape.row && "is-menu-row",
    open && shape.row && shape.below && "is-menu-below",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    /* `viewTransitionName` pins the header during a route morph — see the
       `::view-transition-group(site-header)` rules in globals.css. */
    <header className={className} style={{ viewTransitionName: "site-header" }}>
      <div className="site-header__inner">
        <button
          type="button"
          ref={toggleRef}
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => {
            if (!open) lay();
            setOpen((v) => !v);
          }}
        >
          <span className="menu-toggle__label" aria-hidden>
            <span className="menu-toggle__word">Menu</span>
            <span className="menu-toggle__word">Close</span>
          </span>
          <span className="visually-hidden">
            {open ? "Close menu" : "Open menu"}
          </span>
          <span className="menu-toggle__icon" aria-hidden>
            <span />
            <span />
          </span>
        </button>

        {/* Home. The repo's header points its wordmark at `/` and so does this
            one now — in this prototype `/` redirects to `/work`, so it is a
            short trip, but it is the right address once the two are one site. */}
        <Link href="/" ref={logoRef} className="site-header__logo">
          <Image
            src="/brand/logo.svg"
            alt="HunterPark — home"
            width={1096}
            height={179}
            priority
            unoptimized
          />
        </Link>

        {/* The live header groups its two controls in one flush-right cell
            rather than letting the CTA sit in the grid column alone. */}
        <div className="site-header__actions">
          <button
            type="button"
            className="sound-toggle"
            aria-pressed={sound}
            onClick={() => {
              setSound(!sound);
              setSoundEnabled(!sound);
            }}
          >
            <span className="visually-hidden">Sound</span>
            {/* Four bars that stand up when it is on — the equaliser is the
                whole affordance, so it is the only thing that changes. */}
            <span className="sound-toggle__bars" aria-hidden>
              <span />
              <span />
              <span />
              <span />
            </span>
          </button>

          {/* THE PAGE EXISTS NOW, so this is an ordinary link again.
              It pointed at `/contact/` with no route behind it, which made
              every page on the site render a link to a 404 — and because Next
              prefetches every `Link` in the viewport, that 404 was the only
              error in the console on both `/work` and `/about`. The fix then
              was to switch the prefetch off; the fix now is that there is
              something there, so it comes back on.
              No trailing slash: `trailingSlash` is not set, so `/contact/`
              would cost a redirect on the way to `/contact`. */}
          <Link href="/contact" className="header-cta">
            <span className="header-cta__label">
              <span className="header-cta__roll" data-text="Contact Us">
                <span>Contact Us</span>
              </span>
            </span>
            <span className="header-cta__arrow" aria-hidden>
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M4 12L12 4M5.5 4H12v6.5" />
              </svg>
            </span>
          </Link>
        </div>
      </div>

      <div
        id="site-menu"
        ref={menuRef}
        className={`menu-panel${open ? " is-open" : ""}`}
        inert={!open}
      >
        <span className="menu-panel__rule" aria-hidden />

        <ul className="menu-panel__list" aria-label="Menu">
          {MENU.map((item) => {
            const inner = (
              <>
                <span className="menu-panel__dash" aria-hidden />
                <span className="menu-panel__roll" data-text={item.label}>
                  <span>{item.label}</span>
                </span>
              </>
            );
            return (
              <li key={item.label} className="menu-panel__row">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="menu-panel__item"
                    onClick={() => setOpen(false)}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button type="button" className="menu-panel__item">
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <ul className="menu-panel__social" aria-label="Social">
          {SOCIAL.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="menu-panel__icon"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="visually-hidden">
                  {item.label} (opens in a new tab)
                </span>
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill={item.filled ? "currentColor" : "none"}
                  stroke={item.filled ? "none" : "currentColor"}
                  strokeWidth="1.5"
                  aria-hidden
                >
                  {item.path}
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

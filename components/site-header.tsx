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

const MENU = [
  { label: "Works", href: "/work" },
  { label: "About", href: "/work" },
  { label: "News", href: "/work" },
];

const SOCIAL = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/hunterparktv/",
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
    path: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
        <path d="M8 10.5V17M8 7.6v.01M12 17v-3.6a2 2 0 0 1 4 0V17" />
      </>
    ),
  },
];

/** px before scrolling down tucks the header away.
 *  Exported because the work index's filter bar has to be the header's exact
 *  opposite — see its own comment. Two copies of this number drift apart and
 *  let both bars sit at the top at once. */

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  /** Mirrors the shared store so the button can render its pressed state. */
  const [sound, setSound] = useState(soundEnabled);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

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

  const className = ["site-header", open && "is-menu-open"]
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
          onClick={() => setOpen((v) => !v)}
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

        <Link href="/work" className="site-header__logo">
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

          <Link href="/work" className="header-cta">
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
          {MENU.map((item) => (
            <li key={item.label} className="menu-panel__row">
              <Link
                href={item.href}
                className="menu-panel__item"
                onClick={() => setOpen(false)}
              >
                <span className="menu-panel__dash" aria-hidden />
                <span className="menu-panel__roll" data-text={item.label}>
                  <span>{item.label}</span>
                </span>
              </Link>
            </li>
          ))}
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
                  fill="none"
                  stroke="currentColor"
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

/**
 * Hero — a living contact sheet.
 * The full-bleed background cycles through the stills and films; the same items sit
 * in a "View Project" strip at the foot of the frame, the active one opened wide.
 * A slide can be a film: it plays muted as the background while active, and the
 * sequence waits for it to finish (see scripts/hero.ts for the timing rules).
 */
import Image, { getImageProps } from "next/image";
import type { CSSProperties } from "react";
import { heroSlides, HERO_INTERVAL_MS } from "../../data/media";

// Poster frames for film slides — shown until the first video frame is ready.
const posters = heroSlides.map((slide) =>
  slide.video ? getImageProps({ src: slide.src, alt: "", width: 1920, quality: 70 }).props.src : null,
);

const total = String(heroSlides.length).padStart(2, "0");

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 12L12 4M5.5 4H12v6.5" />
    </svg>
  );
}

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title" data-hero data-interval={HERO_INTERVAL_MS} data-chapter-section="0">
      <p className="visually-hidden">Chapter 01: Intro</p>
      <div className="hero__backdrop" aria-hidden="true">
        {heroSlides.map((slide, i) =>
          slide.video ? (
            <video
              key={slide.id}
              className={`hero__bg${i === 0 ? " is-active" : ""}`}
              style={{ objectPosition: slide.focus }}
              data-hero-bg={i}
              poster={posters[i]!}
              muted
              loop
              playsInline
              autoPlay={i === 0}
              preload={i === 0 ? "auto" : "none"}
              disablePictureInPicture
            >
              <source src={slide.video.sd} type="video/mp4" media="(max-width: 767px)" />
              <source src={slide.video.sdWebm} type="video/webm" media="(max-width: 767px)" />
              <source src={slide.video.hd} type="video/mp4" />
              <source src={slide.video.hdWebm} type="video/webm" />
            </video>
          ) : (
            <Image
              key={slide.id}
              src={slide.src}
              alt=""
              sizes="100vw"
              quality={75}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "low"}
              className={`hero__bg${i === 0 ? " is-active" : ""}`}
              style={{ objectPosition: slide.focus }}
              data-hero-bg={i}
            />
          ),
        )}
      </div>

      {/* The shutter: as the hero hands over to Chapter 02 its media closes into this
          violet line, which then opens into Studio's first film (scripts/hero-to-studio.ts) */}
      <span className="hero__shutter" aria-hidden="true" data-hero-shutter />

      <div className="hero__content">
        {/* Two scales: whispered lead-ins, shouted keywords. Reads as one sentence to assistive tech. */}
        <h1 className="hero__title" id="hero-title" data-hero-tilt>
          <span className="hero__row hero__row--1">
            <span className="hero__mask hero__small" data-hero-lead>
              <span data-hero-reveal>We do not</span>
            </span>
            <span className="hero__mask hero__big" data-hero-word="hunt">
              <span data-hero-reveal>
                hunt<span data-hero-punct>,</span>
              </span>
            </span>
          </span>
          <span className="hero__row hero__row--2">
            <span className="hero__mask hero__small" data-hero-lead>
              <span data-hero-reveal>
                we are not a
              </span>
            </span>
            <span className="hero__mask hero__big" data-hero-word="park">
              <span data-hero-reveal>
                park<span data-hero-punct>.</span>
              </span>
            </span>
          </span>
        </h1>

        <div className="hero__reel" data-hero-reel style={{ "--count": heroSlides.length } as CSSProperties}>
          {/* Caption for the photographs below */}
          <div className="hero__reel-head" data-hero-fade>
            <p className="hero__caption">Newest Project</p>
            {/* Editorial folio: the current number leads, the total whispers */}
            <p className="hero__counter" aria-hidden="true">
              <span className="hero__counter-now">
                <span data-hero-count>01</span>
              </span>
              <span className="hero__counter-total">
                <span className="hero__counter-slash">/</span>
                {total}
              </span>
            </p>
          </div>

          {/* Project strip: the active project opens wide, the rest fold into slivers */}
          <ul className="hero__thumbs" aria-label="Projects">
            {heroSlides.map((slide, i) => (
              <li className="hero__thumb-item" data-hero-thumb-item key={slide.id}>
                <button
                  type="button"
                  className={`hero__thumb${i === 0 ? " is-active" : ""}`}
                  aria-label={`Show ${slide.video ? "film" : "still"} ${i + 1} of ${heroSlides.length}`}
                  aria-current={i === 0 ? "true" : undefined}
                  data-hero-thumb={i}
                >
                  <Image
                    src={slide.src}
                    alt=""
                    sizes="(max-width: 767px) 180px, 240px"
                    quality={70}
                    loading="eager"
                    style={{ objectPosition: slide.focus }}
                  />
                  {slide.video && (
                    <span className="hero__film" aria-hidden="true">
                      <svg viewBox="0 0 10 12" width="8" height="10">
                        <path d="M0 0l10 6-10 6z" fill="currentColor" />
                      </svg>
                    </span>
                  )}
                  <span className="hero__progress" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          {/* View Project: kin to the Contact CTA (hairline rules, rolling label, arrow cell)
              but its own shape. The reel's films aren't project pages of their own, so it
              opens the Work index. */}
          <a href="/work" className="view-project" data-view-project data-hero-fade>
            <span className="view-project__roll" data-text="View Project">
              <span>View Project</span>
            </span>
            <span className="view-project__line" aria-hidden="true"></span>
            <span className="view-project__arrow" aria-hidden="true" data-view-arrow>
              <ArrowIcon />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

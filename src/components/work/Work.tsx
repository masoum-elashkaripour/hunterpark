/**
 * Chapter 03 — Work.
 * With motion on it is the last beat of the homepage film (scripts/work.ts): WORK's letters
 * leave the screen, the Production film behind them contracts into the first project, and
 * scroll then moves a camera forward through the projects, set one behind another in depth —
 * each one passing the camera as the next arrives from far away — with the foreground
 * project's title set large across the top. The last "project" is the finale: it arrives like
 * the others, then opens out to fill the frame and becomes the closing call to action.
 *
 * Without motion the same projects simply flow as an editorial sequence of cards, and the
 * call to action follows them.
 */
import Image from "next/image";
import { finale, projects } from "../../data/projects";
import StageVideo from "../media/StageVideo";

const pad = (n: number) => String(n).padStart(2, "0");
// The sequence the camera travels: every project, then the finale
const sequence = [...projects, finale];

export default function Work() {
  return (
    <section className="work" id="work" aria-labelledby="work-heading" data-work data-chapter-section="2">
      <div className="work__stage" data-work-stage>
        <h2 className="work__heading" id="work-heading">
          <span className="visually-hidden">Chapter 03 — </span>Work
        </h2>

        {/* The foreground project's own media, blurred and darkened to fill the frame behind it —
            cross-faded by the camera move (decorative). Each blur is drawn once into a small
            canvas (never a live CSS blur, which re-rasterises in tiles as it moves) */}
        <div className="work__backdrop" aria-hidden="true" data-work-backdrop>
          {sequence.map((p) => (
            <div className="work__backdrop-layer" data-work-backdrop-layer key={p.id}>
              <div className="work__backdrop-media">
                {/* The source still (a film's poster), blurred once into the canvas above it by
                    scripts/work.ts — a film's canvas is then kept in step with its card's video */}
                <Image
                  src={p.media.kind === "film" ? p.media.film.poster : p.media.src}
                  alt=""
                  fill
                  sizes="25vw"
                  quality={40}
                  className="work__img"
                  style={{ objectPosition: p.media.kind === "film" ? p.media.film.focus : p.media.focus }}
                  data-work-backdrop-source
                />
                <canvas className="work__backdrop-canvas" data-work-backdrop-canvas />
              </div>
            </div>
          ))}
        </div>

        {/* The foreground project's title, large, one per project — rolled by the camera move (decorative) */}
        <div className="work__marquee" aria-hidden="true" data-work-marquee>
          <div className="work__titles">
            {sequence.map((p) => (
              <p className="work__title" data-work-title key={p.id}>
                {p.title}
              </p>
            ))}
          </div>
          <div className="work__metas">
            {sequence.map((p, i) => (
              <p className="work__meta" data-work-meta key={p.id}>
                <span className="work__meta-num">
                  {pad(i + 1)} <span className="work__meta-rule" /> {pad(sequence.length)}
                </span>
                <span>{p.client}</span>
                <span>{p.discipline}</span>
              </p>
            ))}
          </div>
        </div>

        {/* The closing call to action. Its headline waits in depth behind the finale card and
            comes forward as the card opens out into the frame */}
        <div className="work__cta" data-work-cta>
          <div className="work__cta-bg" aria-hidden="true">
            {finale.media.kind === "still" && (
              <Image src={finale.media.src} alt="" fill sizes="50vw" quality={50} className="work__img" style={{ objectPosition: finale.media.focus }} />
            )}
          </div>
          <h2 className="work__cta-title" id="cta-heading">
            <span className="work__cta-line">
              <span className="work__cta-word" data-work-cta-word>Make</span>{" "}
              <span className="work__cta-word" data-work-cta-word>Something</span>
            </span>{" "}
            <span className="work__cta-line work__cta-line--key">
              <span className="visually-hidden">Together.</span>
              {Array.from("Together.").map((ch, i) => (
                <span className="work__cta-char" data-work-cta-char aria-hidden="true" key={i}>
                  {ch}
                </span>
              ))}
            </span>
          </h2>
          <div className="work__cta-action" data-work-cta-action>
            <a href="/contact/" className="header-cta work__cta-link">
              <span className="header-cta__label">
                <span className="header-cta__roll" data-text="Start a Project">
                  <span>Start a Project</span>
                </span>
              </span>
              <span className="header-cta__arrow" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 12L12 4M5.5 4H12v6.5" />
                </svg>
              </span>
            </a>
          </div>
        </div>

        <ol className="work__space" data-work-space>
          {sequence.map((p, i) => (
            <li
              className={`work__card work__card--${p.caption}${p === finale ? " work__card--finale" : ""}`}
              data-work-card={p.id}
              {...(p === finale ? { "data-work-finale": true, "aria-hidden": true } : {})}
              key={p.id}
              style={{ ["--aspect" as string]: p.aspect, ["--scale" as string]: p.scale }}
            >
              <article className="work__article">
                <div className="work__visual" data-work-visual>
                  <div className="work__media" data-work-media>
                    {p.media.kind === "film" ? (
                      <StageVideo
                        film={p.media.film}
                        className="work__img"
                        data-work-video={p.id}
                        // Project 01 borrows the capability window's own film with motion on
                        {...(i === 0 ? { "data-work-own": true } : {})}
                      />
                    ) : (
                      <Image
                        src={p.media.src}
                        alt=""
                        fill
                        // the finale opens out to fill the frame, so it needs a full-width source
                        sizes={p === finale ? "100vw" : "(max-width: 767px) 70vw, 36vw"}
                        quality={72}
                        className="work__img"
                        style={{ objectPosition: p.media.focus }}
                      />
                    )}
                  </div>
                  <span className="work__dim" data-work-dim />
                </div>
                <div className="work__caption" data-work-caption>
                  <span className="work__caption-num">{pad(i + 1)}</span>
                  <h3 className="work__caption-title">{p.title}</h3>
                  <p className="work__caption-meta">
                    {p.discipline} — {p.year}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

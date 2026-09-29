/**
 * What We Do — capabilities as an editorial sequence, not a services list.
 * With motion on it is the third beat of the homepage film: the WHO WE ARE film
 * shrinks into this composition as Film & Video, then scroll carries the section
 * through each capability in turn — each new medium taking over the window — and
 * finally opens the frame full-bleed as the hand-off into Chapter 03 — Work
 * (scripts/capabilities.ts), whose letters then clear the way for the Work sequence
 * (scripts/work.ts). Titles jump to their capability when clicked.
 */
import Image from "next/image";
import { capabilities } from "../../data/capabilities";
import StageVideo from "../media/StageVideo";

export default function Capabilities() {
  return (
    <section className="caps" aria-labelledby="caps-heading" data-caps data-chapter-section="1">
      <h2 className="visually-hidden" id="caps-heading">
        What we do — capabilities
      </h2>

      <div className="caps__stage" data-caps-stage>
        {/* The media frame: every capability's media stacked, revealed one at a time */}
        <div className="caps__frame" data-caps-frame aria-hidden="true">
          <div className="caps__media" data-caps-media>
            {capabilities.flatMap((cap, i) => [
              <div
                className={`caps__layer${i === 0 ? " is-active" : ""}`}
                data-caps-layer={cap.id}
                data-caps-shared={(cap.media.kind === "film" && cap.media.shared) || undefined}
                key={cap.id}
              >
                <div className="caps__layer-inner" data-caps-layer-inner>
                  {cap.media.kind === "film" ? (
                    <StageVideo film={cap.media.film} className="caps__img" data-caps-video={cap.id} />
                  ) : (
                    <Image
                      src={cap.media.src}
                      alt=""
                      fill
                      sizes="(max-width: 767px) 100vw, 60vw"
                      quality={72}
                      className="caps__img"
                      style={{ objectPosition: cap.media.focus }}
                    />
                  )}
                </div>
              </div>,
              // A second still for the same capability, cut in over the first as the scroll moves on
              cap.also && (
                <div className="caps__layer" data-caps-also={cap.id} key={`${cap.id}-also`}>
                  <div className="caps__layer-inner" data-caps-layer-inner>
                    <Image
                      src={cap.also.src}
                      alt=""
                      fill
                      sizes="(max-width: 767px) 100vw, 60vw"
                      quality={72}
                      className="caps__img"
                      style={{ objectPosition: cap.also.focus }}
                    />
                  </div>
                </div>
              ),
            ])}
          </div>
          <span className="caps__shade" data-caps-shade />
        </div>

        {/* Folio: the capability's number, inside the media window's top-left corner */}
        <p className="caps__folio" aria-hidden="true" data-caps-folio>
          {capabilities.map((cap, i) => (
            <span className={`caps__folio-row${i === 0 ? " is-active" : ""}`} data-caps-num={cap.id} key={cap.id}>
              <span className="caps__folio-now">{String(i + 1).padStart(2, "0")}</span>
              <span className="caps__folio-rule" />
              <span className="caps__folio-total">{String(capabilities.length).padStart(2, "0")}</span>
            </span>
          ))}
        </p>

        {/* The capabilities — large editorial type, and the section's navigation */}
        <ol className="caps__list" data-caps-list>
          {capabilities.map((cap, i) => (
            <li className="caps__item" key={cap.id}>
              <button
                type="button"
                className={`caps__title${i === 0 ? " is-active" : ""}`}
                aria-pressed={i === 0}
                aria-describedby={`caps-line-${cap.id}`}
                data-caps-item={cap.id}
              >
                <span className="caps__index" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="caps__mask">
                  <span className="caps__label" data-caps-label>
                    {cap.title}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        {/* One short line for the active capability */}
        <div className="caps__caption" data-caps-caption>
          {capabilities.map((cap, i) => (
            <p className={`caps__line${i === 0 ? " is-active" : ""}`} id={`caps-line-${cap.id}`} data-caps-line={cap.id} key={cap.id}>
              {cap.line}
            </p>
          ))}
        </div>

        {/* Hand-off: as the frame opens full-bleed, Chapter 03 is announced */}
        <div className="caps__next" data-caps-next>
          <p className="caps__next-title">
            <span className="caps__next-mask">
              {/* One span per letter: they leave the screen one by one as Chapter 03 opens (scripts/work.ts) */}
              <span data-caps-next-title>
                <span className="visually-hidden">Work</span>
                {Array.from("Work").map((ch, i) => (
                  <span className="caps__next-letter" data-caps-next-letter aria-hidden="true" key={i}>
                    {ch}
                  </span>
                ))}
              </span>
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

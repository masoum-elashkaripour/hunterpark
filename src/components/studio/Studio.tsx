/**
 * Chapter 02 — Studio.
 * Staged over the hero inside the homepage "film" (scripts/film.ts): the hero's
 * HUNT and PARK resolve into the one name HUNTERPARK, its shutter line opens into
 * the story film, and HUNTERPARK gives way to WHO WE ARE across it; the story
 * is built word by word as the film reframes, and the second film opens into
 * the frame that anchors WHAT WE DO. Its own material only — no hero imagery.
 *
 * Without motion (reduced-motion / no JS) the same markup simply flows:
 * eyebrow, heading, film, story, then the What We Do film and heading.
 */
import { studioFilms } from "../../data/media";
import StageVideo from "../media/StageVideo";
import { SplitChars, SplitWords, type Segment } from "../motion/SplitText";
import StudioLines from "./StudioLines";

const story: Segment[] = [
  { text: "HunterPark is a creative production studio bringing" },
  { text: "ideas, people, and craft", em: true },
  { text: "together to make" },
  { text: "work that moves.", em: true },
];

export default function Studio() {
  return (
    <section className="studio" id="studio" aria-labelledby="studio-heading" data-studio data-chapter-section="1">
      <div className="studio__stage" data-studio-stage>

        <div className="studio__intro" data-studio-intro>
          {/* WHO WE ARE's lime line pattern — scoped to this block, hidden until it begins */}
          <StudioLines />
          <p className="studio__eyebrow">
            <span className="visually-hidden">Chapter </span>
            <span className="studio__eyebrow-num">02</span> Studio
          </p>
          <div className="studio__title">
            {/* HUNTERPARK — the hero's HUNT and PARK resolve into the one name here,
                which then gives way to WHO WE ARE in the same place (scripts/film.ts) */}
            <p className="studio__name" aria-hidden="true" data-studio-name>
              <SplitChars text="HunterPark" />
            </p>
            <h2 className="studio__heading" id="studio-heading" data-studio-heading>
              <span className="visually-hidden">Who we are</span>
              <SplitChars text="Who we are" />
            </h2>
          </div>

          {/* The story film: opens out of the hero's shutter line, then reframes around the text */}
          <div className="studio__film" data-studio-film aria-hidden="true">
            <StageVideo film={studioFilms.story} data-studio-film-video />
            <span className="studio__film-shade" />
          </div>

          <SplitWords segments={story} className="studio__story" />
        </div>

        {/* What We Do — the next beat of Chapter 02, opened by the second film */}
        <section className="whatwedo" aria-labelledby="whatwedo-heading" data-whatwedo>
          <div className="whatwedo__anchor" data-whatwedo-anchor aria-hidden="true">
            <StageVideo film={studioFilms.whatWeDo} data-whatwedo-video />
            <span className="whatwedo__shade" data-whatwedo-shade />
          </div>

          <h2 className="whatwedo__heading" id="whatwedo-heading" data-whatwedo-heading>
            <span className="visually-hidden">What we do</span>
            <SplitChars text="What we do" />
          </h2>
        </section>
      </div>
    </section>
  );
}

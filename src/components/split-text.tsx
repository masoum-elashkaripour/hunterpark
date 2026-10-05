"use client";

import { m, useReducedMotion } from "motion/react";

/**
 * Character reveal, rebuilt from the live site's `.split__word` / `.split__mask`
 * / `.split__char` markup: every glyph sits in its own clipped box and swings up
 * from under it, so the line assembles rather than fading in.
 *
 * Words are kept whole (`white-space: nowrap`) so a reveal never breaks a word
 * across lines mid-animation.
 *
 * The text is printed once for assistive tech and the split copy is hidden from
 * it — otherwise a screen reader spells the title out letter by letter.
 */
export function SplitText({
  text,
  className,
  delay = 0,
  stagger = 0.036,
  by = "char",
  play = true,
  duration,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  /**
   * `char` is the index treatment (`.studio__name` on the live site); `word`
   * is the hero's, where each word is one mask and rises whole. At display
   * size a per-glyph stagger reads as noise, so the big lockup splits by word.
   */
  by?: "char" | "word";
  /**
   * Hold at the start state until this is true.
   *
   * Without it the roll runs on MOUNT, so every caption below the fold has
   * finished animating before the reader ever scrolls to it and they arrive to
   * find the type already sitting still.
   */
  play?: boolean;
  /**
   * Seconds one word or glyph takes to rise.
   *
   * Given a knob because the same component sets two very different things: a
   * card's caption in the index, which can take its time, and the reel's
   * lockup, which has to have landed by the moment its film reaches the centre
   * of the screen.
   */
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  if (reduced) return <span className={className}>{text}</span>;

  if (by === "word") {
    return (
      <span className={className}>
        <span className="sr-only">{text}</span>

        <span aria-hidden>
          {words.map((word, w) => (
            <span key={`${word}-${w}`} className="split__wmask">
              <m.span
                className="split__w"
                initial={{ y: "110%" }}
                animate={play ? { y: "0%" } : { y: "110%" }}
                transition={{
                  duration: duration ?? 1.3,
                  ease: [0.19, 1, 0.22, 1],
                  delay: delay + w * 0.09,
                }}
              >
                {word}
              </m.span>
              {w < words.length - 1 ? " " : null}
            </span>
          ))}
        </span>
      </span>
    );
  }

  let index = -1;

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>

      <span aria-hidden>
        {words.map((word, w) => (
          <span key={`${word}-${w}`}>
            <span className="split__word">
              {[...word].map((char, c) => {
                index += 1;
                return (
                  <span key={`${char}-${c}`} className="split__mask">
                    <m.span
                      className="split__char"
                      initial={{ y: "110%", rotate: 6, opacity: 0 }}
                      animate={
                        play
                          ? { y: "0%", rotate: 0, opacity: 1 }
                          : { y: "110%", rotate: 6, opacity: 0 }
                      }
                      transition={{
                        duration: duration ?? 0.95,
                        ease: [0.19, 1, 0.22, 1],
                        delay: delay + index * stagger,
                      }}
                    >
                      {char}
                    </m.span>
                  </span>
                );
              })}
            </span>
            {/* Non-breaking, and outside the word box: `.split__word` is an
                inline-block with `nowrap`, which trims a plain trailing
                space and runs the words together. */}
            {w < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </span>
  );
}

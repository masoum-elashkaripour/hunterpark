/**
 * Server-side text splitting for scroll-driven typography.
 *
 * Splitting happens in the markup (not at runtime), so there's no reflow or
 * layout shift when the animation starts. The split copy is aria-hidden;
 * each component renders the full sentence once for assistive tech.
 */
import { Fragment, type ElementType, type ReactNode } from "react";

/** Words → letters. Each word stays unbreakable; each letter sits in its own reveal mask. */
export function SplitChars({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className} aria-hidden="true">
      {words.map((word, w) => (
        <Fragment key={w}>
          <span className="split__word">
            {[...word].map((char, c) => (
              <span className="split__mask" key={c}>
                <span className="split__char" data-split-char>
                  {char}
                </span>
              </span>
            ))}
          </span>
          {/* The space lives between word boxes — inside an inline-block it would collapse */}
          {w < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}

export interface Segment {
  text: string;
  /** Words the story lands on — they resolve into the accent colour at the end. */
  em?: boolean;
}

/** Phrase segments → individual words, keeping emphasis on the words that carry it. */
export function SplitWords({
  segments,
  as: Tag = "p",
  className,
  children,
}: {
  segments: Segment[];
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}) {
  const words = segments.flatMap((segment) =>
    segment.text.split(" ").map((word) => ({ word, em: Boolean(segment.em) })),
  );
  return (
    <Tag className={className}>
      <span className="visually-hidden">{segments.map((s) => s.text).join(" ")}</span>
      <span aria-hidden="true">
        {words.map(({ word, em }, i) => (
          <Fragment key={i}>
            {/* Each word sits in its own reveal mask (cut along the bottom edge only) */}
            <span className="split__wmask">
              <span className="split__w" data-split-word data-em={em || undefined}>
                {word}
              </span>
            </span>
            {i < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
      {children}
    </Tag>
  );
}

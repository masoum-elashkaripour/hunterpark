"use client";

import { useInView } from "@/components/use-in-view";

/**
 * Marks its box `data-in` the first time it scrolls into view — the site's own
 * `useInView`, once, no re-hiding on the way back up. What arrives, and how,
 * is the stylesheet's business (`.news-*[data-in]`), so the markup is the
 * finished state and the page reads fine before any of this hydrates.
 */
export function NewsInView({
  as: Tag = "div",
  id,
  className,
  style,
  children,
}: {
  as?: "div" | "section" | "li" | "article";
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [ref, seen] = useInView<HTMLElement>(0.08);
  return (
    <Tag
      ref={ref}
      id={id}
      className={className}
      style={style}
      data-in={seen || undefined}
    >
      {children}
    </Tag>
  );
}

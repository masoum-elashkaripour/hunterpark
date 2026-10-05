/**
 * "Read on <publication>" — THE HEADER'S TICKET, markup and classes as the
 * header and the contact opening use them (`.header-cta`), so the hover is the
 * site's one lime flood and cannot drift. External, because every story here
 * lives on the publication that wrote it.
 */
export function NewsReadLink({
  href,
  source,
  className,
}: {
  href: string;
  source: string;
  className?: string;
}) {
  const label = `Read on ${source}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`header-cta ${className ?? ""}`}
    >
      <span className="header-cta__label">
        <span className="header-cta__roll" data-text={label}>
          <span>{label}</span>
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
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

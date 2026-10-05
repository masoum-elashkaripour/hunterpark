/**
 * The contact panel's icons — line drawings at one weight, in `currentColor`
 * so they take the lime from their frame (`.contact-reveal__icon`). Drawn on a
 * 24 grid with a 1.5 stroke, the weight of the header ticket's arrow.
 */

type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const MailIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="3" y="5" width="18" height="14" rx="1" />
    <path d="m3.5 6 8.5 7 8.5-7" />
  </svg>
);

export const PhoneIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 4h3.5l1.6 4.2-2.2 1.4a11 11 0 0 0 6.5 6.5l1.4-2.2L20 15.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z" />
  </svg>
);

export const ShareIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
  </svg>
);

export const PinIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

export const InstagramIcon = ({ className }: IconProps) => (
  <svg {...base} width={15} height={15} className={className}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const LinkedInIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width={15}
    height={15}
    fill="currentColor"
    aria-hidden
    className={className}
  >
    <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3.5a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM20.44 13.4c0-3.1-1.65-5.15-4.4-5.15-1.6 0-2.62.86-3.05 1.62V8.5H9.72c.04.9 0 11.5 0 11.5h3.27v-6.42c0-1.62.72-2.72 2.1-2.72 1.3 0 1.98.9 1.98 2.72V20h3.37v-6.6Z" />
  </svg>
);

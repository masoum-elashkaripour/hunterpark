/**
 * The studio's own details — ONE place, because there are several users.
 *
 * The form composes a `mailto:` from `email`; the closing section prints it as
 * the page's last word; the "write to us" card links to it. Three components
 * needing the same fact is exactly how a fact ends up written down twice and
 * wrong once.
 *
 * NOTHING HERE IS INVENTED. The email is the one hunterpark.tv/contact
 * publishes; there is no phone or address anywhere, and the contact page is the one page where a plausible-looking
 * guess is worse than a visible gap — a wrong address does not bounce, it just
 * silently loses work. Every field is empty until the real one is known, and
 * every component that reads them is written to degrade rather than to print a
 * blank: the mail card falls back to the form, the closing line hides itself.
 *
 * Fill these in and the page completes itself.
 */
export const CONTACT = {
  /** Booking address — as published on hunterpark.tv/contact. */
  email: "info@hunterpark.tv",
  /**
   * Studio phone, as it should be printed, e.g. "+1 212 555 0100". The live
   * site publishes none, so this stays empty until the real number is given —
   * the contact panel shows "Number to come" in its place.
   */
  phone: "",
  /** How fast a reply actually comes — the promise under the address. */
  replyWithin: "We read everything that comes in.",
  /** Where the studio works, e.g. ["New York", "Los Angeles"]. */
  cities: [] as string[],
} as const;

/** The social accounts, which ARE known — the footer has carried them all along. */
export const SOCIAL = [
  { label: "Instagram", href: "https://www.instagram.com/hunterparktv/" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/hunter-park-productions/",
  },
] as const;

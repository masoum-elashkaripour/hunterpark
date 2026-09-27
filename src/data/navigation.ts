/**
 * Header menu items. For now these are expand/collapse menu entries only —
 * no routes, no page loads. Add an `href` per item when pages exist.
 */
export const primaryNav = [{ label: "Works" }, { label: "About" }, { label: "News" }] as const;

export const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/hunterparktv/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/hunter-park-productions/" },
] as const;

export const tagline = ["We do not hunt.", "We are not a park."] as const;

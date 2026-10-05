/** Header menu items — the site's pages. */
export const primaryNav = [
  { label: "Works", href: "/work" },
  { label: "About", href: "/about" },
  { label: "News", href: "/news" },
  { label: "Contact", href: "/contact" },
] as const;

export const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/hunterparktv/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/hunter-park-productions/" },
] as const;

export const tagline = ["We do not hunt.", "We are not a park."] as const;

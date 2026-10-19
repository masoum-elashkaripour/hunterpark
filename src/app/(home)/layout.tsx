import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/instrument-sans";
import "../../styles/global.css";
import "../../styles/components/preloader.css";
import "../../styles/components/header.css";
import "../../styles/components/hero.css";
import "../../styles/components/view-project-plate.css";
import "../../styles/components/studio.css";
import "../../styles/components/capabilities.css";
import "../../styles/components/work.css";
import "../../styles/components/footer.css";
import Preloader from "../../components/preloader/Preloader";
import SiteHeader from "../../components/header/SiteHeader";
import SiteScripts from "../../components/SiteScripts";

export const metadata: Metadata = {
  title: "HunterPark — Film, Photography & Design Studio",
  description:
    "HunterPark is a creative production studio for film, video, photography, design and visual storytelling.",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d0d0d",
};

// Runs before first paint: flags JS, and skips the preloader on repeat views this session.
// Add ?preloader to the URL to force it to play again while reviewing.
// The page is one pinned scroll "film": a restored scroll position (reload, repeat view)
// would open mid-film or on the footer, so always start from the top.
const bootScript = `document.documentElement.classList.add("js");
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (!location.hash) window.scrollTo(0, 0);
} catch (e) {}
try {
  var force = new URLSearchParams(location.search).has("preloader");
  if (!force && sessionStorage.getItem("hp:preloaded")) document.documentElement.classList.add("skip-preloader");
} catch (e) {}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The boot script and page scripts add classes/data attributes to <html> before hydration.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        {/* Söhne Breit faces used above the fold — display only (400 lead-ins, 700 counter, 900 HUNT/PARK) */}
        <link rel="preload" href="/fonts/soehne-breit-400.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/soehne-breit-700.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/soehne-breit-900.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Preloader />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteScripts />
      </body>
    </html>
  );
}

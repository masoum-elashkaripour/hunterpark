import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import "lenis/dist/lenis.css";
import { SiteHeader } from "@/components/site-header";
import { SmoothScroll } from "@/components/smooth-scroll";
import { MotionProvider } from "@/components/motion-provider";
import { LaunchProvider } from "@/components/launch";

/* Matches `--hp-font-secondary`. The display face (`Söhne Breit`) is licensed
   and not bundled; the stack in globals.css falls through to this one. */
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Work — Hunterpark",
  description:
    "Selected films from Hunterpark: brand, healthcare, culture and impact work.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Browser extensions write attributes onto <html> before hydration (a
    // password/form filler's `__gcrremoteframetoken`, here); that is not ours to
    // match, and only this element's own attributes are exempted — as on (home).
    <html
      lang="en"
      className={`${instrumentSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <SmoothScroll />
        <MotionProvider>
          <LaunchProvider>
            <SiteHeader />
            {children}
          </LaunchProvider>
        </MotionProvider>
      </body>
    </html>
  );
}

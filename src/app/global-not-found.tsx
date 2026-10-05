import type { Metadata } from "next";
import "../styles/global.css";

/**
 * The 404 for unmatched URLs. The app has two root layouts — (home) and
 * (site) — so there is no single layout to build one from; see
 * `experimental.globalNotFound` in next.config.ts. Kept to the homepage's
 * base stylesheet only: tokens, fonts, the night ground.
 */
export const metadata: Metadata = {
  title: "Not found — HunterPark",
};

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100svh",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <div>
            <p>This page does not exist.</p>
            <p style={{ marginTop: "1rem" }}>
              <a href="/" style={{ textDecoration: "underline" }}>
                Back to HunterPark
              </a>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}

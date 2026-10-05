import type { Metadata } from "next";
import { ContactHero } from "@/components/contact-hero";
import { ContactReveal } from "@/components/contact-reveal";
import { ContactFooter } from "@/components/contact-footer";

/**
 * Contact.
 *
 * The opening and the three numbered ways in are from ownitt.fr/contact, which
 * sorts people by how ready they are rather than putting one undifferentiated
 * form in front of everybody.
 *
 * The closing is from flyward.com/contact: a picture out of the opening grows
 * on scroll until it is the whole screen, and the contact content — the line,
 * the address, the form, where the studio works — is read on it. The footer
 * follows immediately, with nothing between.
 *
 * The LANGUAGE is this site's throughout. Söhne Breit over black, the lime
 * accent, numbers sitting on the title's baseline, the arrow that the header
 * ticket and the footer links already carry, rules that draw themselves as a
 * section arrives. Nothing was invented to hold the new structure — it is the
 * Talent act's card and the capabilities staircase, rearranged.
 *
 * The footer is the SITE'S footer, shown STILL here — one screen, finished,
 * no scroll film — see `ContactFooter`.
 *
 * What is NOT here is anything that was not known: no address, no phone, no
 * cities. See `lib/contact.ts`.
 */

export const metadata: Metadata = {
  title: "Contact — Hunterpark",
  description:
    "Start a project with Hunterpark — a film production studio making brand, healthcare, culture and impact work.",
};

export default function ContactPage() {
  return (
    <main className="contact-page">
      {/* The hero's sticky range ends with the reveal — without this box it
          stayed stuck to the end of <main> and showed again behind the footer. */}
      <div className="contact-opening">
        <ContactHero />
        <ContactReveal />
      </div>
      <ContactFooter />
    </main>
  );
}

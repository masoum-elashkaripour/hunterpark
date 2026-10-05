import Image from "next/image";

/**
 * The opening — one full screen, photographs pushed to the edges, the words in
 * the clear middle.
 *
 * NOT `position: fixed`. It was, briefly, so the second section could travel
 * over it the way the reference's does; taking the hero out of the flow put its
 * cards in viewport coordinates while the section below measured itself in
 * document ones, and the two stopped agreeing the moment anything scrolled.
 * `height: 100svh` in normal flow is what "full screen" needed to mean.
 *
 * THE SCATTER CLEARS THE CENTRE. The reference preloader's own boxes are
 * clustered around the middle, which is right when the only thing on screen is
 * pictures and wrong here, where a headline has to be read through them. Same
 * sizes, same tilts, same arrival — pushed out to the corners, with one small
 * card above the title where there is room for it.
 *
 * THE PICTURES ARE PHOTOGRAPHS — stills only, no film — from the supplied
 * archive, five that no other page uses, in `public/contact/`. Each card is the
 * photograph's own shape (see `CARDS`), so none of them is cropped.
 *
 * The arrival is slow and soft: an even stagger, a fixed tilt per card, and
 * each one rising, growing from just under size and coming into focus as it
 * fades up (`hp-card-in`). All CSS, so the markup is the finished state and
 * nothing is blank before hydration.
 */

/* EACH PICTURE AT ITS OWN PROPORTIONS. `width`/`height` are the files' real
   pixel sizes (exported from the originals at 2400px on the long edge, q90, in
   `public/contact/`), and the card's ratio is derived from them — so the box is
   the photograph's shape and nothing is cropped to fit it. */
const CARDS = [
  /* Upper left and right, then lower left and right — the four corners, well
     clear of the headline's band. */
  {
    src: "/contact/carol-magalhaes.jpg",
    width: 2400,
    height: 1600,
    left: 15,
    top: 27,
    w: 17,
    rot: -8.1,
  },
  {
    src: "/contact/marina-nazina.jpg",
    width: 1600,
    height: 2400,
    left: 87,
    top: 32,
    w: 12,
    rot: 7.4,
  },
  {
    src: "/contact/iris-avi.jpg",
    width: 2400,
    height: 1600,
    left: 12,
    top: 74,
    w: 15,
    rot: 9.8,
  },
  {
    src: "/contact/vitaly-gariev.jpg",
    width: 2400,
    height: 1350,
    left: 87,
    top: 77,
    w: 17,
    rot: -10.6,
  },
  /* Low and right of centre. It was top-centre, where it ran straight under
     the header's wordmark — the one band of the frame that is never free. */
  {
    src: "/contact/cleopas-monbest.jpg",
    width: 1920,
    height: 2400,
    left: 61,
    top: 84,
    w: 10,
    rot: -7,
  },
  /* Two more in the gaps still open: high and right of the headline, under
     the header's empty stretch rather than its wordmark; and low left of
     centre, mirroring the card above across the call to action. Appended, so
     `HERO_CARDS[4]` — the one `ContactReveal` grows — keeps its index. */
  {
    src: "/contact/ali-pazani.jpg",
    width: 2400,
    height: 2134,
    left: 68,
    top: 23,
    w: 10,
    rot: 5.2,
  },
  {
    src: "/contact/ivan-kazlouskij.jpg",
    width: 2400,
    height: 1602,
    left: 36,
    top: 85,
    w: 12,
    rot: 6.4,
  },
];

export const HERO_CARDS = CARDS.map((card) => ({
  ...card,
  ratio: card.width / card.height,
}));

/**
 * When each starts to land, in seconds — an even, unhurried stagger, so with
 * the longer, softer arrival (`hp-card-in`) the cards overlap in a slow
 * cascade rather than popping in one after another.
 */
const LAND = [0.7, 1.0, 1.3, 1.6, 1.9, 2.2, 2.5];

/** The words follow the last picture rather than racing it. */
const AFTER = LAND[LAND.length - 1] + 0.3;

export function ContactHero() {
  return (
    <section className="contact-hero" aria-labelledby="contact-heading">
      <div className="contact-hero__scatter" aria-hidden>
        {HERO_CARDS.map((card, i) => (
          <span
            key={card.src}
            className="contact-hero__card"
            style={
              {
                left: `${card.left}%`,
                top: `${card.top}%`,
                "--w": `${card.w}vw`,
                aspectRatio: `${card.ratio}`,
                "--rot": `${card.rot}deg`,
                animationDelay: `${LAND[i]}s`,
                zIndex: i + 1,
              } as React.CSSProperties
            }
          >
            {/* Intrinsic size, not `fill`: the picture sets its own height
                from its width, so it is never cropped. q90 and the card's
                enlarged phone width in `sizes` so the srcset is never
                undersized. */}
            <Image
              src={card.src}
              alt=""
              width={card.width}
              height={card.height}
              quality={90}
              sizes={`(max-width: 700px) ${Math.round(card.w * 1.8)}vw, ${card.w}vw`}
              /* All eager: a lazy one could still be downloading when its
                 turn comes and appear abruptly mid-fade. */
              priority={i === 0}
              loading="eager"
            />
          </span>
        ))}
      </div>

      <div className="contact-hero__content">
        <p
          className="hp-eyebrow hero-rise"
          style={{ animationDelay: `${AFTER}s` }}
        >
          Contact
        </p>

        {/* Short. "So — what are we making?" ran to three lines at display size
            and filled the middle the scatter was just cleared to leave open. */}
        <h1 id="contact-heading" className="hp-display contact-hero__title">
          <span style={{ animationDelay: `${AFTER + 0.08}s` }}>
            Let&rsquo;s talk.
          </span>
        </h1>

        <p
          className="hp-copy contact-hero__standfirst hero-rise"
          style={{ animationDelay: `${AFTER + 0.2}s` }}
        >
          An idea, a brief, or just the urge to talk it through.
        </p>

        {/* THE HEADER'S TICKET, markup and all — `.header-cta` with its label,
            its rolling text and its own arrow. Mine was a near-copy with a
            different glyph and a different hover; this is the component's own
            classes, so there is one definition and it cannot drift. */}
        <div
          className="hero-rise"
          style={{ animationDelay: `${AFTER + 0.3}s` }}
        >
          <a href="#contact-form" className="header-cta">
            <span className="header-cta__label">
              <span className="header-cta__roll" data-text="Send a brief">
                <span>Send a brief</span>
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
          </a>
        </div>
      </div>
    </section>
  );
}

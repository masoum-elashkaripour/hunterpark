/**
 * A STAND-IN MAP — a drawn city plate, not a real place.
 *
 * There is no studio address yet, and a located map cannot be invented: a pin
 * on a real street would be a claim. So this is an illustration in the site's
 * language — a night plate, hairline streets on a skewed grid, a river, a park
 * block, and one lime pin pulsing in the middle — that fills the box honestly
 * and says underneath that the address is still to come. When the address is
 * known, this is the one component to replace with the real map.
 */
export function ContactMap() {
  return (
    <div className="contact-map">
      <svg
        className="contact-map__plate"
        viewBox="0 0 480 220"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        {/* The river, sweeping across the lower left. */}
        <path
          className="contact-map__water"
          d="M-10 175 C 70 150, 120 205, 210 185 S 340 120, 500 140 L 500 230 L -10 230 Z"
        />
        {/* A park block. */}
        <rect
          className="contact-map__park"
          x="300"
          y="28"
          width="92"
          height="58"
          transform="rotate(-8 346 57)"
        />
        {/* Avenues and streets — a grid knocked a little off true. */}
        <g className="contact-map__streets">
          {[30, 75, 120, 165, 210, 255, 300, 345, 390, 435].map((x) => (
            <path key={`a${x}`} d={`M${x} -10 L${x + 34} 230`} />
          ))}
          {[20, 52, 84, 116, 148].map((y) => (
            <path key={`s${y}`} d={`M-10 ${y} L490 ${y - 26}`} />
          ))}
        </g>
        {/* Two main roads, heavier. */}
        <g className="contact-map__roads">
          <path d="M-10 128 L490 70" />
          <path d="M150 -10 L196 230" />
        </g>
      </svg>

      {/* The pin, centred, with a slow pulse. */}
      <span className="contact-map__pin" aria-hidden>
        <span className="contact-map__pulse" />
        <svg viewBox="0 0 24 24" width="30" height="30">
          <path
            d="M12 22s-7.5-6.6-7.5-12.2a7.5 7.5 0 0 1 15 0C19.5 15.4 12 22 12 22Z"
            fill="currentColor"
          />
          <circle cx="12" cy="9.8" r="2.6" fill="var(--hp-night)" />
        </svg>
      </span>

      <p className="label-xs contact-map__note">Studio address to come</p>
    </div>
  );
}

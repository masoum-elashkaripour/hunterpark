import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { heroToStudioTimeline } from "./hero-to-studio";
import { STUDIO_MOTION, studioTimeline } from "./studio";
import { CAPS_MOTION, capabilitiesTimeline, markActive, setCapabilityJump } from "./capabilities";
import { WORK_MOTION, workTimeline } from "./work";
import { footerTimeline } from "./footer";
import { pauseHero } from "./hero";
import { lenis } from "./smooth-scroll";

gsap.registerPlugin(ScrollTrigger);

/**
 * The homepage "film": Chapter 01, Chapter 02 (Who we are), What We Do, Chapter 03 (Work) and the footer stacked in
 * one pinned stage and played as a single scrubbed timeline, so each beat's last frame
 * is literally the next one's first. Beat lengths are in viewport heights.
 */
export const FILM = {
  beats: { heroToStudio: 1.5, studio: 3.0, capabilities: 5.6, work: 15.5, footer: 4.5 },
  // Coupled directly to scroll (Lenis already smooths the scroll itself): motion stops the
  // moment scrolling stops and reverses exactly — no catch-up lag after the user.
  scrub: true,
};

export function initFilm(): void {
  const film = document.querySelector<HTMLElement>("[data-film]");
  const hero = film?.querySelector<HTMLElement>("[data-hero]");
  const caps = film?.querySelector<HTMLElement>("[data-caps]");
  if (!film || !hero) return;

  const heroBeat = heroToStudioTimeline();
  const studioBeat = studioTimeline();
  const capsBeat = capabilitiesTimeline();
  // Work continues from What We Do's last frame, so it only plays after it
  const workBeat = capsBeat ? workTimeline() : null;
  // …and the footer from the call to action Work ends on
  const footerBeat = workBeat ? footerTimeline() : null;
  if (!heroBeat || !studioBeat) return;

  const b = FILM.beats;
  const capsLen = capsBeat ? b.capabilities : 0;
  const workLen = workBeat ? b.work : 0;
  const footerLen = footerBeat ? b.footer : 0;
  const total = b.heroToStudio + b.studio + capsLen + workLen + footerLen;
  const studioAt = b.heroToStudio;
  const capsAt = studioAt + b.studio;
  const workAt = capsAt + capsLen;
  const footerAt = workAt + workLen;
  const storyVideo = film.querySelector<HTMLVideoElement>("[data-studio-film-video]");
  const doVideo = film.querySelector<HTMLVideoElement>("[data-whatwedo-video]");
  const capVideos = Array.from(film.querySelectorAll<HTMLVideoElement>("[data-caps-video]")).filter(
    (v) => !v.closest("[data-caps-shared]"),
  );
  const capVideoIndex = capVideos.map((v) => {
    const layer = v.closest<HTMLElement>("[data-caps-layer]");
    return Array.from(film.querySelectorAll("[data-caps-layer]")).indexOf(layer as Element);
  });

  const master = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: film,
      start: "top top",
      end: `+=${total * 100}%`,
      pin: true,
      scrub: FILM.scrub,
      invalidateOnRefresh: true,
      onUpdate: (self) => syncMedia(self.progress * total),
    },
  });

  master
    .add(heroBeat.duration(b.heroToStudio), 0)
    .add(studioBeat.duration(b.studio), studioAt)
    // Across the cut: the hero's lime line hands over to the film opening out of it.
    .to(hero.querySelector("[data-hero-shutter]"), { autoAlpha: 0, duration: 0.2 }, studioAt + 0.05);
  if (capsBeat) {
    master.add(capsBeat.timeline.duration(capsLen), capsAt);
    // Clicking a capability title scrolls the film to where that capability takes the window
    setCapabilityJump((i) => {
      const st = master.scrollTrigger!;
      const time = capsAt + capsBeat.at[i] * capsLen + 0.02;
      const y = st.start + (time / total) * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, { duration: 1.1 });
      else window.scrollTo(0, y);
    });
  }

  if (workBeat) master.add(workBeat.timeline.duration(workLen), workAt);
  if (footerBeat) master.add(footerBeat.duration(footerLen), footerAt);

  // The footer's links move the film to their chapter (the sections are stacked in the pinned
  // stage, so a plain anchor would land on the stage's top); Back to top returns to the start
  const glideTo = (time: number) => {
    const st = master.scrollTrigger!;
    const y = st.start + (time / total) * (st.end - st.start);
    if (lenis) lenis.scrollTo(y, { duration: 1.8 });
    else window.scrollTo(0, y);
  };
  const chapterAt: Record<string, number> = { studio: studioAt + 0.2, work: workAt + workLen * 0.2 };
  document.querySelectorAll<HTMLAnchorElement>("[data-footer-jump]").forEach((link) =>
    link.addEventListener("click", (event) => {
      const at = chapterAt[link.dataset.footerJump ?? ""];
      if (at === undefined) return;
      event.preventDefault();
      glideTo(at);
    }),
  );
  document.querySelector("[data-footer-top]")?.addEventListener("click", (event) => {
    event.preventDefault();
    if (lenis) lenis.scrollTo(0, { duration: 2.4 });
    else window.scrollTo(0, 0);
  });

  // On a phone some stretches of the film PLAY rather than scrub (as /about, /work and /contact
  // do): crossing a resting point carries the page on to the next by itself — linearly, so
  // every part moves exactly as the scroll would have moved it — and the same way back.
  //   the hero → Chapter 02 settled (the story in, its phrases lit) → What We Do's first capability
  //   — slower, it is the opening
  //   the last project's opening → the call to action → the footer's foot
  // Each is a crossing, so a carry passing a point on its way never sets off another, and the
  // page is locked while it runs so the gesture that armed it can't cut it short.
  if (lenis && matchMedia("(max-width: 767px) and (prefers-reduced-motion: no-preference)").matches) {
    const studioRest = studioAt + b.studio * (STUDIO_MOTION.story.emphasisAt + 0.02);
    /** [from, to, seconds per screen] on the film's own clock. */
    const runs: [number, number, number][] = [[0, studioRest, 1.4]];
    // …the story film's zoom to the full frame, WHAT WE DO, and the film settling into the
    // capability window with the first capability lit (the end of its `settle`)
    if (capsBeat) runs.push([studioRest, capsAt + CAPS_MOTION.settle.end * capsLen + 0.02, 1.4]);
    // …and out of it: the window opening full-bleed, WORK announced and taken apart letter by
    // letter, the space arriving — to the first project standing in front (`travel.start`)
    if (capsBeat && workBeat)
      runs.push([capsAt + CAPS_MOTION.handoff.start * capsLen, workAt + WORK_MOTION.travel.start * workLen, 1.4]);
    if (workBeat && footerBeat) {
      const finaleAt = workAt + workLen * WORK_MOTION.finale.expand[0];
      runs.push([finaleAt, workAt + workLen, 1], [workAt + workLen, total, 1]);
    }
    const yAt = (time: number) => {
      const st = master.scrollTrigger!;
      return st.start + (time / total) * (st.end - st.start);
    };
    const SLACK = 12;
    let lastY = window.scrollY;
    const carry = (from: number, to: number, pace: number) => {
      const st = master.scrollTrigger!;
      const screens = (Math.abs(to - from) / (st.end - st.start)) * total;
      lenis!.scrollTo(to, { duration: screens * pace, easing: (t) => t, lock: true, force: true });
    };
    lenis.on("scroll", () => {
      const y = window.scrollY;
      const prev = lastY;
      lastY = y;
      const crossed = (at: number, down: boolean) => (down ? prev <= at && y > at : prev >= at && y < at);
      for (const [from, to, pace] of runs) {
        const a = yAt(from);
        const z = yAt(to);
        if (crossed(a + SLACK, true) && y < z) return carry(y, z, pace);
        if (crossed(z - SLACK, false) && y > a) return carry(y, a > 0 ? a - 2 : 0, pace);
      }
    });
  }

  // Films only load/decode when they're about to be seen, and only play while on screen.
  let loaded = false;
  let workLoaded = false;
  let lastActive = -1;
  function syncMedia(t: number) {
    if (!loaded && t > b.heroToStudio * 0.3) {
      loaded = true;
      [storyVideo, doVideo, ...capVideos].forEach((v) => {
        if (v) {
          v.preload = "auto";
          v.load();
        }
      });
    }
    if (workBeat && !workLoaded && t > capsAt + capsLen * 0.5) {
      workLoaded = true;
      workBeat.videos.forEach((v) => {
        v.preload = "auto";
        v.load();
      });
    }
    pauseHero(t > studioAt + 0.1);
    toggle(storyVideo, t > studioAt - 0.05 && t < studioAt + b.studio * 0.8);

    // The shared WHO WE ARE film plays from its first appearance until Film & Video hands over
    const capsP = capsBeat ? (t - capsAt) / capsLen : -1;
    const active = capsBeat && capsP >= 0 ? capsBeat.activeAt(capsP) : -1;
    toggle(doVideo, t > studioAt + b.studio * 0.28 && (active <= 0 || capsP < (capsBeat?.at[1] ?? 1)));
    // (the last capability's film is carried on into Work as project 01, so it keeps playing)
    capVideos.forEach((v, k) => toggle(v, capVideoIndex[k] === active));
    workBeat?.videos.forEach((v) => toggle(v, t > workAt + workLen * 0.2));

    caps?.classList.toggle("is-live", active >= 0 && capsP < CAPS_MOTION.handoff.start);
    if (caps && active !== lastActive) {
      lastActive = active;
      markActive(caps, Math.max(active, 0));
    }
  }
}

function toggle(video: HTMLVideoElement | null, on: boolean) {
  if (!video) return;
  if (on && video.paused) video.play().catch(() => {});
  else if (!on && !video.paused) video.pause();
}

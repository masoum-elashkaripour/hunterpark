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
  const workLen = workBeat ? workBeat.length : 0; // the phone list makes it shorter (work.ts)
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
      // (on a phone, to the capability's resting point — see the steps below — so it lands
      // settled)
      const time = !matchMedia("(max-width: 767px)").matches
        ? capsAt + capsBeat.at[i] * capsLen + 0.02
        : capsAt +
          (i === 0 ? CAPS_MOTION.settle.end * capsLen + 0.02 : (capsBeat.at[i] + CAPS_MOTION.change * 0.8) * capsLen);
      const y = st.start + (time / total) * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, { duration: 1.1 });
      else window.scrollTo(0, y);
    });
  }

  // What We Do's capabilities are STEPS, not a scrub to work through: each was 0.78 of a screen
  // of scroll (5.6 screens over five), so a wheel flick or a swipe moved a change only a third
  // of the way and took two or three to finish one. Here one gesture is one step — on the film's
  // own Lenis and ScrollTrigger, no second scroll system:
  //   · its resting points are the moments each capability has fully taken the window (and,
  //     after the fifth, the hand-off's end — the section closed, WORK announced);
  //   · inside that stretch a wheel gesture or a swipe is taken off Lenis and the page is carried
  //     to the next resting point in its direction, locked while it runs;
  //   · the rest of that gesture — a spun wheel's further notches, a trackpad's momentum, the
  //     rest of the swipe — is swallowed until it ends, so a fast flick still moves one step;
  //   · arriving from either side, the gesture that would cross into the stretch is caught at
  //     its first (or last) resting point; past the ends, scrolling is the page's own again.
  // (phones only: on a larger screen the capabilities scrub with the scroll, as they always have)
  // (the same stepping, below, takes the phone's Work slider one project per gesture)
  // (`take`: a gesture the stretch's own content takes instead — the Work slider stepping
  // through its projects — true if it did)
  // (set while the Work slider's own exit carries the page to the call to action, so the runs
  // below don't take that move over and slow it down)
  let exiting = false;
  const stepThrough = (stops: () => number[], cuts: () => number[], take?: (d: number, y: number) => boolean) => {
    const L = lenis!;
    const st = () => master.scrollTrigger!;
    const EPS = 4;
    const QUIET = 180; // ms of no input that ends a gesture
    let busy = false;
    let cooling = false;
    let lastInput = 0;
    let lastDelta = 0;
    let busyTimer = 0;
    /** One gesture made during a step, to be taken as soon as it ends (never more than one). */
    let pending = 0;

    // where each resting point's change BEGINS (its picture starting to cut in, or for the last,
    // the hand-off): between one change's end and the next one's start the film is still, and a
    // carry should not spend its first half crossing that — the reader would see nothing happen
    const soft = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2; // a soft in-out
    const SKIP = 0.08; // the share of a carry's time the still stretch is crossed in

    const carryStep = (to: number) => {
      const from = L.animatedScroll;
      const screens = (Math.abs(to - from) / (st().end - st().start)) * total;
      // a step ≈ 0.85s, the longer way out of the section a little more
      const duration = Math.min(1.4, Math.max(0.85, 0.6 + screens * 0.35));
      // the still stretch, as a share of the way: crossed at once, and the change itself then
      // starts with the gesture and eases in — at the start going down, at the end coming up
      const s = stops();
      const cs = cuts();
      const j = s.indexOf(to);
      let easing = soft;
      if (to > from && j >= 1 && cs[j] > from && cs[j] < to) {
        const d = (cs[j] - from) / (to - from);
        easing = (t) => (t < SKIP ? d * (t / SKIP) : d + (1 - d) * soft((t - SKIP) / (1 - SKIP)));
      } else if (to < from && j >= 0 && j + 1 < cs.length && cs[j + 1] < from && cs[j + 1] > to) {
        const d = (cs[j + 1] - to) / (from - to);
        easing = (t) =>
          t < 1 - SKIP ? (1 - d) * soft(t / (1 - SKIP)) : 1 - d + d * ((t - (1 - SKIP)) / SKIP);
      }
      busy = true;
      cooling = true;
      window.clearTimeout(busyTimer);
      // timed rather than onComplete: on a phone the hand-off's own carry (below) takes over
      // part-way through the last one
      busyTimer = window.setTimeout(() => {
        busy = false;
        // a gesture made while this step ran is not lost: it takes the next step now
        const d = pending;
        pending = 0;
        if (!d) return;
        const next = nextStop(d, L.animatedScroll, L.animatedScroll + d);
        if (next !== null) carryStep(next);
      }, duration * 1000 + 40);
      L.scrollTo(to, {
        duration,
        easing,
        lock: true,
        force: true,
      });
    };

    /** The resting point a gesture of direction `d` from `y` goes to, or null to let it be. */
    const nextStop = (d: number, y: number, intent: number) => {
      const s = stops();
      const lo = s[0];
      const hi = s[s.length - 1];
      if (d > 0) {
        if (y < lo - EPS) return intent >= lo ? lo : null; // arriving from above
        return s.find((v) => v > y + EPS) ?? null;
      }
      if (y > hi + EPS) return intent <= hi ? hi : null; // arriving from below
      return [...s].reverse().find((v) => v < y - EPS) ?? null;
    };
    const inStretch = (y: number) => {
      const s = stops();
      return y > s[0] - EPS && y < s[s.length - 1] + EPS;
    };
    const swallow = (e: Event) => {
      if (e.cancelable) e.preventDefault();
      e.stopImmediatePropagation();
    };

    window.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
        const d = Math.sign(e.deltaY);
        if (!d) return;
        const now = performance.now();
        const y = L.animatedScroll;
        const sinceLast = now - lastInput;
        const fresh =
          sinceLast > QUIET || d !== Math.sign(lastDelta) || Math.abs(e.deltaY) > Math.abs(lastDelta) * 1.6 + 8;
        lastInput = now;
        lastDelta = e.deltaY;
        if (busy || (cooling && !fresh)) {
          if (busy && fresh && inStretch(y)) pending = d;
          if (busy || inStretch(y)) swallow(e);
          return;
        }
        cooling = false;
        if (take?.(d, y)) {
          swallow(e);
          cooling = true; // the rest of this gesture is swallowed with it
          return;
        }
        const to = nextStop(d, y, L.targetScroll + e.deltaY);
        if (to === null) return;
        swallow(e);
        carryStep(to);
      },
      { capture: true, passive: false },
    );

    // Touch: one swipe, one step. (Lenis leaves touch to the browser; here a swipe that starts
    // inside the stretch is held, and moves the film one resting point when it's long enough.)
    let touchY = 0;
    let touchX = 0;
    let touchTaken = false;
    let touchDone = false;
    window.addEventListener(
      "touchstart",
      (e) => {
        touchY = e.touches[0]?.clientY ?? 0;
        touchX = e.touches[0]?.clientX ?? 0;
        touchTaken = inStretch(window.scrollY) || busy;
        touchDone = false;
      },
      { capture: true, passive: true },
    );
    window.addEventListener(
      "touchmove",
      (e) => {
        if (!touchTaken) return;
        const dy = touchY - (e.touches[0]?.clientY ?? touchY);
        // a sideways swipe is not a step (the Work slider takes those by hand)
        if (Math.abs(touchX - (e.touches[0]?.clientX ?? touchX)) > Math.abs(dy)) return swallow(e);
        if (busy && !touchDone && Math.abs(dy) >= 14) {
          // a swipe made while a step is still running: kept for when it ends
          pending = Math.sign(dy);
          touchDone = true;
        }
        if (touchDone || busy) return swallow(e);
        if (Math.abs(dy) < 14) return swallow(e);
        if (take?.(Math.sign(dy), window.scrollY)) {
          swallow(e);
          touchDone = true;
          return;
        }
        const to = nextStop(Math.sign(dy), window.scrollY, window.scrollY + dy);
        if (to === null) {
          touchTaken = false; // past an end: the page scrolls as itself
          return;
        }
        swallow(e);
        touchDone = true;
        carryStep(to);
      },
      { capture: true, passive: false },
    );
  };
  if (lenis && matchMedia("(max-width: 767px)").matches) {
    const yAt = (time: number) => {
      const st = master.scrollTrigger!;
      return st.start + (time / total) * (st.end - st.start);
    };
    if (capsBeat) {
      const c = CAPS_MOTION.change;
      stepThrough(
        // (the first matches the phone's carry in, which lands there; each later one is where
        // the incoming capability has settled and the outgoing one been taken away — `at` + 0.8)
        () => [
          yAt(capsAt + CAPS_MOTION.settle.end * capsLen + 0.02),
          ...capsBeat.at.slice(1).map((a) => yAt(capsAt + (a + c * 0.8) * capsLen)),
          yAt(capsAt + CAPS_MOTION.handoff.end * capsLen),
        ],
        // where each resting point's change BEGINS (its picture starting to cut in, or for the
        // last, the hand-off): between one change's end and the next one's start the film is
        // still, and a carry should not spend its first half crossing that
        () => [
          Number.NaN,
          ...capsBeat.at.slice(1).map((a) => yAt(capsAt + (a - c * 0.5) * capsLen)),
          yAt(capsAt + CAPS_MOTION.handoff.start * capsLen),
        ],
      );
    }
    // the Work slider: a resting point with each project in front, from the first (where the
    // carry out of What We Do lands) to the last (where the finale's own carry takes over)
    if (workBeat?.slides.length) {
      const slides = workBeat.slides;
      const wb = workBeat;
      stepThrough(
        () => slides.map((f) => yAt(workAt + f * workLen)),
        () => [],
        // resting on the slider, a vertical gesture moves it a project first
        (d, y) => Math.abs(y - yAt(workAt + slides[0] * workLen)) < 8 && wb.stepSlider(d),
      );
      // …and on from the last project (a gesture, or its clock) the page goes straight to the
      // call to action standing whole — ONE brisk move through the finale opening out, not a
      // slow step to the hold's end and then the finale's own long carry after it
      wb.setSliderEnd(() => {
        const from = window.scrollY;
        const to = yAt(workAt + workLen);
        const screens = Math.abs(to - from) / window.innerHeight;
        exiting = true;
        lenis!.scrollTo(to, {
          duration: Math.min(1.8, Math.max(1.1, screens * 0.45)),
          easing: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
          lock: true,
          force: true,
          onComplete: () => {
            exiting = false;
          },
        });
      });
    }
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
    const runs: [number, number, number, number?][] = [[0, studioRest, 1.4]];
    // …the story film's zoom to the full frame, WHAT WE DO, and the film settling into the
    // capability window with the first capability lit (the end of its `settle`)
    if (capsBeat) runs.push([studioRest, capsAt + CAPS_MOTION.settle.end * capsLen + 0.02, 1.4]);
    // …and out of it: the window opening full-bleed, WORK announced and taken apart letter by
    // letter, the space arriving — to the first project standing in front (`travel.start`)
    // (from the last capability's resting point — the What We Do steps below — so the way back
    // up lands on it, the fifth capability settled, rather than short of it)
    if (capsBeat && workBeat) {
      const lastRest = capsBeat.at[capsBeat.at.length - 1] + CAPS_MOTION.change * 0.8;
      runs.push([capsAt + lastRest * capsLen, workAt + workBeat.at(WORK_MOTION.travel.start) * workLen, 1.4]);
    }
    // (and on the way back up from the footer, the call to action builds itself again, as it
    // did on the way down, rather than standing there whole as the footer slides off it)
    let footerRun: [number, number, number, number?] | null = null;
    let ctaReplay = 0; // seconds: the call to action's share of its carry on the way down
    if (workBeat && footerBeat) {
      const finaleAt = workAt + workLen * workBeat.at(WORK_MOTION.finale.expand[0]);
      footerRun = [workAt + workLen, total, 1];
      // (on the phone slider, coming back up from the call to action lands on the slider's own
      // resting point, live — not on the stop past it, where the finale stood and took no swipe)
      const back = workBeat.slides.length ? workAt + workLen * workBeat.slides[0] : undefined;
      runs.push([finaleAt, workAt + workLen, 1, back], footerRun);
      const screens = workAt + workLen - finaleAt; // (the film's clock runs in screens)
      const F = WORK_MOTION.finale;
      const share = (workBeat.at(F.action[1]) - workBeat.at(F.words.start)) / (1 - workBeat.at(F.expand[0]));
      ctaReplay = Math.max(1.4, Math.min(3, screens * 0.8) * share);
    }
    const yAt = (time: number) => {
      const st = master.scrollTrigger!;
      return st.start + (time / total) * (st.end - st.start);
    };
    const SLACK = 12;
    let lastY = window.scrollY;
    let carrying = false;
    const carry = (from: number, to: number, pace: number, then?: () => void) => {
      const st = master.scrollTrigger!;
      const screens = (Math.abs(to - from) / (st.end - st.start)) * total;
      carrying = true;
      // a second a screen at the stretch's pace, 20% brisker on a phone, and never over 3s
      lenis!.scrollTo(to, {
        duration: Math.min(3, screens * pace * 0.8),
        easing: (t) => t,
        lock: true,
        force: true,
        onComplete: () => {
          carrying = false;
          then?.();
        },
      });
    };
    lenis.on("scroll", () => {
      if (exiting) {
        lastY = window.scrollY;
        return;
      }
      const y = window.scrollY;
      const prev = lastY;
      lastY = y;
      // the reader moved on while the call to action was still building itself: finish it
      if (!carrying && Math.abs(y - prev) > 0.5) workBeat?.settleCta();
      const crossed = (at: number, down: boolean) => (down ? prev <= at && y > at : prev >= at && y < at);
      for (const run of runs) {
        const [from, to, pace, back] = run;
        const a = yAt(from);
        const z = yAt(to);
        if (crossed(a + SLACK, true) && y < z) return carry(y, z, pace);
        if (crossed(z - SLACK, false) && y > a) {
          if (run === footerRun && workBeat) {
            workBeat.hideCta();
            return carry(y, a - 2, pace, () => workBeat.replayCta(ctaReplay));
          }
          return carry(y, back !== undefined ? yAt(back) - 2 : a > 0 ? a - 2 : 0, pace);
        }
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

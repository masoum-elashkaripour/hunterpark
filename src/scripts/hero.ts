import { gsap } from "gsap";
import { onSiteReady, prefersReducedMotion } from "./lifecycle";

/**
 * Hero media sequence.
 *
 * One clock at a time, owned by the active item:
 *  - a still holds for the configured interval (a GSAP tween fills its lime bar);
 *  - a film plays through to its natural `ended` (the bar tracks playback).
 * Then the next item takes over. Picking a thumbnail activates that item with a
 * fresh clock (films restart from 0) and the sequence carries on from there.
 *
 * Every activation bumps a token and aborts the previous item's listeners/tweens,
 * so rapid clicks or a film ending mid-switch can never double-advance.
 * The clock pauses only when the hero is off-screen or the tab is hidden.
 */
/** Pause/resume the hero reel from outside (e.g. while Chapter 02 covers it). */
export let pauseHero: (on: boolean) => void = () => {};

export function initHero(): void {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return;

  const reduced = prefersReducedMotion();
  const intervalSec = (Number(hero.dataset.interval) || 5000) / 1000;
  // Queried document-wide and ordered by index: slide 0 may be on loan to the preloader.
  const backgrounds = Array.from(document.querySelectorAll<HTMLImageElement | HTMLVideoElement>("[data-hero-bg]")).sort(
    (a, b) => Number(a.dataset.heroBg) - Number(b.dataset.heroBg),
  );
  const thumbs = hero.querySelectorAll<HTMLButtonElement>("[data-hero-thumb]");
  const bars = Array.from(thumbs).map((t) => t.querySelector<HTMLElement>(".hero__progress"));
  const count = hero.querySelector<HTMLElement>("[data-hero-count]");
  const thumbRow = hero.querySelector<HTMLElement>(".hero__thumbs");

  // View Project, pressed by a finger: a touch has no hover and `:active` is not dependable
  // on one (iOS only applies it with a listener), so the press is a class the CSS keys on
  const viewProject = hero.querySelector<HTMLElement>("[data-view-project]");
  if (viewProject) {
    const press = (on: boolean) => viewProject.classList.toggle("is-pressed", on);
    viewProject.addEventListener("pointerdown", (e) => e.pointerType !== "mouse" && press(true));
    for (const end of ["pointerup", "pointercancel", "pointerleave"] as const) {
      viewProject.addEventListener(end, () => press(false));
    }
    // Coming back from the project with the browser's back button: never left lit
    window.addEventListener("pageshow", () => press(false));
  }

  const isFilm = (el: Element): el is HTMLVideoElement => el instanceof HTMLVideoElement;

  let active = 0;
  let running = false; // autoplay has started (after the intro)
  let token = 0; // identifies the current activation
  let clock: AbortController | null = null; // tears down the current item's timing
  let tween: gsap.core.Tween | null = null; // still timer
  const pauseReasons = new Set<string>();
  const paused = () => pauseReasons.size > 0;

  // --- Visual switch ----------------------------------------------------------
  function swapVisuals(index: number) {
    const previous = backgrounds[active];
    const next = backgrounds[index];

    backgrounds.forEach((bg) => bg !== previous && bg.classList.remove("is-leaving"));
    previous.classList.remove("is-active");
    previous.classList.add("is-leaving");
    next.classList.add("is-active");
    next.addEventListener(
      "transitionend",
      () => {
        previous.classList.remove("is-leaving");
        // A film that has faded out stops decoding frames nobody can see.
        if (isFilm(previous) && !previous.classList.contains("is-active")) previous.pause();
      },
      { once: true },
    );

    thumbs[active].classList.remove("is-active");
    thumbs[active].removeAttribute("aria-current");
    thumbs[index].classList.add("is-active");
    thumbs[index].setAttribute("aria-current", "true");
    rollCount(String(index + 1).padStart(2, "0"));

    // Keep the active thumbnail in view when the row scrolls (mobile).
    if (thumbRow && thumbRow.scrollWidth > thumbRow.clientWidth) {
      const item = thumbs[index].parentElement!;
      thumbRow.scrollTo({ left: item.offsetLeft - thumbRow.offsetLeft - 20, behavior: reduced ? "auto" : "smooth" });
    }
  }

  // The folio number rolls: the old figure lifts out of its mask, the new one rises in.
  function rollCount(value: string) {
    if (!count) return;
    gsap.killTweensOf(count);
    if (reduced) {
      count.textContent = value;
      return;
    }
    gsap.to(count, {
      yPercent: -105,
      duration: 0.3,
      ease: "expo.in",
      onComplete: () => {
        count.textContent = value;
        gsap.fromTo(count, { yPercent: 105 }, { yPercent: 0, duration: 0.7, ease: "expo.out" });
      },
    });
  }

  // --- Clock ------------------------------------------------------------------
  function stopClock() {
    clock?.abort();
    clock = null;
    tween?.kill();
    tween = null;
    bars.forEach((bar) => bar && gsap.set(bar, { scaleX: 0 }));
  }

  const advance = (from: number) => {
    if (from !== token) return; // a stale clock fired after the user moved on
    activate((active + 1) % backgrounds.length, { restartFilm: true });
  };

  /** Still: hold for the interval, filling the lime bar. */
  function clockStill(id: number) {
    const bar = bars[active];
    tween = gsap.fromTo(
      bar ?? {},
      { scaleX: 0 },
      { scaleX: 1, duration: intervalSec, ease: "none", onComplete: () => advance(id) },
    );
    if (paused()) tween.pause();
  }

  /** Film: play to its natural end; the bar mirrors playback. */
  function clockFilm(video: HTMLVideoElement, id: number, restart: boolean) {
    const { signal } = (clock = new AbortController());
    const bar = bars[active];
    video.loop = false; // once it holds the clock, a film ends instead of looping
    if (restart) video.currentTime = 0;

    const track = () => {
      if (bar && video.duration) gsap.set(bar, { scaleX: video.currentTime / video.duration });
    };
    gsap.ticker.add(track);
    signal.addEventListener("abort", () => gsap.ticker.remove(track));

    video.addEventListener("ended", () => advance(id), { signal });

    // If the film can't play (autoplay refused, decode error), fall back to the still timer
    // so the sequence never stalls on it.
    const fallBack = () => {
      if (id !== token || signal.aborted) return;
      clock?.abort();
      clockStill(id);
    };
    video.addEventListener("error", fallBack, { signal });
    video.querySelector("source:last-child")?.addEventListener("error", fallBack, { signal });

    if (!paused()) video.play().catch(fallBack);
  }

  /** Make `index` the active item and hand it the clock. */
  function activate(index: number, { restartFilm = false } = {}) {
    stopClock();
    const id = ++token;
    if (index !== active) {
      swapVisuals(index);
      active = index;
    }
    warm((index + 1) % backgrounds.length);

    const el = backgrounds[index];
    if (reduced) return; // no autoplay; films hold on their poster
    if (!running) {
      // Before autoplay starts, a picked film still plays; it just doesn't drive the sequence.
      if (isFilm(el)) el.play().catch(() => {});
      return;
    }
    if (isFilm(el)) clockFilm(el, id, restartFilm);
    else clockStill(id);
  }

  // Fetch the next slide ahead of time so a fade never lands on an empty frame.
  function warm(index: number) {
    const el = backgrounds[index];
    if (isFilm(el)) {
      if (el.preload !== "auto") el.preload = "auto";
      return;
    }
    el.loading = "eager";
    el.decode?.().catch(() => {});
  }

  if (reduced) backgrounds.forEach((el) => isFilm(el) && el.pause());

  // --- Manual selection: switch now, fresh clock, sequence carries on ----------
  thumbs.forEach((thumb) => {
    const index = Number(thumb.dataset.heroThumb);
    thumb.addEventListener("click", () => {
      warm(index);
      activate(index, { restartFilm: true });
    });
  });

  // --- Pause only when nobody can see it: off-screen or tab hidden -------------
  const setPaused = (reason: string, on: boolean) => {
    const was = paused();
    if (on) pauseReasons.add(reason);
    else pauseReasons.delete(reason);
    if (was === paused()) return;
    const el = backgrounds[active];
    if (!running) {
      // still in the intro: the opening film rolls from the preloader, so hold it too
      if (isFilm(el) && !reduced) paused() ? el.pause() : el.play().catch(() => {});
      return;
    }
    if (paused()) {
      tween?.pause();
      if (isFilm(el)) el.pause();
    } else {
      tween?.resume();
      if (isFilm(el) && !reduced) el.play().catch(() => {});
    }
  };
  document.addEventListener("visibilitychange", () => setPaused("hidden", document.hidden));
  new IntersectionObserver(([entry]) => setPaused("offscreen", !entry.isIntersecting)).observe(hero);
  // The hero stays in the viewport inside the pinned film, so the film says when it's covered.
  pauseHero = (on) => setPaused("offstage", on);

  // --- Intro, then start the clock ------------------------------------------
  onSiteReady(() => {
    warm(1);
    const first = backgrounds[active];
    if (isFilm(first) && !reduced) first.play().catch(() => {}); // keeps rolling out of the preloader

    // The opening film carries straight on from the preloader (no restart), then ends naturally.
    const start = () => {
      running = true;
      activate(active);
    };

    if (reduced) {
      gsap.set(hero.querySelectorAll("[data-hero-reveal]"), { yPercent: 0, y: 0 });
      gsap.set(hero.querySelectorAll("[data-hero-thumb-item], [data-hero-fade]"), { opacity: 1 });
      return;
    }

    gsap
      .timeline({ defaults: { ease: "expo.out" }, onComplete: start })
      .fromTo(
        hero.querySelectorAll("[data-hero-reveal]"),
        { y: 0, yPercent: 110 },
        { yPercent: 0, duration: 1.2, stagger: 0.1 },
        0.3,
      )
      .fromTo(
        hero.querySelectorAll("[data-hero-thumb-item]"),
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1, stagger: 0.06 },
        0.5,
      )
      .fromTo(hero.querySelectorAll("[data-hero-fade]"), { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.8);
  });
}

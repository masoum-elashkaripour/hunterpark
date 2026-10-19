/**
 * HunterPark's ambient soundtrack — composed in code with Web Audio, not a file.
 *
 * A slow generative piece: warm, filtered pads moving through four chords (Dmaj9 → Bm11 →
 * Gmaj7#11 → A6sus2) over a quiet sub, sparse high bell "glints" with a ping-pong echo, and
 * a breath of filtered air — all in one long synthetic room. Nothing is looped, so there is
 * no seam: it simply carries on, never quite repeating.
 *
 * One engine for the whole site, created once (site.ts) and never restarted. It starts as the
 * preloader hands over to the hero. Where the browser blocks sound until the visitor
 * interacts, it starts on the first interaction the browser accepts (click, tap, key press) —
 * including a press of the sound toggle itself. The toggle shows what is actually heard,
 * mutes and unmutes it, and the choice is remembered for the visit (sessionStorage).
 */
import { onSiteReady } from "./lifecycle";

const STORAGE_KEY = "hp:sound"; // "off" when the visitor has muted it
const VOLUME = 0.45; // master level — present but quiet (about -31 dBFS RMS)
const FADE_IN = 6; // seconds, the first time it starts
const TOGGLE = 0.12; // mute / unmute ramp (time constant, s) — instant, without a click

// The progression, as MIDI notes. Each chord holds for CHORD_S and cross-fades into the next.
const CHORDS = [
  [50, 54, 57, 61, 64], // Dmaj9
  [47, 50, 54, 57, 64], // Bm11
  [43, 47, 50, 54, 61], // Gmaj7#11
  [45, 52, 57, 59, 66], // A6sus2
];
const CHORD_S = 10;
const GLINTS = [74, 76, 78, 81, 83, 86, 88]; // D major pentatonic, high
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

interface Engine {
  ctx: AudioContext;
  /** True once the piece has begun (it is only ever begun once). */
  readonly started: boolean;
  start(): void;
  setMuted(muted: boolean): void;
}

// The mute choice lasts for the visit (every section, every reload in this tab), not forever:
// each new visit begins with the soundtrack. (It used to be kept in localStorage, which left
// anyone who had once muted it — or tested the toggle — silent on every later visit.)
function readMuted(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY); // clear the old, permanent choice
    return sessionStorage.getItem(STORAGE_KEY) === "off";
  } catch {
    return false;
  }
}

function saveMuted(muted: boolean): void {
  try {
    if (muted) sessionStorage.setItem(STORAGE_KEY, "off");
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — the choice lasts for this visit only */
  }
}

/**
 * White noise for the buffers below: an xorshift32 generator, in [-1, 1).
 * Math.random() per sample was the single most expensive thing the homepage did on
 * load — the room alone is ~576k samples — and noise has no need of its quality.
 */
function noise(): () => number {
  let s = (Math.random() * 0xffffffff) | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return s / 2147483648;
  };
}

/**
 * A long, dark synthetic room: decaying stereo noise. The decay curve is taken every
 * 64 samples and stepped linearly between (an error of ~1e-8) rather than a Math.pow
 * per sample.
 */
function impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  const STEP = 64;
  const curve = new Float32Array(Math.ceil(length / STEP) + 1);
  for (let k = 0; k < curve.length; k++) curve[k] = Math.pow(Math.max(0, 1 - (k * STEP) / length), decay);
  const rand = noise();
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let k = 0; k < curve.length - 1; k++) {
      const end = Math.min(length, (k + 1) * STEP);
      const slope = (curve[k + 1] - curve[k]) / STEP;
      let env = curve[k];
      for (let i = k * STEP; i < end; i++) {
        data[i] = rand() * env;
        env += slope;
      }
    }
  }
  return buffer;
}

/** A few seconds of soft (brown) noise for the air layer. */
function airBuffer(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 6;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rand = noise();
  let last = 0;
  for (let i = 0; i < length; i++) {
    last = (last + 0.02 * rand()) / 1.02;
    data[i] = last * 3.5;
  }
  // fade the ends into each other so the loop has no click
  const fade = ctx.sampleRate * 0.5;
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    data[i] *= t;
    data[length - 1 - i] *= t;
  }
  return buffer;
}

function createEngine(): Engine {
  const ctx = new AudioContext({ latencyHint: "playback" });
  const now = () => ctx.currentTime;

  // Master chain: everything → (dry + room) → master → gentle limiter → out
  const master = ctx.createGain();
  master.gain.value = 0;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -18;
  limiter.ratio.value = 3;
  master.connect(limiter).connect(ctx.destination);

  const bus = ctx.createGain();
  const dry = ctx.createGain();
  dry.gain.value = 0.55;
  const room = ctx.createConvolver();
  room.buffer = impulse(ctx, 6, 2.6);
  const wet = ctx.createGain();
  wet.gain.value = 0.7;
  bus.connect(dry).connect(master);
  bus.connect(room).connect(wet).connect(master);

  // Pads breathe through one shared filter whose cutoff drifts slowly
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 900;
  padFilter.Q.value = 0.6;
  const drift = ctx.createOscillator();
  drift.frequency.value = 0.035;
  const driftDepth = ctx.createGain();
  driftDepth.gain.value = 380;
  drift.connect(driftDepth).connect(padFilter.frequency);
  padFilter.connect(bus);

  // Ping-pong echo for the glints
  const echoIn = ctx.createGain();
  const left = ctx.createDelay(2);
  const right = ctx.createDelay(2);
  left.delayTime.value = 0.46;
  right.delayTime.value = 0.69;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = "lowpass";
  echoTone.frequency.value = 2600;
  const merge = ctx.createChannelMerger(2);
  echoIn.connect(left);
  left.connect(right);
  right.connect(echoTone).connect(feedback).connect(left);
  left.connect(merge, 0, 0);
  right.connect(merge, 0, 1);
  const echoOut = ctx.createGain();
  echoOut.gain.value = 0.5;
  merge.connect(echoOut).connect(bus);

  let started = false;
  let running = false;
  let timers: number[] = [];
  let chord = 0;

  /** One pad chord: detuned voices swelling in and out over CHORD_S (+ tails). */
  function playChord(notes: number[], at: number) {
    const attack = 4;
    const hold = CHORD_S - 2;
    const release = 6;
    notes.forEach((note, i) => {
      const voice = ctx.createGain();
      voice.gain.setValueAtTime(0, at);
      voice.gain.linearRampToValueAtTime(0.028, at + attack);
      voice.gain.setValueAtTime(0.028, at + hold);
      voice.gain.linearRampToValueAtTime(0, at + hold + release);
      const pan = ctx.createStereoPanner();
      pan.pan.value = (i / (notes.length - 1)) * 1.2 - 0.6;
      voice.connect(pan).connect(padFilter);
      for (const [type, cents, level] of [
        ["sawtooth", -7, 0.55],
        ["sawtooth", 7, 0.55],
        ["triangle", 0, 1],
      ] as const) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = hz(note);
        osc.detune.value = cents;
        const g = ctx.createGain();
        g.gain.value = level;
        osc.connect(g).connect(voice);
        osc.start(at);
        osc.stop(at + hold + release + 0.1);
      }
    });
    // The sub: the root two octaves down, a sine under everything
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = hz(notes[0] - 12);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0, at);
    subGain.gain.linearRampToValueAtTime(0.09, at + attack);
    subGain.gain.setValueAtTime(0.09, at + hold);
    subGain.gain.linearRampToValueAtTime(0, at + hold + release);
    sub.connect(subGain).connect(master);
    sub.start(at);
    sub.stop(at + hold + release + 0.1);
  }

  /** A single bell-like glint: a sine and its octave, struck softly, into the echo. */
  function playGlint(at: number) {
    const note = GLINTS[Math.floor(Math.random() * GLINTS.length)];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.045, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 3.2);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.4 - 0.7;
    g.connect(pan);
    pan.connect(bus);
    pan.connect(echoIn);
    [1, 2].forEach((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = hz(note) * mult;
      const level = ctx.createGain();
      level.gain.value = i ? 0.25 : 1;
      osc.connect(level).connect(g);
      osc.start(at);
      osc.stop(at + 3.4);
    });
  }

  /** The air: soft noise through a band-pass, slowly breathing. */
  function startAir() {
    const src = ctx.createBufferSource();
    src.buffer = airBuffer(ctx);
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1400;
    band.Q.value = 0.5;
    const level = ctx.createGain();
    level.gain.value = 0.02;
    const breath = ctx.createOscillator();
    breath.frequency.value = 0.07;
    const breathDepth = ctx.createGain();
    breathDepth.gain.value = 0.012;
    breath.connect(breathDepth).connect(level.gain);
    src.connect(band).connect(level).connect(bus);
    src.start();
    breath.start();
  }

  // Scheduling runs only while the sound is on: nothing piles up while muted
  function scheduleChords() {
    playChord(CHORDS[chord % CHORDS.length], now() + 0.05);
    chord++;
    timers.push(window.setTimeout(scheduleChords, (CHORD_S - 0.5) * 1000));
  }
  function scheduleGlints() {
    playGlint(now() + 0.05);
    // now and then a second glint answers the first
    if (Math.random() < 0.3) playGlint(now() + 0.05 + 0.35 + Math.random() * 0.4);
    timers.push(window.setTimeout(scheduleGlints, (2.8 + Math.random() * 4.5) * 1000));
  }
  function play() {
    if (running) return;
    running = true;
    scheduleChords();
    timers.push(window.setTimeout(scheduleGlints, 3500));
  }
  function stop() {
    running = false;
    timers.forEach(clearTimeout);
    timers = [];
  }

  return {
    ctx,
    get started() {
      return started;
    },
    start() {
      if (started) return;
      started = true;
      drift.start();
      startAir();
      play();
      master.gain.setValueAtTime(0, now());
      // the long fade only the first time this visit; carrying on from the page before, it
      // comes straight back in (a breath, not a new start)
      let carried = false;
      try {
        carried = sessionStorage.getItem("hp:sound-heard") === "1";
      } catch {
        /* storage unavailable */
      }
      master.gain.linearRampToValueAtTime(VOLUME, now() + (carried ? 1.2 : FADE_IN));
    },
    setMuted(muted: boolean) {
      if (!started) return;
      master.gain.cancelScheduledValues(now());
      master.gain.setTargetAtTime(muted ? 0 : VOLUME, now(), TOGGLE);
      if (muted) {
        stop();
        // once it has fallen silent, rest the audio thread entirely
        window.setTimeout(() => {
          if (!running) ctx.suspend().catch(() => {});
        }, TOGGLE * 6 * 1000);
      } else {
        ctx.resume().catch(() => {});
        play();
      }
    },
  };
}

declare global {
  interface Window {
    __hpSoundtrack?: true;
  }
}

// The interactions browsers accept as permission to play sound (scrolling and the wheel don't)
const UNLOCK_EVENTS = ["pointerdown", "pointerup", "mousedown", "touchend", "keydown", "click"] as const;

/**
 * `immediate`: the page has no preloader to wait for (the inner pages) — the piece may begin at
 * once, or at the first interaction the browser accepts.
 */
export function initSoundtrack({ immediate = false }: { immediate?: boolean } = {}): void {
  // One soundtrack per page, ever — even if this runs twice (e.g. a hot reload in development)
  if (window.__hpSoundtrack) return;
  window.__hpSoundtrack = true;

  const button = document.querySelector<HTMLButtonElement>("[data-sound-toggle]");
  if (typeof window.AudioContext !== "function") {
    button?.remove(); // no Web Audio: no soundtrack, and no control for one
    return;
  }

  // Two separate things: what the visitor wants (muted or not, remembered), and what is
  // actually heard (the engine has begun, its audio is running, and it isn't muted).
  let muted = readMuted();
  let engine: Engine | null = null;
  let entered = false; // the piece begins as the preloader hands over to the hero

  // The toggle shows the visitor's choice: ON from the first frame unless they have muted it
  // — even while the browser still holds the sound back until their first tap or key press,
  // when it begins by itself. (It used to show only what was actually heard, so on a first
  // load it sat off until that interaction.)
  const reflect = () => button?.setAttribute("aria-pressed", String(!muted));
  reflect();

  /** Builds the one engine (idempotent). */
  function prepare(): Engine {
    if (!engine) {
      engine = createEngine();
      engine.ctx.addEventListener("statechange", reflect);
    }
    return engine;
  }

  /** Makes sure the one engine is playing, as far as the browser allows right now. */
  function play() {
    const e = prepare();
    const go = () => {
      // Sound can be unlocked early (an interaction during the preloader); it begins on entry
      if (e.ctx.state !== "running" || muted || !entered) return;
      if (e.started) e.setMuted(false);
      else e.start();
      // remembered for the visit: the next page (a full load — the home page and the inner
      // pages are separate documents) starts it at once rather than waiting for a tap
      try {
        sessionStorage.setItem("hp:sound-heard", "1");
      } catch {
        /* storage unavailable */
      }
      unlocked();
    };
    if (e.ctx.state === "running") go();
    else e.ctx.resume().then(go, () => {}); // inside an accepted interaction this succeeds at once
    reflect();
  }

  // Until sound is allowed, every accepted interaction tries again (the toggle handles its own)
  const onInteraction = (event: Event) => {
    if (button && event.target instanceof Node && button.contains(event.target)) return;
    if (!muted) play();
  };
  function listen() {
    UNLOCK_EVENTS.forEach((type) => window.addEventListener(type, onInteraction, { capture: true, passive: true }));
  }
  function unlocked() {
    UNLOCK_EVENTS.forEach((type) => window.removeEventListener(type, onInteraction, { capture: true }));
    reflect();
  }

  // The engine (its audio context, and the room's long impulse) is built only once the
  // browser will let it sound — at the first accepted interaction, or at entry when the visitor
  // has already interacted with the page. Built earlier it was refused anyway (the console's
  // "AudioContext was not allowed to start") and its impulse cost the page's first seconds.
  if (!muted) listen();
  const allowed = () => {
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (!ua || ua.hasBeenActive) return true;
    // …or it was playing on the page before this one, this visit: try at once — browsers that
    // count the visitor's earlier interaction with the site let it carry straight on, and where
    // one does not, the first tap here starts it (the listeners above)
    try {
      return sessionStorage.getItem("hp:sound-heard") === "1";
    } catch {
      return false;
    }
  };
  const enter = () => {
    entered = true;
    if (!muted && allowed()) play();
  };
  if (immediate) enter();
  else onSiteReady(enter);

  // The toggle acts on the choice it shows: on → mute; off → play (its press is itself an
  // interaction that lets the browser play).
  button?.addEventListener("click", () => {
    if (!muted) {
      muted = true;
      saveMuted(true);
      engine?.setMuted(true);
    } else {
      muted = false;
      saveMuted(false);
      entered = true; // a press of the toggle always means "play now"
      play();
    }
    reflect();
  });

  // Rest while the tab is hidden; pick up again when it's back
  document.addEventListener("visibilitychange", () => {
    if (!engine?.started || muted) return;
    engine.setMuted(document.hidden);
  });
}

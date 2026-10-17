"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { type Work } from "@/lib/works";
import { onSoundChange, soundEnabled } from "@/lib/sound";

/* -- Tuning knobs. All of the carousel's feel lives in these six numbers. -- */

/** Card width in world units; height follows from 16:9. */
const CARD_W = 4;
const CARD_H = (CARD_W * 9) / 16;
/**
 * Radius of the arc the cards sit on.
 *
 * Read together with `STEP`, never alone: the distance between two card
 * centres is `RADIUS * STEP`, so these two have to move in opposite directions
 * to keep the gaps where they are. This pair holds that product at ~4.05 world
 * units, the same as the 8 / 29° it replaces — the spacing is untouched, the
 * curve is simply drawn on a larger, gentler circle.
 */
const RADIUS = CARD_W * 2.64;
/**
 * Degrees between neighbouring cards.
 *
 * Lowered from 29° with `RADIUS` raised to match, so each card is turned less
 * and the run of them reads as part of a large circle rather than as a sharp
 * fold. Do NOT change this on its own: the edge-to-edge gap is
 * `RADIUS * STEP - CARD_W`, and at this spacing that is only 0.05 against a
 * four-unit card, so any change to one number alone either overlaps the cards
 * or flings them apart.
 *
 * The gentler angle also leans the neighbours less far toward the camera
 * (z 1.00 → 0.77), which is what `FIT_H` measures when it decides how far back
 * to pull — so the centred card keeps its size rather than paying for the
 * curve, which is what went wrong when 33° was tried on its own.
 */
const STEP = 22;
/**
 * Card curvature. Negative = concave: the middle of the card sits further from
 * the camera than its left and right edges, so the edges read slightly taller.
 */
const BEND = CARD_W * -0.042;
/**
 * Depth of the arc, as a fraction of a true circle. Must stay at 1: anything
 * else scales z without scaling x, which puts the cards on an ellipse while
 * each is still rotated to a circle's tangent. The two disagree by up to 5°,
 * and a card riding into the centre visibly drifts off the curve.
 */
const DEPTH = 1;
/** Cards drawn either side of centre. Beyond ±2 they fall outside the frustum. */
const WINDOW = 2;
/**
 * Fraction of viewport width the centre card should span, and how far its
 * neighbours are darkened — BY HOW MUCH ROOM THERE IS.
 *
 * One number for every screen was the problem. 0.62 is right on a laptop,
 * where 38% of a wide frame still leaves the neighbours a generous sliver
 * each; on a phone the same 62% of 375px is a 232px card with two cards
 * crowding it, and the film everyone is actually looking at is the smallest
 * thing on screen.
 *
 * `fit` is the only lever that moves, and it moves both ways at once: the
 * centre card grows, and because the arc's geometry is fixed the neighbours
 * are pushed correspondingly further out of frame. At 0.80 a neighbour's near
 * edge lands at 84% of the half-width, so it peeks by about 30px on a phone
 * instead of taking a third of the screen.
 *
 * `step` and `RADIUS` are deliberately NOT touched. Their product is the
 * edge-to-edge gap between cards and it is 0.05 world units against a
 * four-unit card — see `STEP`. Changing one to shrink the neighbours would
 * either overlap the cards or fling them apart, and raising `fit` achieves the
 * same thing without disturbing the curve at all.
 *
 * `shade` rises with it: a smaller neighbour that is still at full brightness
 * competes harder for the eye than a large one, because it reads as a bright
 * edge rather than as part of a run.
 */
/**
 * `fov` is the camera's vertical angle, and on a phone it is what makes the ring
 * read as a ring. At the desktop's 38° the camera stands far back, the arc is
 * flattened to almost a straight row, and with the centre card at 0.8 of the
 * width the neighbours were slivers — the reel looked like a flat slider. A
 * wider angle brings the camera in close, so the neighbours visibly swing
 * toward the reader and the cards' own bend shows; a slightly smaller centre
 * card leaves enough of them on screen for the curve to be seen.
 */
const TUNING = {
  phone: { fit: 0.64, shade: 0.45, fov: 74 },
  tablet: { fit: 0.7, shade: 0.6, fov: 38 },
  desktop: { fit: 0.62, shade: 0.55, fov: 38 },
};

/** Matched to the stylesheet's own breakpoints, not to device names. */
const tuningFor = (w: number) =>
  w < 640 ? TUNING.phone : w < 1024 ? TUNING.tablet : TUNING.desktop;
/**
 * Ceiling on how much of the canvas half-height any card may cover. 1.0 is the
 * canvas edge exactly, so this leaves a sliver of margin. Neighbours swing
 * toward the camera and project taller than the centred card, and on a short
 * stage that would slice them off top and bottom.
 */
const FIT_H = 0.98;
/** Cards advanced per pixel of wheel / trackpad travel. */
const WHEEL_PER_PX = 1 / 450;
/** Idle time after the last wheel event before snapping to the nearest card. */
const SETTLE_MS = 140;
/** Pointer travel, as a fraction of stage width, that drags one card across. */
const DRAG_SPAN = 0.5;
/**
 * Exponential approach rate toward the target position, per second. Lower is
 * slower and softer; the reference glides rather than snaps.
 */
const EASE = 3.2;
/**
 * Seconds a card takes to open once its texture has decoded.
 *
 * Longer than the flat fade this replaced. A shutter is a move and wants to be
 * watched; at the old 0.35 it read as a glitch rather than as an opening.
 */
const FADE_IN = 0.9;
/**
 * Height the card is held at before it opens, as a fraction of full.
 *
 * Not zero: a plane with no area cannot be raycast, so a pointer crossing a
 * card mid-reveal would pass straight through to whatever is behind it.
 */
const REVEAL_MIN = 0.004;

/* Decelerating hard — almost all the travel happens immediately and the last
   sliver takes its time, which is what makes a shutter feel released rather
   than driven. */
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Contact shadow. A soft dark blob parented to each card and pushed behind it,
 * so the card reads as floating off the backdrop rather than printed on it.
 * CSS cannot reach these — they are meshes, not elements.
 *
 * Spread is how far past the card the blob extends; drop pushes it down so the
 * cast falls below rather than haloing evenly. Both are the dials to turn if
 * the effect wants to be stronger or softer.
 */
const SHADOW_SPREAD = 1.42;
const SHADOW_DROP = CARD_H * 0.16;
const SHADOW_OPACITY = 0.55;

/* -- Handing the stage over to the grid ------------------------------------ */

/**
 * Seconds the camera takes to pull back off the arc before the grid takes over.
 *
 * Deliberately long. The point of the move is to show the reader that the five
 * cards they were flicking through are three of thirty-one on a ring — a quick
 * cut states it, a slow withdrawal lets them see it.
 */
const RECEDE_S = 2.2;
/** How much further back the camera ends up, as a multiple of its resting z. */
const RECEDE_DOLLY = 3.4;
/**
 * Cards drawn either side of centre once the camera is all the way back.
 *
 * `WINDOW` is 2 because beyond that they leave the frustum at resting distance.
 * Pulling back opens the frustum, and drawing only five cards in it would leave
 * the ring looking broken rather than large — this is what makes the circle
 * read as a circle.
 */
const RECEDE_WINDOW = 7;
/** Fraction of the recede spent fading the stage out at the end. */
const RECEDE_FADE = 0.28;

const DEG = Math.PI / 180;

type Props = {
  works: Work[];
  onActive: (index: number) => void;
  /** Tapping the card that is already centred opens it. */
  onOpen?: (index: number) => void;
  /**
   * Card to open centred. The grid overview unmounts this stage, so returning
   * from it remounts with the picked card here — without it the carousel would
   * always rebuild at index 0 and throw away the user's choice.
   */
  initialIndex?: number;
  /**
   * Flip to true to play the hand-off to the grid: the camera withdraws until
   * the whole ring is in frame, then the stage fades and `onReceded` fires.
   */
  receding?: boolean;
  /** The withdrawal has finished and the grid may take the page. */
  onReceded?: () => void;
};

export default function Stage3D({
  works,
  onActive,
  onOpen,
  initialIndex = 0,
  receding = false,
  onReceded,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  /** Continuous carousel position, in card units. Wraps freely past either end. */
  const posRef = useRef(0);
  const targetRef = useRef(0);
  const onActiveRef = useRef(onActive);
  const onOpenRef = useRef(onOpen);
  /* Both read from inside the render loop. Kept in refs so that starting the
     withdrawal does NOT re-run the effect below — that would tear down the
     whole scene and rebuild it, which is the opposite of a continuous move. */
  const recedingRef = useRef(receding);
  const onRecededRef = useRef(onReceded);
  /** Read once per scene build; a change must not tear the scene down. */
  const initialIndexRef = useRef(initialIndex);

  useEffect(() => {
    onActiveRef.current = onActive;
  }, [onActive]);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    recedingRef.current = receding;
  }, [receding]);

  useEffect(() => {
    onRecededRef.current = onReceded;
  }, [onReceded]);

  useEffect(() => {
    initialIndexRef.current = initialIndex;
  }, [initialIndex]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const count = works.length;
    if (count === 0) return;

    /* Clamped, not wrapped: a stale index from a longer list should land on the
       last card rather than somewhere arbitrary in the middle. */
    const start = Math.min(Math.max(initialIndexRef.current, 0), count - 1);
    posRef.current = start;
    targetRef.current = start;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    /* ---------------------------------------------------------- scene -- */

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    /* Bent plane, shared by every card. Displacing z by a parabola across the
       width makes the centre bulge toward the viewer, matching the curve the
       reference gets out of its shader. */
    const geometry = new THREE.PlaneGeometry(CARD_W, CARD_H, 48, 2);
    {
      const pos = geometry.attributes.position;
      const half = CARD_W / 2;
      for (let i = 0; i < pos.count; i += 1) {
        const t = pos.getX(i) / half;
        pos.setZ(i, BEND * (1 - t * t));
      }
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    /* ---------------------------------------------------- shadow blob -- */

    /* One 128² radial ramp, shared by every card. Drawn once into a canvas
       rather than shipped as a file: it is four lines of gradient and would
       otherwise be a request that blocks the first frame. */
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    {
      const ctx = shadowCanvas.getContext("2d")!;
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "rgba(0,0,0,0.85)");
      gradient.addColorStop(0.45, "rgba(0,0,0,0.42)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    shadowTexture.colorSpace = THREE.SRGBColorSpace;

    // Plane is flat, unlike the card's bent one — a shadow has no relief.
    const shadowGeometry = new THREE.PlaneGeometry(
      CARD_W * SHADOW_SPREAD,
      CARD_H * SHADOW_SPREAD,
    );
    const shadowMaterials: THREE.MeshBasicMaterial[] = [];

    /* ------------------------------------------------------- textures -- */

    const loader = new THREE.TextureLoader();
    const textures: (THREE.Texture | null)[] = [];
    const materials: THREE.MeshBasicMaterial[] = [];
    const meshes: THREE.Mesh[] = [];
    /** 0 until a card's texture decodes, then eased to 1 so it fades up. */
    const fade: number[] = [];

    for (let i = 0; i < count; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        // three sorts transparent meshes back to front for us; leaving depth
        // writes on would let a neighbour punch a hole in the card behind it.
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      // A mesh whose texture has not arrived would otherwise render as a flat
      // panel of the raw material colour. Keep it off the screen entirely
      // until there is a frame to show.
      material.visible = false;
      materials.push(material);
      textures.push(null);
      fade.push(0);

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      meshes.push(mesh);

      /* Parented to the card, so it inherits the arc position and the rotation
         for free. Its own material per card so its opacity can track the
         card's as that fades out at the edge of the window. */
      const shadowMaterial = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      shadowMaterials.push(shadowMaterial);

      const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
      // Behind the card's deepest point (the bent centre sits at BEND) and
      // nudged down, so the cast reads as falling rather than glowing.
      shadow.position.set(0, -SHADOW_DROP, BEND - 0.35);
      shadow.renderOrder = -1;
      mesh.add(shadow);
    }

    /* Request order: centred card first, then outwards alternately, wrapping
       past the ends — so the three cards actually on screen at rest decode
       before anything off-screen. Centred on `start`, not on 0, or arriving
       from the grid would download the whole list before the card being
       looked at. */
    const loadOrder: number[] = [];
    const queued = new Set<number>();
    for (let d = 0; d <= Math.floor(count / 2); d += 1) {
      for (const i of [(start + d) % count, (start - d + count) % count]) {
        if (!queued.has(i)) {
          queued.add(i);
          loadOrder.push(i);
        }
      }
    }

    for (const i of loadOrder) {
      // The poster is a frame out of this card's own clip, so the still and
      // the footage that replaces it are the same shot. Routing it through the
      // image optimiser keeps the decode cheap and the request same-origin —
      // a WebGL texture cannot come from a CORS-less host.
      /* `w` and `q` are both allowlists, not free numbers: `w` must appear in
         `deviceSizes`/`imageSizes` and `q` in `images.qualities` (just [75] by
         default). Anything else is a 400 from the optimiser, and a 400 here
         means the texture never decodes and the card stays blank. This asked
         for q=70, so every card in the reel failed to load. 1200 rather than
         1920 — the centred card spans about 60% of the viewport, and the
         posters are 1280 wide at most, so anything larger would only upscale.
         `q=90` needs the matching entry in `images.qualities`. */
      const url = `/_next/image?url=${encodeURIComponent(works[i].poster)}&w=1200&q=90`;
      const texture = loader.load(url, () => {
        fade[i] = Number.EPSILON; // decoded; the render loop eases it up
        materials[i].visible = true;
      });
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      textures[i] = texture;
      materials[i].map = texture;
      materials[i].needsUpdate = true;
    }

    /* One shared video element: only a single card ever plays at a time.
       It has to live in the document — a detached <video> is not guaranteed to
       decode frames, which silently leaves the texture blank. */
    let video: HTMLVideoElement | null = null;
    let videoTexture: THREE.VideoTexture | null = null;
    /** Clip currently loaded into the element, to avoid redundant reloads. */
    let videoSrc = "";

    if (works.some((w) => w.video)) {
      video = document.createElement("video");
      /* Follows the header's switch. Muted unless the reader has asked for
         sound: browsers refuse `play()` on an unmuted element they have not
         been given a gesture for, and the reel would never start. */
      video.muted = !soundEnabled();
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.style.cssText =
        "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;";
      host.appendChild(video);

      videoTexture = new THREE.VideoTexture(video);
      videoTexture.colorSpace = THREE.SRGBColorSpace;
    }

    const stopSound = onSoundChange((on) => {
      if (video) video.muted = !on;
    });

    /** Index currently showing video, or -1. */
    let playing = -1;

    const showStill = (i: number) => {
      if (i < 0 || !materials[i]) return;
      materials[i].map = textures[i];
      materials[i].needsUpdate = true;
    };

    const setPlaying = (next: number) => {
      // With no clip configured there is nothing to swap; leave every card on
      // its still rather than churning `needsUpdate` each time focus moves.
      if (!video || next === playing) return;
      showStill(playing);
      playing = next;

      const src = next >= 0 ? works[next].video : undefined;
      if (!src) {
        video.pause();
        return;
      }
      if (src !== videoSrc) {
        // Swapping the source drops readyState back to 0, so the still holds
        // until the new clip has a frame — see `syncVideoTexture`.
        videoSrc = src;
        video.src = src;
        video.load();
      }
      void video.play().catch(() => {
        /* Autoplay refused — the still simply stays up. */
      });
    };

    /* The swap to the video texture happens only once the element actually has
       a decoded frame. Swapping on `play()` alone paints the card blank for as
       long as the file takes to buffer. */
    const syncVideoTexture = () => {
      if (!video || !videoTexture || playing < 0) return;
      const material = materials[playing];
      if (!material) return;
      const ready = video.readyState >= 2 && !video.error;
      if (ready && material.map !== videoTexture) {
        material.map = videoTexture;
        material.needsUpdate = true;
      } else if (!ready && material.map === videoTexture) {
        showStill(playing);
      }
    };

    /* ---------------------------------------------------------- sizing -- */

    /** Signed distance from `pos` to card `i`, wrapped into [-count/2, count/2). */
    const wrap = (i: number, pos: number) => {
      const half = count / 2;
      return ((((i - pos) % count) + count + half) % count) - half;
    };

    /**
     * Tallest a card projects *within the frame*, as a fraction of the canvas
     * half-height.
     *
     * Measuring a neighbour's outer corner instead would be far too strict:
     * that corner is the nearest point in the scene, but it sits well off the
     * side of the screen and is never seen. Only sampled points that actually
     * land inside the frustum count.
     */
    const visibleMaxHalfHeight = (camZ: number, halfFov: number) => {
      let max = CARD_H / 2 / camZ / halfFov; // the centred card
      for (let off = -WINDOW; off <= WINDOW; off += 1) {
        if (off === 0) continue;
        const angle = off * STEP * DEG;
        const cx = RADIUS * Math.sin(angle);
        const cz = RADIUS * (1 - Math.cos(angle)) * DEPTH;
        const c = Math.cos(-angle);
        const s = Math.sin(-angle);
        for (let t = -1; t <= 1; t += 0.01) {
          const localX = (t * CARD_W) / 2;
          const depth = camZ - (cz - localX * s);
          if (depth <= 0.2) continue;
          const ndcX = (cx + localX * c) / depth / halfFov / camera.aspect;
          if (Math.abs(ndcX) > 1) continue;
          const half = CARD_H / 2 / depth / halfFov;
          if (half > max) max = half;
        }
      }
      return max;
    };

    /* ----------------------------------------------- withdrawal state -- */

    /** 0 = on the arc as normal, 1 = all the way back with the ring in frame. */
    let recede = 0;
    /** The camera's resting distance, before any withdrawal. */
    let restZ = 0;
    /** `onReceded` fires exactly once. */
    let handedOver = false;

    /* Eased rather than linear, and eased at BOTH ends: a linear dolly reads
       as a machine move. This leans out of rest slowly, carries speed through
       the middle, and arrives without a stop. */
    const easeInOut = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    /** Set on every resize; read by the fit below and by the per-frame layout. */
    let tune = tuningFor(
      typeof window === "undefined" ? 1280 : window.innerWidth,
    );

    const dollyAt = (t: number) => 1 + (RECEDE_DOLLY - 1) * easeInOut(t);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (w === 0 || h === 0) return;

      /* Re-read before the fit is computed, so a rotation or a window drag
         across a breakpoint re-lays the arc rather than keeping the shape the
         page happened to load at. */
      tune = tuningFor(w);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = tune.fov;

      const halfFov = Math.tan((camera.fov * DEG) / 2);

      // Start from the distance that makes the centred card span FIT of the
      // width — the look we actually want — then back off only as far as a
      // short stage forces, rather than pre-emptively shrinking everything.
      let camZ = CARD_W / tune.fit / camera.aspect / (2 * halfFov);
      for (let i = 0; i < 6; i += 1) {
        const max = visibleMaxHalfHeight(camZ, halfFov);
        if (max <= FIT_H) break;
        camZ *= max / FIT_H;
      }

      // Kept so the withdrawal can scale it. Writing straight to the camera
      // would make a resize mid-move snap it back to the resting distance.
      restZ = camZ;
      camera.position.z = camZ * dollyAt(recede);
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    /* ------------------------------------------------------ layout ----- */

    const layout = (delta: number) => {
      const pos = posRef.current;

      /* The window opens as the camera backs off. At rest ±2 is all the
         frustum holds; from the far position the same frustum covers most of
         the ring, and still drawing five cards would show a broken arc rather
         than the circle the move exists to reveal. */
      const eased = easeInOut(recede);
      const win = WINDOW + (RECEDE_WINDOW - WINDOW) * eased;

      /* Fades the whole stage over the tail of the move, so the grid is not
         handed a page with a ring still burnt into it. */
      const stageFade =
        recede <= 1 - RECEDE_FADE ? 1 : Math.max(0, (1 - recede) / RECEDE_FADE);

      for (let i = 0; i < count; i += 1) {
        const offset = wrap(i, pos);
        const mesh = meshes[i];
        if (Math.abs(offset) > win) {
          mesh.visible = false;
          continue;
        }
        mesh.visible = true;

        const angle = offset * STEP * DEG;
        mesh.position.set(
          RADIUS * Math.sin(angle),
          0,
          // Positive: the arc curves toward the viewer rather than away. On
          // screen a card's height is set by its depth alone, so pushing
          // neighbours back would shrink them however far the rotation below
          // swings their outer edge forward.
          RADIUS * (1 - Math.cos(angle)) * DEPTH,
        );
        // Negated on purpose: this swings each card's OUTER edge toward the
        // camera. The conventional `+angle` tilts it away, which is the
        // mirror image of the reference.
        mesh.rotation.y = -angle;

        // Immediate neighbours stay fully opaque — as in the reference they
        // read as darker, not more transparent — and only fade out over the
        // last step before leaving the window.
        const distance = Math.abs(offset);
        const material = materials[i];

        // Ease in whatever has decoded, so a card arriving late slides up out
        // of the background instead of flicking on as a flat grey panel.
        if (fade[i] > 0 && fade[i] < 1) {
          fade[i] = Math.min(1, fade[i] + delta / FADE_IN);
        }

        /**
         * The card opens like a shutter rather than simply appearing.
         *
         * Lifted from the live site's own film reveal, which parks its clip at
         * `inset(50% 0%)` and runs it to `inset(0%)` — a letterbox splitting
         * apart from the centre line, top and bottom at once. There is no
         * clip-path on a mesh, but scaling y about its own centre IS that
         * shape, and it comes for free on the GPU.
         *
         * Held at a sliver rather than nothing so the card never has zero
         * height: a fully collapsed plane has no area to raycast against, and
         * a pointer crossing it mid-reveal would fall through to the card
         * behind.
         */
        const open = REVEAL_MIN + (1 - REVEAL_MIN) * easeOutExpo(fade[i]);
        mesh.scale.y = open;

        /* The shutter does the work of the entrance, so the opacity term here
           is only a short lead-in — a card that also fades in looks washed out
           while it opens rather than lit. `stageFade` is separate: that one
           takes the whole stage down at the end of the withdrawal. */
        material.opacity =
          Math.min(1, Math.max(0, (win - distance) / (win - 1))) *
          Math.min(1, fade[i] * 3) *
          stageFade;

        /* The darkening of neighbours is dialled out as the stage withdraws.
           It exists to say "this one is centred"; once the whole ring is the
           subject there is no centred card, and keeping it would leave the
           circle lit on one side only. */
        material.color.setScalar(
          1 - Math.min(distance, 1) * tune.shade * (1 - eased),
        );

        /* The shadow rides the card's own opacity, so it can never outlive the
           card it belongs to, and eases off with distance — a neighbour is
           already darkened and does not want a second dark shape behind it. */
        shadowMaterials[i].opacity =
          material.opacity * SHADOW_OPACITY * (1 - Math.min(distance, 1) * 0.6);
      }
    };

    /* ------------------------------------------------------- pointers -- */

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hovered = -1;

    const canvas = renderer.domElement;
    /* A FINGER TURNS THE RING ALONG EITHER AXIS. With `pan-y` the browser took
       every vertical touch for the page — and there is no page under the reel
       to pan to: the index only exists once the ring has receded, which the
       ring itself triggers after enough cards have been seen. So a reader on
       a phone had to find the sideways swipe, and a scroll did nothing. With
       the touch kept, an up-swipe is the next card, a down-swipe the one
       before, the same travel per card as a sideways drag. A mouse keeps its
       horizontal drag; the wheel already turns the ring on either axis. */
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    canvas.style.touchAction = coarse ? "none" : "pan-y";

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startTarget = 0;
    let moved = 0;

    /* Which card is under this point — the hover's raycast, callable on its own. */
    const pick = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(
        meshes.filter((m) => m.visible),
        false,
      )[0];
      hovered = hit ? meshes.indexOf(hit.object as THREE.Mesh) : -1;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      /* Picked HERE as well as on hover. A finger has no hover: the tap's first
         event is this one, so `hovered` was still -1 at its release and a tap on
         the picture did nothing — only the caption's button opened a film. */
      pick(e);
      dragging = true;
      moved = 0;
      startX = e.clientX;
      startY = e.clientY;
      startTarget = targetRef.current;
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (dragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        /* A touch follows whichever way it is mostly going; a mouse only sideways. */
        const touch = e.pointerType === "touch" || e.pointerType === "pen";
        const travel = touch && Math.abs(dy) > Math.abs(dx) ? dy : dx;
        moved = Math.max(Math.abs(dx), touch ? Math.abs(dy) : 0);

        targetRef.current = startTarget - travel / (rect.width * DRAG_SPAN);
        return;
      }

      pick(e);

      // Only the centred card opens, so only it gets the pointer; the others
      // would be promising a link they do not follow.
      const opens =
        hovered >= 0 &&
        Math.abs(wrap(hovered, targetRef.current)) < 0.5 &&
        onOpenRef.current;
      canvas.style.cursor = opens ? "pointer" : "";
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      /* A cancelled touch (the browser took the gesture) is never a tap. */
      if (e.type !== "pointercancel" && moved < 6 && hovered >= 0) {
        const offset = wrap(hovered, targetRef.current);
        // A tap, not a drag. On the card already at centre that means "open
        // it"; on any other it means "bring it here", by the short way round.
        // The 0.5 threshold is deliberately loose: the tap should still open
        // the card if the glide has not quite finished settling.
        if (Math.abs(offset) < 0.5 && onOpenRef.current) {
          onOpenRef.current(hovered);
        } else {
          targetRef.current -= offset;
        }
      } else {
        targetRef.current = Math.round(targetRef.current);
      }
    };

    const onPointerLeave = () => {
      hovered = -1;
    };

    /* Wheel travel moves the carousel continuously rather than firing one
       discrete step per event — a notch-at-a-time feels clicky. Once the wheel
       goes quiet the target rounds to the nearest card, and the easing below
       carries it the rest of the way, so a nudge glides into centre. */
    let settleTimer = 0;
    const onWheel = (e: WheelEvent) => {
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      e.preventDefault();

      targetRef.current += delta * WHEEL_PER_PX;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        targetRef.current = Math.round(targetRef.current);
      }, SETTLE_MS);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    /* A FINGER ANYWHERE ON THE PAGE turns the ring, not only one on the
       picture. The reel is the whole page and it does not scroll, so a swipe
       over the caption or the empty dark above the cards did nothing at all —
       and the reader, finding the page dead, had to discover that only the
       strip of film answered. Same travel per card as on the canvas; the canvas
       keeps its own handling (it also knows taps), so touches that start on it
       are left to it. A swipe that ends on a link is still a swipe: the browser
       does not fire a click after a moving touch. */
    let swipeY = 0;
    let swipeX = 0;
    let swipeFrom = 0;
    let swiping = false;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || e.touches.length > 1 || canvas.contains(e.target as Node)) {
        swiping = false;
        return;
      }
      swiping = true;
      swipeY = t.clientY;
      swipeX = t.clientX;
      swipeFrom = targetRef.current;
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!swiping || !t) return;
      const dx = t.clientX - swipeX;
      const dy = t.clientY - swipeY;
      const travel = Math.abs(dy) > Math.abs(dx) ? dy : dx;
      const width = canvas.getBoundingClientRect().width || window.innerWidth;
      targetRef.current = swipeFrom - travel / (width * DRAG_SPAN);
    };
    const onTouchEnd = () => {
      if (!swiping) return;
      swiping = false;
      targetRef.current = Math.round(targetRef.current);
    };
    if (coarse) {
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd);
      window.addEventListener("touchcancel", onTouchEnd);
    }

    /* ----------------------------------------------------------- loop -- */

    const timer = new THREE.Timer();
    let frame = 0;
    let onScreen = true;
    let lastActive = -1;

    const gate = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    gate.observe(host);

    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      if (!onScreen) return;

      timer.update(time);
      const delta = Math.min(timer.getDelta(), 0.05);

      /* The withdrawal. Reduced motion gets the end state on the next frame:
         the whole point of the move is the travel, and someone who has asked
         not to be moved should simply arrive at the grid. */
      if (recedingRef.current && recede < 1) {
        recede = reduced ? 1 : Math.min(1, recede + delta / RECEDE_S);
        camera.position.z = restZ * dollyAt(recede);

        if (recede >= 1 && !handedOver) {
          handedOver = true;
          onRecededRef.current?.();
        }
      }

      if (reduced) {
        posRef.current = targetRef.current;
      } else {
        // Frame-rate independent smoothing toward the target.
        posRef.current +=
          (targetRef.current - posRef.current) * (1 - Math.exp(-EASE * delta));
      }

      layout(delta);

      const active = ((Math.round(posRef.current) % count) + count) % count;
      /* Silenced once the stage is on its way out. The page counts distinct
         films seen to decide when to open the grid, and reporting a new one
         mid-withdrawal would be counting a card the reader never chose. */
      if (active !== lastActive && !recedingRef.current) {
        lastActive = active;
        onActiveRef.current(active);
      }

      // Hovering a card plays it; otherwise the centred card plays.
      const settled = Math.abs(targetRef.current - posRef.current) < 0.02;
      setPlaying(hovered >= 0 ? hovered : settled ? active : -1);
      syncVideoTexture();

      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(tick);

    /* -------------------------------------------------------- cleanup -- */

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      stopSound();
      gate.disconnect();
      observer.disconnect();

      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);

      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.remove();
      }
      videoTexture?.dispose();

      for (const t of textures) t?.dispose();
      for (const m of materials) m.dispose();
      for (const m of shadowMaterials) m.dispose();
      shadowTexture.dispose();
      shadowGeometry.dispose();
      geometry.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [works]);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full"
    />
  );
}

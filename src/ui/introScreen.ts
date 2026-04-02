import {
  Scene,
  Mesh,
  MeshBuilder,
  Vector3,
  VideoTexture,
  StandardMaterial,
  Color3,
} from "@babylonjs/core";

/**
 * Full-screen branded intro: plays the Enspec intro video,
 * then fades out. Uses an HTML <video> overlay on desktop
 * and a VideoTexture on a 3D plane in VR.
 *
 * Robust: if the video fails to load/play for ANY reason,
 * the intro auto-resolves so the app continues.
 */

let introMesh: Mesh | null = null;
let introMaterial: StandardMaterial | null = null;
let videoEl: HTMLVideoElement | null = null;
let overlayEl: HTMLDivElement | null = null;
let resolvePromise: (() => void) | null = null;
let disposed = false;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

const VIDEO_SRC = "enspec-intro.mp4";
/** Fade-out duration in seconds */
const FADE_OUT = 0.5;

/**
 * Show the intro video and resolve when done.
 */
export function showIntroScreen(
  scene: Scene,
  isVR = false
): Promise<void> {
  disposed = false;

  return new Promise((resolve) => {
    resolvePromise = resolve;

    // Safety net: if ANYTHING goes wrong, resolve after 15s max
    safetyTimer = setTimeout(() => {
      console.warn("Intro: safety timeout — forcing dispose");
      disposeIntro();
    }, 15000);

    try {
      if (isVR) {
        showVRIntro(scene);
      } else {
        showDesktopIntro();
      }
    } catch (err) {
      console.error("Intro: failed to create —", err);
      disposeIntro();
    }
  });
}

/**
 * Immediately skip and dispose the intro.
 */
export function skipIntro(): void {
  disposeIntro();
}

// ── Desktop: HTML <video> overlay ────────────────────────────

function showDesktopIntro(): void {
  overlayEl = document.createElement("div");
  overlayEl.id = "introVideoOverlay";
  overlayEl.style.cssText =
    "position:fixed;inset:0;z-index:150;background:#000;" +
    "display:flex;align-items:center;justify-content:center;" +
    "transition:opacity 0.5s;";

  videoEl = document.createElement("video");
  videoEl.src = VIDEO_SRC;
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.setAttribute("playsinline", "");
  videoEl.setAttribute("webkit-playsinline", "");
  videoEl.style.cssText =
    "width:100%;height:100%;object-fit:contain;background:#000;";

  overlayEl.appendChild(videoEl);
  document.body.appendChild(overlayEl);

  // Video ended → fade out
  videoEl.addEventListener("ended", () => {
    console.log("Intro: video ended normally");
    fadeOutAndDispose();
  });

  // Video error → skip immediately
  videoEl.addEventListener("error", (e) => {
    console.warn("Intro: video error —", e);
    disposeIntro();
  });

  // Stall detection: if video hasn't started playing in 3 seconds, skip
  const stallCheck = setTimeout(() => {
    if (videoEl && videoEl.readyState < 2) {
      console.warn("Intro: video stalled (not enough data) — skipping");
      disposeIntro();
    }
  }, 3000);

  // Try autoplay with sound first
  videoEl.play()
    .then(() => {
      clearTimeout(stallCheck);
      console.log("Intro: video playing");
    })
    .catch(() => {
      // Autoplay with sound blocked — retry muted
      console.log("Intro: autoplay blocked, retrying muted");
      videoEl!.muted = true;
      videoEl!.play()
        .then(() => {
          clearTimeout(stallCheck);
          console.log("Intro: video playing (muted)");
        })
        .catch((err) => {
          clearTimeout(stallCheck);
          console.warn("Intro: play failed entirely —", err);
          disposeIntro();
        });
    });
}

// ── VR: Video texture on a 3D plane ─────────────────────────

function showVRIntro(scene: Scene): void {
  introMesh = MeshBuilder.CreatePlane(
    "introVideoPlane",
    { width: 3.2, height: 1.8 },
    scene
  );
  introMesh.position = new Vector3(0, 1.6, -2);
  introMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  introMesh.isPickable = false;

  const videoTex = new VideoTexture(
    "introVidTex",
    VIDEO_SRC,
    scene,
    false,
    true,
    VideoTexture.TRILINEAR_SAMPLINGMODE,
    { autoPlay: true, muted: false, loop: false }
  );

  introMaterial = new StandardMaterial("introVidMat", scene);
  introMaterial.diffuseTexture = videoTex;
  introMaterial.emissiveColor = new Color3(1, 1, 1);
  introMaterial.disableLighting = true;
  introMaterial.backFaceCulling = false;
  introMesh.material = introMaterial;

  videoEl = videoTex.video;

  videoEl.addEventListener("ended", () => {
    console.log("Intro VR: video ended");
    fadeOutAndDispose();
  });

  videoEl.addEventListener("error", () => {
    console.warn("Intro VR: video error — skipping");
    disposeIntro();
  });
}

// ── Fade out then dispose ────────────────────────────────────

function fadeOutAndDispose(): void {
  if (disposed) return;

  // Fade the overlay
  if (overlayEl) {
    overlayEl.style.opacity = "0";
  }

  // Fade VR mesh
  if (introMesh) {
    const scene = introMesh.getScene();
    const start = performance.now();
    const dur = FADE_OUT * 1000;
    const obs = scene.onBeforeRenderObservable.add(() => {
      const t = Math.min((performance.now() - start) / dur, 1);
      if (introMesh) introMesh.visibility = 1 - t;
      if (t >= 1) {
        scene.onBeforeRenderObservable.remove(obs);
        disposeIntro();
      }
    });
    return;
  }

  // Desktop: wait for CSS opacity transition, then dispose
  setTimeout(() => disposeIntro(), FADE_OUT * 1000 + 100);
}

// ── Cleanup ──────────────────────────────────────────────────

function disposeIntro(): void {
  if (disposed) return;
  disposed = true;

  // Clear safety timer
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }

  // Clean up video element
  if (videoEl) {
    try {
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();
    } catch (_) {
      // ignore cleanup errors
    }
  }

  // Remove HTML overlay
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }

  // Dispose VR resources
  if (introMaterial) {
    if (introMaterial.diffuseTexture) {
      introMaterial.diffuseTexture.dispose();
    }
    introMaterial.dispose();
    introMaterial = null;
  }
  if (introMesh) {
    introMesh.dispose();
    introMesh = null;
  }

  videoEl = null;

  // Resolve the promise so onboarding continues
  if (resolvePromise) {
    const r = resolvePromise;
    resolvePromise = null;
    r();
  }

  console.log("Intro: disposed, continuing to next phase");
}

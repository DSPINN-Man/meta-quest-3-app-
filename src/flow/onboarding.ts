import {
  Scene,
  ArcRotateCamera,
  Animation,
  EasingFunction,
  CubicEase,
  Observer,
  Observable,
} from "@babylonjs/core";
import { TIMING } from "../utils/config";
import { showIntroScreen } from "../ui/introScreen";
import { showTutorial } from "../ui/tutorial";
import { resetDoors } from "../interactions/doorAnimations";
import { resetExplodedView } from "../interactions/explodedView";
import { hideHotspots } from "../interactions/hotspots";
import { closeInfoPanel } from "../ui/infoPanel";
import { showMenu, hideMenu } from "../ui/floatingMenu";
import { disableInteriorLight } from "../scene/lighting";
import { startKioskWatch, rearmKiosk, pauseKiosk } from "./kioskMode";
import { isInVR, onXRInput, resetGuidedView, recenterUser } from "../interactions/xrSetup";

/**
 * Onboarding flow orchestrator.
 *
 * VR sequence:
 *   1. Intro screen (3.5s)
 *   2. Controller tutorial (8s hard timeout or any XR button press)
 *   3. SKIP orbit (disorienting in VR)
 *   4. Free explore — menu visible, hotspots active
 *   5. Kiosk idle reset → loops back to step 1
 *
 * Desktop sequence:
 *   1. Intro screen (3.5s)
 *   2. Controller tutorial (6s or skip)
 *   3. Cinematic 360° orbit (~10s, skippable)
 *   4. Free explore
 *   5. Kiosk idle reset
 */

let camera: ArcRotateCamera | null = null;
let scene: Scene | null = null;

let defaultAlpha = 0;
let defaultBeta = 0;
let defaultRadius = 0;

let orbitSkipped = false;
let onboardingActive = false;
let onboardingPromise: Promise<void> | null = null;

/** Global skip handler — detaches between phases */
let globalSkipHandler: ((e: Event) => void) | null = null;
let xrSkipObserver: Observer<void> | null = null;

export const onOnboardingCompleted = new Observable<boolean>();

export function initOnboarding(
  sceneRef: Scene,
  cameraRef: ArcRotateCamera
): void {
  scene = sceneRef;
  camera = cameraRef;

  defaultAlpha = camera.alpha;
  defaultBeta = camera.beta;
  defaultRadius = camera.radius;
}

/**
 * Run the full onboarding sequence.
 */
export async function runOnboarding(): Promise<void> {
  if (onboardingPromise) {
    return onboardingPromise;
  }

  onboardingPromise = runOnboardingInternal();
  try {
    await onboardingPromise;
  } finally {
    onboardingPromise = null;
  }
}

export function isOnboardingActive(): boolean {
  return onboardingActive;
}

async function runOnboardingInternal(): Promise<void> {
  if (!scene || !camera) {
    console.warn("Onboarding not initialized.");
    return;
  }

  onboardingActive = true;
  pauseKiosk();

  resetDoors();
  resetExplodedView();
  hideHotspots();
  hideMenu();
  closeInfoPanel();
  disableInteriorLight();

  const vr = isInVR();
  if (vr) {
    await waitForStableFrames(scene, 20);
    resetGuidedView();
    recenterUser();
  }

  camera.useAutoRotationBehavior = false;
  camera.detachControl();

  // ── Phase 1: Intro Screen ─────────────────────────────
  console.log(`Onboarding: intro (vr=${vr})`);
  await showIntroScreen(scene, vr);

  // ── Phase 2: Controller Tutorial ──────────────────────
  if (!vr) {
    console.log(`Onboarding: tutorial (vr=${vr})`);
    const tutorial = showTutorial(scene, false);

    // Skip tutorial on any input (XR or desktop)
    const skipTutorial = () => tutorial.skip();
    attachSkipListener(skipTutorial);
    await tutorial.promise;
    detachSkipListener();
  } else {
    console.log("Onboarding: VR static tutorial skipped - guided walkthrough owns this phase.");
  }

  // ── Phase 3: Cinematic Orbit — DISABLED ────────────────
  // The cinematic 360° orbit was running every time the kiosk idle
  // reset fired, which made the model "keep moving when not used"
  // and broke the illusion of a real panel sitting on the ground.
  // cinematicOrbit() is kept around for potential future use but no
  // longer runs automatically on desktop or VR.
  console.log("Onboarding: orbit phase skipped — camera stays put.");

  // ── Phase 4: Transition to Free Explore ───────────────
  console.log("Onboarding: explore mode");
  camera.attachControl(
    scene.getEngine().getRenderingCanvas()!,
    true
  );

  // Show menu immediately — this is the user's main interaction point
  showMenu();

  onboardingActive = false;
  onOnboardingCompleted.notifyObservers(vr);

  // Auto-rotate disabled. Visitors said the idle turntable spin made
  // the model read as a synthetic 3D rendering rather than a real
  // panel sitting on the ground. Without rotation it stays put like
  // a real-world object, which is the desired "OG" feel.
  camera.useAutoRotationBehavior = false;
  if (camera.autoRotationBehavior) {
    // Defensive: zero the speed too in case something else flips the
    // flag back on.
    camera.autoRotationBehavior.idleRotationSpeed = 0;
  }

  // Start kiosk idle watcher
  startKioskWatch(() => {
    handleKioskReset();
  });
  rearmKiosk();
}

/**
 * Cinematic 360° orbit (desktop only).
 */
function cinematicOrbit(): Promise<void> {
  return new Promise((resolve) => {
    if (!camera || !scene) {
      resolve();
      return;
    }

    const fps = 60;
    const duration = TIMING.orbitDuration;
    const totalFrames = Math.round(duration * fps);

    const startAlpha = camera.alpha;
    const endAlpha = startAlpha - Math.PI * 2;

    const startBeta = camera.beta;
    const peakBeta = startBeta - 0.15;

    const alphaAnim = new Animation(
      "orbitAlpha",
      "alpha",
      fps,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

    alphaAnim.setKeys([
      { frame: 0, value: startAlpha },
      { frame: totalFrames, value: endAlpha },
    ]);

    const betaAnim = new Animation(
      "orbitBeta",
      "beta",
      fps,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    betaAnim.setKeys([
      { frame: 0, value: startBeta },
      { frame: Math.round(totalFrames * 0.3), value: peakBeta },
      { frame: Math.round(totalFrames * 0.7), value: peakBeta },
      { frame: totalFrames, value: startBeta },
    ]);
    betaAnim.setEasingFunction(ease);

    camera.animations = [alphaAnim, betaAnim];

    const animatable = scene.beginAnimation(
      camera,
      0,
      totalFrames,
      false,
      1,
      () => {
        camera!.animations = [];
        resolve();
      }
    );

    const skipCheck = setInterval(() => {
      if (orbitSkipped) {
        clearInterval(skipCheck);
        animatable.stop();
        camera!.animations = [];
        camera!.alpha = startAlpha;
        camera!.beta = startBeta;
        resolve();
      }
    }, 50);
  });
}

/**
 * Kiosk idle reset.
 */
async function handleKioskReset(): Promise<void> {
  if (!scene || !camera) return;

  console.log("Kiosk: resetting...");

  const overlay = document.createElement("div");
  overlay.id = "kioskFade";
  overlay.style.cssText =
    "position:fixed;inset:0;background:#000;opacity:0;" +
    "transition:opacity 1s;z-index:200;pointer-events:none;";
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
  });

  await sleep(1100);

  closeInfoPanel();
  hideHotspots();
  disableInteriorLight();
  resetDoors();
  resetExplodedView();
  resetGuidedView();
  recenterUser();

  camera.alpha = defaultAlpha;
  camera.beta = defaultBeta;
  camera.radius = defaultRadius;

  const onboardingDone = runOnboarding();

  await sleep(200);
  overlay.style.opacity = "0";
  await sleep(1000);
  overlay.remove();

  await onboardingDone;
}

// ── Input skip helpers ──────────────────────────────────────
// Listens to BOTH desktop events AND XR controller input.

function attachSkipListener(handler: () => void): void {
  // Desktop: keyboard + mouse
  globalSkipHandler = (e: Event) => {
    if (e.type === "mousemove" || e.type === "pointermove") return;
    handler();
  };
  window.addEventListener("keydown", globalSkipHandler, { once: true });
  window.addEventListener("pointerdown", globalSkipHandler, { once: true });

  // XR: controller button press
  xrSkipObserver = onXRInput.add(() => {
    handler();
  });
}

function detachSkipListener(): void {
  if (globalSkipHandler) {
    window.removeEventListener("keydown", globalSkipHandler);
    window.removeEventListener("pointerdown", globalSkipHandler);
    globalSkipHandler = null;
  }
  if (xrSkipObserver) {
    onXRInput.remove(xrSkipObserver);
    xrSkipObserver = null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForStableFrames(scene: Scene, frames: number): Promise<void> {
  return new Promise((resolve) => {
    let remaining = frames;
    const observer = scene.onBeforeRenderObservable.add(() => {
      remaining -= 1;
      if (remaining <= 0) {
        scene.onBeforeRenderObservable.remove(observer);
        resolve();
      }
    });
  });
}

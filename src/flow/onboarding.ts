import {
  Scene,
  ArcRotateCamera,
  Animation,
  EasingFunction,
  CubicEase,
} from "@babylonjs/core";
import { TIMING, AUTO_ROTATE } from "../utils/config";
import { showIntroScreen } from "../ui/introScreen";
import { showTutorial } from "../ui/tutorial";
import { resetDoors } from "../interactions/doorAnimations";
import { resetExplodedView } from "../interactions/explodedView";
import { hideHotspots } from "../interactions/hotspots";
import { closeInfoPanel } from "../ui/infoPanel";
import { showMenu, hideMenu } from "../ui/floatingMenu";
import { disableInteriorLight } from "../scene/lighting";
import { startKioskWatch, rearmKiosk, pauseKiosk } from "./kioskMode";
import { isInVR } from "../interactions/xrSetup";

/**
 * Onboarding flow orchestrator.
 *
 * Sequence:
 *   1. Intro screen (branded splash — 3.5s)
 *   2. Controller tutorial (6s or skip)
 *   3. Cinematic 360° orbit (~10s, skippable)
 *   4. Free explore (user has full control, hotspots visible)
 *   5. Kiosk idle reset → loops back to step 1
 *
 * All transitions are smooth fades — no jarring cuts.
 */

let camera: ArcRotateCamera | null = null;
let scene: Scene | null = null;

/** Stored camera defaults for reset */
let defaultAlpha = 0;
let defaultBeta = 0;
let defaultRadius = 0;

/** Whether the orbit phase has been skipped by user input */
let orbitSkipped = false;

/** Global skip handler — detaches between phases */
let globalSkipHandler: ((e: Event) => void) | null = null;

/**
 * Initialize the onboarding system. Call once after scene/camera are ready.
 */
export function initOnboarding(
  sceneRef: Scene,
  cameraRef: ArcRotateCamera
): void {
  scene = sceneRef;
  camera = cameraRef;

  // Save default camera pose for reset
  defaultAlpha = camera.alpha;
  defaultBeta = camera.beta;
  defaultRadius = camera.radius;
}

/**
 * Run the full onboarding sequence. Can be called repeatedly
 * (kiosk reset calls this to restart).
 */
export async function runOnboarding(): Promise<void> {
  if (!scene || !camera) {
    console.warn("Onboarding not initialized.");
    return;
  }

  pauseKiosk();

  // Hide interactive elements during onboarding
  hideHotspots();
  hideMenu();
  closeInfoPanel();

  const vr = isInVR();

  // Stop auto-rotate from previous explore session
  camera.useAutoRotationBehavior = false;

  // Disable desktop camera controls during scripted phases
  // (in VR the XR camera is active — this only affects the ArcRotateCamera)
  camera.detachControl();

  // ── Phase 1: Intro Screen ─────────────────────────────
  // In VR: renders as a 3D billboard plane in front of the user
  // Desktop: fullscreen overlay
  console.log(`Onboarding: intro (vr=${vr})`);
  await showIntroScreen(scene, vr);

  // ── Phase 2: Controller Tutorial ──────────────────────
  console.log(`Onboarding: tutorial (vr=${vr})`);
  const tutorial = showTutorial(scene, vr);

  // Skip tutorial on any input
  const skipTutorial = () => tutorial.skip();
  attachSkipListener(skipTutorial);
  await tutorial.promise;
  detachSkipListener();

  // ── Phase 3: Cinematic Orbit ──────────────────────────
  // Skip orbit in VR — animating the camera causes motion sickness.
  // In VR the user already has spatial awareness of the model.
  if (!vr) {
    console.log("Onboarding: orbit");
    orbitSkipped = false;
    const skipOrbit = () => {
      orbitSkipped = true;
    };
    attachSkipListener(skipOrbit);
    await cinematicOrbit();
    detachSkipListener();
  } else {
    console.log("Onboarding: skipping orbit in VR (motion sickness)");
  }

  // ── Phase 4: Transition to Free Explore ───────────────
  console.log("Onboarding: explore mode");
  // Re-enable desktop camera (harmless in VR — XR camera is active)
  camera.attachControl(
    scene.getEngine().getRenderingCanvas()!,
    true
  );
  // Hotspots start hidden — they appear when user opens doors
  showMenu();

  // Enable subtle auto-rotate turntable (desktop only — no effect in VR)
  if (!vr) {
    camera.useAutoRotationBehavior = true;
    if (camera.autoRotationBehavior) {
      camera.autoRotationBehavior.idleRotationSpeed = AUTO_ROTATE.speed;
      camera.autoRotationBehavior.idleRotationWaitTime = AUTO_ROTATE.waitTime;
      camera.autoRotationBehavior.idleRotationSpinupTime = AUTO_ROTATE.spinupTime;
      camera.autoRotationBehavior.zoomStopsAnimation = true;
    }
  }

  // Start kiosk idle watcher
  startKioskWatch(() => {
    handleKioskReset();
  });
  rearmKiosk();
}

/**
 * Cinematic 360° orbit around the model.
 * Camera smoothly rotates with slight vertical oscillation.
 * Skippable — resolves immediately if user presses anything.
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
    const endAlpha = startAlpha - Math.PI * 2; // full 360° CCW

    // Slight vertical bob: start at default, rise ~15°, come back
    const startBeta = camera.beta;
    const peakBeta = startBeta - 0.15; // slightly higher (lower beta = higher)

    // ── Alpha animation (horizontal orbit) ──────────────
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
    // Linear for orbit (constant speed feels smoother for 360°)

    // ── Beta animation (vertical bob) ───────────────────
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
        // Natural completion
        camera!.animations = [];
        resolve();
      }
    );

    // Poll for skip flag (set by user input)
    const skipCheck = setInterval(() => {
      if (orbitSkipped) {
        clearInterval(skipCheck);
        animatable.stop();
        camera!.animations = [];
        // Smoothly settle to default pose
        camera!.alpha = startAlpha;
        camera!.beta = startBeta;
        resolve();
      }
    }, 50);
  });
}

/**
 * Handle kiosk idle reset:
 * 1. Fade to black
 * 2. Reset all interactive state
 * 3. Restart onboarding
 */
async function handleKioskReset(): Promise<void> {
  if (!scene || !camera) return;

  console.log("Kiosk: resetting...");

  // ── Fade to black via HTML overlay ────────────────────
  const overlay = document.createElement("div");
  overlay.id = "kioskFade";
  overlay.style.cssText =
    "position:fixed;inset:0;background:#000;opacity:0;" +
    "transition:opacity 1s;z-index:200;pointer-events:none;";
  document.body.appendChild(overlay);

  // Trigger fade
  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
  });

  // Wait for fade to complete
  await sleep(1100);

  // ── Reset all state while screen is black ─────────────
  closeInfoPanel();
  hideHotspots();
  disableInteriorLight();
  resetDoors();
  resetExplodedView();

  // Reset camera to default pose
  camera.alpha = defaultAlpha;
  camera.beta = defaultBeta;
  camera.radius = defaultRadius;

  // ── Run onboarding again (still behind black overlay) ─
  // The intro screen will appear, then we fade the overlay out
  // Start onboarding — intro has its own dark bg so fade-out is seamless
  const onboardingDone = runOnboarding();

  // Fade overlay out after a brief moment (intro is already showing)
  await sleep(200);
  overlay.style.opacity = "0";
  await sleep(1000);
  overlay.remove();

  await onboardingDone;
}

// ── Input skip helpers ──────────────────────────────────────

function attachSkipListener(handler: () => void): void {
  globalSkipHandler = (e: Event) => {
    // Ignore mouse-move to prevent accidental skips
    if (e.type === "mousemove" || e.type === "pointermove") return;
    handler();
  };
  window.addEventListener("keydown", globalSkipHandler, { once: true });
  window.addEventListener("pointerdown", globalSkipHandler, { once: true });
  window.addEventListener("gamepadconnected", globalSkipHandler, {
    once: true,
  });
}

function detachSkipListener(): void {
  if (globalSkipHandler) {
    window.removeEventListener("keydown", globalSkipHandler);
    window.removeEventListener("pointerdown", globalSkipHandler);
    window.removeEventListener("gamepadconnected", globalSkipHandler);
    globalSkipHandler = null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

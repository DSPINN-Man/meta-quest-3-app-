import { Engine, Scene, ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { createEnvironment } from "./scene/environment";
import {
  createLighting,
  repositionLights,
  enableInteriorLight,
  disableInteriorLight,
} from "./scene/lighting";
import { loadModel, ModelInfo } from "./scene/modelLoader";
import {
  setupXR,
  enterVR,
  recenterUser,
  moveUserTo,
  getUserPosition,
  configureGuidedViewpoints,
  stepGuidedView,
  resetGuidedView,
  onXRButtonAction,
  onVRStateChanged,
  onJoystickAxes,
  isInVR,
  getXR,
  type XRButtonAction,
} from "./interactions/xrSetup";
import {
  initDoors,
  openAllDoors,
  closeAllDoors,
  areDoorsOpen,
  resetDoors,
  fadeExterior,
  unfadeExterior,
  isExteriorFaded,
} from "./interactions/doorAnimations";
import {
  initExplodedView,
  toggleExplodedView,
  resetExplodedView,
  isExploded,
  collapse,
} from "./interactions/explodedView";
import {
  createHotspots,
  onHotspotActivated,
  toggleHotspots,
  showHotspots,
  hideHotspots,
  pulseHotspotsOnce,
} from "./interactions/hotspots";
import { createFloatingMenu, onMenuButton, showMenu, hideMenu } from "./ui/floatingMenu";
import {
  createPanicReset,
  onPanicReset,
  showPanicReset,
  hidePanicReset,
} from "./ui/panicReset";
import { showInfoPanel, closeInfoPanel } from "./ui/infoPanel";
import {
  initOnboarding,
  runOnboarding,
  isOnboardingActive,
  onOnboardingCompleted,
} from "./flow/onboarding";
import {
  startScriptedDemo,
  stopScriptedDemo,
  shouldAllowScriptedAction,
  handleScriptedAction,
} from "./flow/scriptedDemo";
import {
  initGuidedPrompt,
  reparentGuidedPromptToXR,
  showGuidedPrompt,
  hideGuidedPrompt,
  showHelpCard,
  isGuidedPromptVisible,
  showSuccessFeedback,
} from "./ui/guidedPrompt";
import { onLongPress } from "./interactions/xrSetup";
import { initSkybox, setSkybox, isPhotoSkybox } from "./scene/skybox";
import {
  createContactShadow,
  showContactShadow,
  hideContactShadow,
} from "./scene/contactShadow";
import { showVRChoiceScreen, showSkyboxPickerOnly } from "./ui/vrChoiceScreen";
import { runQuickTour, isQuickTourActive, skipQuickTourAct } from "./flow/quickTour";
import {
  showSpectatorOverlay,
  hideSpectatorOverlay,
  setSpectatorStatus,
} from "./ui/spectatorOverlay";
import {
  createHotspotCounter,
  setHotspotCount,
  showHotspotCounter,
  hideHotspotCounter,
} from "./ui/hotspotCounter";
import { HOTSPOTS } from "./utils/config";

async function main() {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  if (!canvas) throw new Error("Canvas element #renderCanvas not found.");

  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  });

  const scene = new Scene(engine);

  const camera = new ArcRotateCamera(
    "desktopCam",
    -Math.PI / 2,
    Math.PI / 3,
    6,
    new Vector3(0, 1, 0),
    scene
  );
  camera.lowerRadiusLimit = 0.5;
  camera.upperRadiusLimit = 30;
  camera.lowerBetaLimit = 0.1;
  camera.upperBetaLimit = Math.PI / 2;
  camera.wheelPrecision = 20;
  camera.panningSensibility = 100;
  camera.detachControl();

  const ground = createEnvironment(scene);
  const shadowGen = createLighting(scene);

  engine.runRenderLoop(() => {
    scene.render();
  });

  const loadingEl = document.getElementById("loading");
  const loadingText = document.getElementById("loadingText");
  const loadingBar = document.getElementById("loadingBarFill");
  let modelInfo: ModelInfo | null = null;
  let inspectActive = false;

  try {
    modelInfo = await loadModel(scene, shadowGen, (pct) => {
      if (loadingText) loadingText.textContent = `Loading model... ${pct.toFixed(0)}%`;
      if (loadingBar) loadingBar.style.width = `${Math.min(pct, 100)}%`;
    });
  } catch (err) {
    console.error("Model load failed:", err);
    if (loadingText) loadingText.textContent = "Model failed to load. Check console.";
  }

  if (modelInfo && modelInfo.height > 0) {
    repositionLights(modelInfo);

    const h = modelInfo.height;
    const w = Math.max(modelInfo.width, modelInfo.depth);
    camera.target = modelInfo.center.clone();
    camera.radius = Math.max(h, w) * 2.5;
    camera.lowerRadiusLimit = Math.max(h, w) * 0.3;
    camera.upperRadiusLimit = Math.max(h, w) * 8;

    const farDist = Math.max(w * 3.0, 4.0);
    const midDist = Math.max(w * 2.0, 2.8);
    const closeDist = Math.max(w * 1.2, 1.5);
    configureGuidedViewpoints(
      [
        new Vector3(modelInfo.center.x, 1.6, modelInfo.center.z - farDist),
        new Vector3(modelInfo.center.x, 1.6, modelInfo.center.z - midDist),
        new Vector3(modelInfo.center.x, 1.6, modelInfo.center.z - closeDist),
      ],
      1
    );

    console.log(
      `Camera framed: target=(${camera.target.x.toFixed(2)}, ${camera.target.y.toFixed(2)}, ${camera.target.z.toFixed(2)}), radius=${camera.radius.toFixed(2)}`
    );
  }

  const camDefaults = {
    alpha: camera.alpha,
    beta: camera.beta,
    radius: camera.radius,
    target: camera.target.clone(),
  };

  const allMeshes = scene.meshes.slice(); // snapshot before adding UI meshes
  initDoors(allMeshes);
  initExplodedView(allMeshes);

  // Init UI meshes AFTER door system so they don't get faded with exterior
  initSkybox(scene);
  initGuidedPrompt(scene);

  createHotspots(scene, modelInfo ?? undefined);
  createContactShadow(scene, modelInfo ?? undefined);

  /**
   * Apply a skybox AND toggle the contact-shadow disc to match.
   * Photo skyboxes need the disc so the cabinet doesn't visibly float;
   * Dark Studio's solid floor handles its own grounding so we hide it.
   */
  function applySkybox(id: string): void {
    setSkybox(scene, id);
    if (isPhotoSkybox(id)) {
      showContactShadow();
    } else {
      hideContactShadow();
    }
  }
  onHotspotActivated((data, worldPos) => {
    // Always teleport to the clicked hotspot — user should be able to click
    // any hotspot, any number of times, and get transported there every time.
    if (isExploded()) {
      const inspectPosition = computeInspectPosition(
        worldPos,
        getUserPosition(),
        modelInfo?.center ?? Vector3.Zero()
      );
      console.log(
        `Hotspot "${data.id}": teleporting to inspect position ` +
        `(${inspectPosition.x.toFixed(2)}, ${inspectPosition.y.toFixed(2)}, ${inspectPosition.z.toFixed(2)})`
      );
      moveUserTo(inspectPosition);
      inspectActive = true;
    }
    showInfoPanel(data, worldPos, scene);
    setSpectatorStatus("Inspecting", data.title);
    markHotspotInspected(data.id);
  });

  async function doOpenDoors() {
    if (!areDoorsOpen()) {
      await openAllDoors(scene);
    }
    showHotspots();
    showHotspotCounter();
    enableInteriorLight();
  }

  async function doCloseDoors() {
    if (areDoorsOpen() || isExteriorFaded()) {
      if (isExploded()) {
        await collapse(scene);
      }
      if (isExteriorFaded()) {
        await unfadeExterior(scene);
      }
      hideHotspots();
      hideHotspotCounter();
      closeInfoPanel();
      disableInteriorLight();
      await closeAllDoors(scene);
    }
  }

  async function doToggleInterior() {
    if (areDoorsOpen() || isExteriorFaded()) {
      await doCloseDoors();
      if (isInVR()) setSpectatorStatus("Free Exploration", "Cabinet sealed");
    } else {
      await doOpenDoors();
      if (isInVR()) setSpectatorStatus("Interior Visible", "Cabinet shell faded");
    }
  }

  async function doToggleExploded() {
    if (isExploded()) {
      await collapse(scene);
      await unfadeExterior(scene);
      hideHotspots();
      hideHotspotCounter();
      disableInteriorLight();
      await closeAllDoors(scene);
      if (isInVR()) setSpectatorStatus("Free Exploration", "Components reassembled");
      return;
    }

    if (!areDoorsOpen()) {
      await openAllDoors(scene);
    }
    await fadeExterior(scene);
    enableInteriorLight();
    showHotspots();
    showHotspotCounter();
    await toggleExplodedView(scene);
    if (isInVR()) setSpectatorStatus("Exploded View", "Subsystems separated for inspection");
  }

  function doReset() {
    inspectActive = false;
    resetExplodedView();
    resetDoors();
    resetGuidedView();
    hideHotspots();
    hideHotspotCounter();
    resetHotspotProgress();
    closeInfoPanel();
    disableInteriorLight();
    recenterUser();
    camera.alpha = camDefaults.alpha;
    camera.beta = camDefaults.beta;
    camera.radius = camDefaults.radius;
    camera.target = camDefaults.target.clone();
    if (isInVR()) setSpectatorStatus("Reset", "Back to home view");
  }

  async function runMappedAction(action: XRButtonAction) {
    switch (action) {
      case "move_closer":
        stepGuidedView(1);
        break;
      case "move_back":
        stepGuidedView(-1);
        break;
      case "toggle_interior":
        await doToggleInterior();
        break;
      case "toggle_explode":
        await doToggleExploded();
        break;
      case "reset_view":
        doReset();
        break;
    }
  }

  async function handleXRAction(action: XRButtonAction) {
    console.log(`handleXRAction: ${action}`);

    // While the Quick Tour is running, the right grip should *skip the
    // current act*, not full-reset. Reset behaviour returns once the
    // tour completes (or the user exits / panic-resets via the menu).
    if (action === "reset_view" && isQuickTourActive()) {
      console.log("Quick Tour active — grip skips to next act");
      skipQuickTourAct();
      return;
    }

    // B button while inspecting a hotspot: close the card and step back
    if (inspectActive && action === "move_back") {
      inspectActive = false;
      closeInfoPanel();
      return;
    }

    // Run the action directly — no scripted demo gating.
    await runMappedAction(action);
  }

  createFloatingMenu(scene, modelInfo ?? undefined);
  createPanicReset(scene, modelInfo ?? undefined);
  createHotspotCounter(scene, modelInfo ?? undefined);
  onPanicReset(() => {
    void handleXRAction("reset_view");
  });

  // ── Hotspot inspection tracking ─────────────────────────
  // Track which subsystem hotspots the visitor has clicked at least
  // once. The counter shows progress; once they've seen 4 of 5 we give
  // the remaining one an extra attention pulse.
  const inspectedHotspots = new Set<string>();
  const totalHotspots = HOTSPOTS.length;
  function markHotspotInspected(id: string): void {
    if (inspectedHotspots.has(id)) return;
    inspectedHotspots.add(id);
    setHotspotCount(inspectedHotspots.size, totalHotspots);
    const remaining = totalHotspots - inspectedHotspots.size;
    if (remaining > 0 && remaining <= 1) {
      // One left — pulse it so the visitor sees there's more to find.
      const remainingIds = HOTSPOTS
        .map((h) => h.id)
        .filter((id) => !inspectedHotspots.has(id));
      pulseHotspotsOnce(remainingIds);
    }
  }
  function resetHotspotProgress(): void {
    inspectedHotspots.clear();
    setHotspotCount(0, totalHotspots);
  }
  onMenuButton((id) => {
    switch (id) {
      case "move_closer":
        void handleXRAction("move_closer");
        break;
      case "move_back":
        void handleXRAction("move_back");
        break;
      case "toggle_interior":
        void handleXRAction("toggle_interior");
        break;
      case "toggle_explode":
        void handleXRAction("toggle_explode");
        break;
      case "reset":
        void handleXRAction("reset_view");
        break;
      case "quick_tour":
        void (async () => {
          doReset();
          hideGuidedPrompt();
          tutorialStep = -1;
          await runQuickTour(scene, {
            moveCloser: () => stepGuidedView(1),
            revealInterior: () => doToggleInterior(),
            explode: () => doToggleExploded(),
            reset: () => doReset(),
          });
        })();
        break;
      case "settings":
        // In-VR background switcher. Hide the menu while the picker is
        // open so the controller ray doesn't pick the menu through it.
        void (async () => {
          hideMenu();
          if (isInVR()) {
            setSpectatorStatus("Settings", "Choosing background");
          }
          const skyboxId = await showSkyboxPickerOnly(scene);
          applySkybox(skyboxId);
          showMenu();
          if (isInVR()) {
            setSpectatorStatus("Free Exploration", "Background updated");
          }
        })();
        break;
    }
  });

  const xr = await setupXR(scene, ground, modelInfo ?? undefined);

  const vrBtn = document.getElementById("enterVR");
  if (xr && vrBtn) {
    vrBtn.style.display = "inline-flex";
    vrBtn.addEventListener("click", () => {
      void enterVR();
    });
  }

  if (loadingEl) {
    loadingEl.classList.add("hidden");
    setTimeout(() => loadingEl.remove(), 600);
  }

  initOnboarding(scene, camera);

  if (!xr) {
    void runOnboarding();
  }

  onOnboardingCompleted.add((inVR) => {
    if (inVR) {
      startScriptedDemo();
    } else {
      stopScriptedDemo();
    }
  });

  // ── Guided tutorial state ──────────────────────────────
  let tutorialStep = -1; // -1 = not active, 0+ = current step
  let finalCardDismissTimer: ReturnType<typeof setTimeout> | null = null;
  const tutorialSteps = [
    {
      title: "Indian Queens switchgear",
      body:
        "A real 33 kV cabinet, rebuilt for inspection.\n\n" +
        "Use four controls to move, reveal, and separate the main assemblies. " +
        "After that, you can inspect the cabinet freely.",
      footer: "Press A to begin",
      expect: "move_closer" as XRButtonAction,
    },
    {
      title: "Move Closer",
      body: "A moves you closer to the cabinet.\n\nB steps back or closes a panel.",
      footer: "Press B to step back",
      expect: "move_back" as XRButtonAction,
    },
    {
      title: "See Inside",
      body: "X fades the outer shell.\n\nUse it when you want the internal layout in view.",
      footer: "Press X on the left controller",
      expect: "toggle_interior" as XRButtonAction,
    },
    {
      title: "Exploded View",
      body: "Y separates the main assemblies.\n\nUse this view to read the cabinet one system at a time.",
      footer: "Press Y on the left controller",
      expect: "toggle_explode" as XRButtonAction,
    },
    {
      title: "Explore",
      body: "Click the glowing dots to inspect each part.\n\nRight stick walks around. Left stick spins the model.\n\nHold any button for 3 seconds to reopen controls.",
      footer: "Press any button to explore freely",
      expect: null,
    },
  ];

  function showTutorialStep(): void {
    if (tutorialStep < 0 || tutorialStep >= tutorialSteps.length) return;
    const step = tutorialSteps[tutorialStep];
    showGuidedPrompt(step.title, step.body, step.footer);

    // Final card: auto-dismiss after 4s, then pulse hotspots once so the
    // user's eye gets pulled to the interactive markers.
    const isFinalStep = step.expect === null;
    if (isFinalStep) {
      if (finalCardDismissTimer) clearTimeout(finalCardDismissTimer);
      finalCardDismissTimer = setTimeout(() => {
        finalCardDismissTimer = null;
        // Only auto-dismiss if we're still on the final card.
        if (
          tutorialStep === tutorialSteps.length - 1 &&
          tutorialSteps[tutorialStep].expect === null
        ) {
          tutorialStep = -1;
          hideGuidedPrompt();
          pulseHotspotsOnce();
        }
      }, 4000);
    }
  }

  function clearFinalCardTimer(): void {
    if (finalCardDismissTimer) {
      clearTimeout(finalCardDismissTimer);
      finalCardDismissTimer = null;
    }
  }

  function advanceTutorial(action: XRButtonAction): boolean {
    if (tutorialStep < 0) return false;
    if (tutorialStep >= tutorialSteps.length) return false;

    const step = tutorialSteps[tutorialStep];

    // Last step — any button dismisses (also fires the hotspot pulse so
    // it works the same whether the user waits 4s or hits a button).
    if (step.expect === null) {
      clearFinalCardTimer();
      tutorialStep = -1;
      hideGuidedPrompt();
      pulseHotspotsOnce();
      return true;
    }

    // Check if the action matches what we expect
    if (action === step.expect) {
      // Visual confirmation before transitioning, so the user knows their
      // press registered and they're not stabbing the controller blind.
      showSuccessFeedback("✓ Got it!");
      const nextIndex = tutorialStep + 1;
      setTimeout(() => {
        // Bail if the tutorial state changed during the 800ms window
        // (e.g. user left VR, panic-reset, etc.).
        if (tutorialStep !== nextIndex - 1) return;
        if (nextIndex >= tutorialSteps.length) {
          tutorialStep = tutorialSteps.length - 1;
        } else {
          tutorialStep = nextIndex;
        }
        showTutorialStep();
      }, 800);
      return false; // let the action execute too
    }

    return false;
  }

  onVRStateChanged.add((inVR) => {
    if (inVR) {
      reparentGuidedPromptToXR();
      // Panic-reset is the one UI element that's visible the whole VR
      // session — never hidden by the choice screen, tutorial, or menu.
      showPanicReset();
      showSpectatorOverlay();
      setSpectatorStatus("Choosing experience", "Mode + background picker");
      // Run the mode/skybox picker BEFORE the menu/tutorial appear.
      // The menu and tutorial both reveal after the user picks.
      void runVRChoiceFlow();
      console.log("VR entered — choice screen shown.");
    } else {
      stopScriptedDemo();
      hideHotspots();
      hideHotspotCounter();
      closeInfoPanel();
      hideGuidedPrompt();
      hidePanicReset();
      hideSpectatorOverlay();
      clearFinalCardTimer();
      tutorialStep = -1;
      inspectActive = false;
    }
  });

  /**
   * Show the VR choice screen, apply the chosen background, then branch:
   *   quick → runQuickTour (skips the button-driven tutorial entirely)
   *   full  → reveal menu and start the tutorialSteps walkthrough
   */
  async function runVRChoiceFlow(): Promise<void> {
    try {
      const choices = await showVRChoiceScreen(scene);
      console.log(
        `VR choice: mode=${choices.mode}, skybox=${choices.skyboxId}`
      );
      applySkybox(choices.skyboxId);

      if (choices.mode === "quick") {
        // Quick Tour — fully scripted, no tutorial cards.
        doReset();
        hideGuidedPrompt();
        clearFinalCardTimer();
        tutorialStep = -1;
        showMenu();
        setSpectatorStatus("Quick Tour", "Auto-guided narrative");
        await runQuickTour(scene, {
          moveCloser: () => stepGuidedView(1),
          revealInterior: () => doToggleInterior(),
          explode: () => doToggleExploded(),
          reset: () => doReset(),
        });
        setSpectatorStatus("Free Exploration", "Tour complete");
      } else {
        // Full Experience — reveal menu and start the guided tutorial.
        showMenu();
        setSpectatorStatus("Tutorial", "Learning the controls");
        tutorialStep = 0;
        showTutorialStep();
      }
    } catch (err) {
      console.error("VR choice flow failed — falling back to tutorial.", err);
      showMenu();
      tutorialStep = 0;
      showTutorialStep();
    }
  }

  // ── Long press: show help card ────────────────────────
  onLongPress.add(() => {
    if (isGuidedPromptVisible()) {
      hideGuidedPrompt();
    } else {
      showHelpCard();
    }
  });

  onXRButtonAction.add((action) => {
    console.log(`XR button action received: ${action}`);
    if (isOnboardingActive()) return;

    // If help card is showing, any button dismisses it
    if (tutorialStep < 0 && isGuidedPromptVisible()) {
      hideGuidedPrompt();
      return;
    }

    // If tutorial is active, check if action advances it
    advanceTutorial(action);

    // Always execute the action (even during tutorial)
    void handleXRAction(action);
  });

  // ── Joystick controls ────────────────────────────────────
  // Left stick:  rotate model (turntable)
  // Right stick: move user in all directions (walk into model)
  const modelRoot = modelInfo?.meshes[0] ?? null;
  const ROTATE_SPEED = 0.035;  // radians per frame at full tilt
  const MOVE_SPEED = 0.05;    // meters per frame at full tilt

  // GLB models load with rotationQuaternion set, which overrides .rotation.
  // Clear it so we can use Euler angles for the turntable spin.
  if (modelRoot) {
    modelRoot.rotationQuaternion = null;
    console.log("Model root rotationQuaternion cleared — Euler rotation enabled.");
  }

  onJoystickAxes.add((axes) => {
    if (!isInVR()) return;

    // ── Left stick: spin the model ──────────────────────
    if (modelRoot && (axes.leftX || axes.leftY)) {
      // X axis = rotate around Y (turntable left/right)
      modelRoot.rotation.y += axes.leftX * ROTATE_SPEED;
      // Y axis = tilt around X (look up/down) — clamped so it doesn't flip
      modelRoot.rotation.x += axes.leftY * ROTATE_SPEED * 0.6;
      modelRoot.rotation.x = clampAngle(modelRoot.rotation.x, -0.6, 0.6);
    }

    // ── Right stick: move user in all directions ────────
    if (axes.rightX || axes.rightY) {
      const xr = getXR();
      if (!xr) return;

      const xrCamera = xr.baseExperience.camera;

      // Forward/backward along gaze direction
      const forward = xrCamera.getDirection(Vector3.Forward());
      forward.y = 0;
      forward.normalize();

      // Left/right strafe (perpendicular to gaze)
      const right = xrCamera.getDirection(Vector3.Right());
      right.y = 0;
      right.normalize();

      const move = forward.scale(-axes.rightY * MOVE_SPEED)
        .add(right.scale(axes.rightX * MOVE_SPEED));
      xrCamera.position.addInPlace(move);
    }
  });

  window.addEventListener("keydown", (e) => {
    switch (e.key.toLowerCase()) {
      case "d":
        void handleXRAction("toggle_interior");
        break;
      case "e":
        void handleXRAction("toggle_explode");
        break;
      case "h":
        toggleHotspots();
        break;
      case "r":
        void handleXRAction("reset_view");
        break;
      case "escape":
        closeInfoPanel();
        break;
      case "a":
        void handleXRAction("move_closer");
        break;
      case "b":
        void handleXRAction("move_back");
        break;
    }
  });

  console.log(
    "%c Keyboard shortcuts: A = closer, B = back, D = interior, E = explode, R = reset",
    "color: #81c784; font-weight: bold"
  );

  window.addEventListener("resize", () => {
    engine.resize();
  });
}

function clampAngle(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeInspectPosition(
  target: Vector3,
  currentUserPosition: Vector3,
  modelCenter: Vector3
): Vector3 {
  const offset = target.subtract(currentUserPosition);
  offset.y = 0;

  if (offset.lengthSquared() < 0.0001) {
    offset.copyFrom(target.subtract(modelCenter));
    offset.y = 0;
  } else {
    offset.normalize();
  }

  if (offset.lengthSquared() < 0.0001) {
    offset.set(0, 0, -1);
  } else {
    offset.normalize();
  }

  const distance = 0.95;
  return new Vector3(
    target.x - offset.x * distance,
    Math.max(1.25, target.y + 0.12),
    target.z - offset.z * distance
  );
}

main().catch((err) => {
  console.error("Failed to initialize Enspec Power VR:", err);
  const loading = document.getElementById("loading");
  if (loading) {
    loading.textContent = `Error: ${err.message}`;
  }
});

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
} from "./interactions/hotspots";
import { createFloatingMenu, onMenuButton, showMenu } from "./ui/floatingMenu";
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
import { initGuidedPrompt, reparentGuidedPromptToXR } from "./ui/guidedPrompt";

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
  initGuidedPrompt(scene);

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

  const allMeshes = scene.meshes;
  initDoors(allMeshes);
  initExplodedView(allMeshes);

  createHotspots(scene, modelInfo ?? undefined);
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
  });

  async function doOpenDoors() {
    if (!areDoorsOpen()) {
      await openAllDoors(scene);
    }
    showHotspots();
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
      closeInfoPanel();
      disableInteriorLight();
      await closeAllDoors(scene);
    }
  }

  async function doToggleInterior() {
    if (areDoorsOpen() || isExteriorFaded()) {
      await doCloseDoors();
    } else {
      await doOpenDoors();
    }
  }

  async function doToggleExploded() {
    if (isExploded()) {
      await collapse(scene);
      await unfadeExterior(scene);
      hideHotspots();
      disableInteriorLight();
      await closeAllDoors(scene);
      return;
    }

    if (!areDoorsOpen()) {
      await openAllDoors(scene);
    }
    await fadeExterior(scene);
    enableInteriorLight();
    showHotspots();
    await toggleExplodedView(scene);
  }

  function doReset() {
    inspectActive = false;
    resetExplodedView();
    resetDoors();
    resetGuidedView();
    hideHotspots();
    closeInfoPanel();
    disableInteriorLight();
    recenterUser();
    camera.alpha = camDefaults.alpha;
    camera.beta = camDefaults.beta;
    camera.radius = camDefaults.radius;
    camera.target = camDefaults.target.clone();
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

  onVRStateChanged.add((inVR) => {
    if (inVR) {
      // Re-parent UI elements that were created before XR was ready
      reparentGuidedPromptToXR();

      // Skip onboarding in VR — go straight to interactive mode.
      // The user sees the model + menu immediately and can start clicking.
      showMenu();
      console.log("VR entered — menu shown, ready for interaction.");
    } else {
      stopScriptedDemo();
      hideHotspots();
      closeInfoPanel();
      inspectActive = false;
    }
  });

  onXRButtonAction.add((action) => {
    console.log(`XR button action received: ${action}`);
    if (isOnboardingActive()) return;
    void handleXRAction(action);
  });

  // ── Joystick controls ────────────────────────────────────
  // Left stick:  rotate model (turntable)
  // Right stick: move user forward/backward (walk into model)
  const modelRoot = modelInfo?.meshes[0] ?? null;
  const modelCenterPoint = modelInfo?.center ?? new Vector3(0, 1.25, 0);
  const ROTATE_SPEED = 0.03;   // radians per frame at full tilt
  const MOVE_SPEED = 0.04;     // meters per frame at full tilt

  onJoystickAxes.add((axes) => {
    if (!isInVR()) return;

    // ── Left stick: spin the model ──────────────────────
    if (modelRoot && (axes.leftX || axes.leftY)) {
      // X axis = rotate around Y (turntable left/right)
      modelRoot.rotation.y += axes.leftX * ROTATE_SPEED;
      // Y axis = tilt around X (look up/down) — clamped
      modelRoot.rotation.x += axes.leftY * ROTATE_SPEED * 0.5;
      modelRoot.rotation.x = clampAngle(modelRoot.rotation.x, -0.5, 0.5);
    }

    // ── Right stick: move user forward/backward ─────────
    if (axes.rightY) {
      const xr = getXR();
      if (!xr) return;

      const xrCamera = xr.baseExperience.camera;
      // Get the direction the user is looking (horizontal only)
      const forward = xrCamera.getDirection(Vector3.Forward());
      forward.y = 0;
      forward.normalize();

      // Push stick forward (negative Y) = move toward model
      // Pull stick back (positive Y) = move away
      const move = forward.scale(-axes.rightY * MOVE_SPEED);
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

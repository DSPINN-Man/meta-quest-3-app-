import { Engine, Scene, ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { createEnvironment } from "./scene/environment";
import { createLighting, repositionLights, enableInteriorLight, disableInteriorLight } from "./scene/lighting";
import { loadModel, ModelInfo } from "./scene/modelLoader";
import { setupXR, enterVR } from "./interactions/xrSetup";
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
import { createFloatingMenu, onMenuButton } from "./ui/floatingMenu";
import { showInfoPanel, closeInfoPanel } from "./ui/infoPanel";
import { initOnboarding, runOnboarding } from "./flow/onboarding";

async function main() {
  // ── Canvas & Engine ───────────────────────────────────────
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  if (!canvas) throw new Error("Canvas element #renderCanvas not found.");

  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  });

  const scene = new Scene(engine);

  // ── Desktop Camera (mouse/keyboard fallback) ──────────────
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

  // ── Environment (dark room + ground) ──────────────────────
  const ground = createEnvironment(scene);

  // ── Lighting Rig (positions updated after model load) ─────
  const shadowGen = createLighting(scene);

  // ── Start render loop immediately ─────────────────────────
  engine.runRenderLoop(() => {
    scene.render();
  });

  // ── Load Model ────────────────────────────────────────────
  const loadingEl = document.getElementById("loading");
  const loadingText = document.getElementById("loadingText");
  const loadingBar = document.getElementById("loadingBarFill");
  let modelInfo: ModelInfo | null = null;

  try {
    modelInfo = await loadModel(scene, shadowGen, (pct) => {
      if (loadingText) loadingText.textContent = `Loading model... ${pct.toFixed(0)}%`;
      if (loadingBar) loadingBar.style.width = `${Math.min(pct, 100)}%`;
    });
  } catch (err) {
    console.error("Model load failed:", err);
    if (loadingText) loadingText.textContent = "Model failed to load. Check console.";
  }

  // ── Adapt scene to model bounds ───────────────────────────
  if (modelInfo && modelInfo.height > 0) {
    repositionLights(modelInfo);

    const h = modelInfo.height;
    const w = Math.max(modelInfo.width, modelInfo.depth);
    camera.target = modelInfo.center.clone();
    camera.radius = Math.max(h, w) * 2.5;
    camera.lowerRadiusLimit = Math.max(h, w) * 0.3;
    camera.upperRadiusLimit = Math.max(h, w) * 8;

    console.log(
      `Camera framed: target=(${camera.target.x.toFixed(2)}, ${camera.target.y.toFixed(2)}, ${camera.target.z.toFixed(2)}), radius=${camera.radius.toFixed(2)}`
    );
  }

  // Store camera defaults for the Reset button
  const camDefaults = {
    alpha: camera.alpha,
    beta: camera.beta,
    radius: camera.radius,
    target: camera.target.clone(),
  };

  // ── Initialize interaction systems ────────────────────────
  const allMeshes = scene.meshes;
  initDoors(allMeshes);
  initExplodedView(allMeshes);

  createHotspots(scene, modelInfo ?? undefined);
  onHotspotActivated((data, worldPos) => {
    showInfoPanel(data, worldPos, scene);
  });

  // ── Helper: Open doors with full side effects ─────────────
  async function doOpenDoors() {
    if (!areDoorsOpen()) {
      await openAllDoors(scene);
    }
    showHotspots();
    enableInteriorLight();
  }

  // ── Helper: Close doors with full side effects ────────────
  async function doCloseDoors() {
    if (areDoorsOpen() || isExteriorFaded()) {
      // Collapse exploded view first if active
      if (isExploded()) {
        await collapse(scene);
      }
      // Unfade exterior if it was faded (from exploded view)
      if (isExteriorFaded()) {
        await unfadeExterior(scene);
      }
      hideHotspots();
      closeInfoPanel();
      disableInteriorLight();
      await closeAllDoors(scene);
    }
  }

  // ── Helper: Full reset ────────────────────────────────────
  function doReset() {
    resetExplodedView();
    resetDoors();
    hideHotspots();
    closeInfoPanel();
    disableInteriorLight();
    camera.alpha = camDefaults.alpha;
    camera.beta = camDefaults.beta;
    camera.radius = camDefaults.radius;
    camera.target = camDefaults.target.clone();
  }

  // ── Floating 3D Menu ──────────────────────────────────────
  createFloatingMenu(scene, modelInfo ?? undefined);
  onMenuButton((id) => {
    switch (id) {
      case "open_doors":
        doOpenDoors();
        break;
      case "close_doors":
        doCloseDoors();
        break;
      case "exploded_view":
        // Toggle exploded view with exterior fade
        (async () => {
          if (isExploded()) {
            // Collapsing: restore parts, then unfade exterior, then close doors
            await collapse(scene);
            await unfadeExterior(scene);
            hideHotspots();
            disableInteriorLight();
            await closeAllDoors(scene);
          } else {
            // Exploding: open doors, fade exterior, then explode parts
            if (!areDoorsOpen()) {
              await openAllDoors(scene);
            }
            await fadeExterior(scene);
            enableInteriorLight();
            showHotspots();
            await toggleExplodedView(scene);
          }
        })();
        break;
      case "reset":
        doReset();
        break;
    }
  });

  // ── WebXR Setup ───────────────────────────────────────────
  const xr = await setupXR(scene, ground);

  const vrBtn = document.getElementById("enterVR");
  if (xr && vrBtn) {
    vrBtn.style.display = "inline-flex";
    vrBtn.addEventListener("click", () => {
      enterVR();
    });
  }

  // ── Hide Loading Overlay ──────────────────────────────────
  if (loadingEl) {
    loadingEl.classList.add("hidden");
    setTimeout(() => loadingEl.remove(), 600);
  }

  // ── Initialize & Start Onboarding Flow ────────────────────
  initOnboarding(scene, camera);
  runOnboarding();

  // ── Keyboard Shortcuts (desktop testing) ──────────────────
  window.addEventListener("keydown", (e) => {
    switch (e.key.toLowerCase()) {
      case "d":
        if (areDoorsOpen()) {
          doCloseDoors();
        } else {
          doOpenDoors();
        }
        break;
      case "e":
        (async () => {
          if (isExploded()) {
            await collapse(scene);
            await unfadeExterior(scene);
            hideHotspots();
            disableInteriorLight();
            await closeAllDoors(scene);
          } else {
            if (!areDoorsOpen()) await openAllDoors(scene);
            await fadeExterior(scene);
            enableInteriorLight();
            showHotspots();
            await toggleExplodedView(scene);
          }
        })();
        break;
      case "h":
        toggleHotspots();
        break;
      case "r":
        doReset();
        break;
      case "escape":
        closeInfoPanel();
        break;
    }
  });

  console.log(
    "%c Keyboard shortcuts: D = doors, E = explode, H = hotspots, R = reset, Esc = close panel",
    "color: #81c784; font-weight: bold"
  );

  // ── Resize Handling ───────────────────────────────────────
  window.addEventListener("resize", () => {
    engine.resize();
  });
}

main().catch((err) => {
  console.error("Failed to initialize Enspec Power VR:", err);
  const loading = document.getElementById("loading");
  if (loading) {
    loading.textContent = `Error: ${err.message}`;
  }
});

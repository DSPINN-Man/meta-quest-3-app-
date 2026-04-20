import {
  Scene,
  Mesh,
  MeshBuilder,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  StackPanel,
  Control,
} from "@babylonjs/gui";
import { getXR } from "../interactions/xrSetup";

/**
 * Desktop keeps the ENSPEC intro video.
 * VR uses a deterministic branded title card because Quest browser video-on-mesh
 * proved unreliable and was blocking the onboarding flow.
 */

let introMesh: Mesh | null = null;
let introTexture: AdvancedDynamicTexture | null = null;
let videoEl: HTMLVideoElement | null = null;
let overlayEl: HTMLDivElement | null = null;
let resolvePromise: (() => void) | null = null;
let disposed = false;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

const VIDEO_SRC = "enspec-intro.mp4";
const FADE_OUT = 0.5;
const VR_INTRO_MS = 2600;

export function showIntroScreen(scene: Scene, isVR = false): Promise<void> {
  disposed = false;

  return new Promise((resolve) => {
    resolvePromise = resolve;

    safetyTimer = setTimeout(() => {
      console.warn("Intro: safety timeout - forcing dispose");
      disposeIntro();
    }, 15000);

    try {
      if (isVR) {
        showVRIntro(scene);
      } else {
        showDesktopIntro();
      }
    } catch (err) {
      console.error("Intro: failed to create -", err);
      disposeIntro();
    }
  });
}

export function skipIntro(): void {
  disposeIntro();
}

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

  videoEl.addEventListener("ended", () => {
    fadeOutAndDispose();
  });

  videoEl.addEventListener("error", () => {
    disposeIntro();
  });

  const stallCheck = setTimeout(() => {
    if (videoEl && videoEl.readyState < 2) {
      disposeIntro();
    }
  }, 3000);

  videoEl.play()
    .then(() => {
      clearTimeout(stallCheck);
    })
    .catch(() => {
      videoEl!.muted = true;
      videoEl!.play()
        .then(() => clearTimeout(stallCheck))
        .catch(() => {
          clearTimeout(stallCheck);
          disposeIntro();
        });
    });
}

function showVRIntro(scene: Scene): void {
  introMesh = MeshBuilder.CreatePlane(
    "introBrandPlane",
    { width: 2.5, height: 1.2 },
    scene
  );
  introMesh.isPickable = false;
  attachMeshToViewer(introMesh, -1.55, 0.02);
  introTexture = AdvancedDynamicTexture.CreateForMesh(introMesh, 1200, 576);

  const bg = new Rectangle("introBg");
  bg.width = 1;
  bg.height = 1;
  bg.cornerRadius = 34;
  bg.thickness = 2;
  bg.color = "rgba(255,255,255,0.28)";
  bg.background = "rgba(9, 20, 28, 0.78)";
  bg.shadowColor = "rgba(0,0,0,0.30)";
  bg.shadowBlur = 24;
  bg.shadowOffsetY = 4;
  introTexture.addControl(bg);

  const stack = new StackPanel("introStack");
  stack.isVertical = true;
  stack.paddingTopInPixels = 70;
  stack.paddingLeftInPixels = 70;
  stack.paddingRightInPixels = 70;
  bg.addControl(stack);

  const brand = new TextBlock("introBrand", "ENSPEC");
  brand.color = "rgba(255,255,255,0.97)";
  brand.fontSize = 76;
  brand.fontWeight = "700";
  brand.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
  brand.height = "90px";
  brand.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  stack.addControl(brand);

  const title = new TextBlock("introTitle", "Interactive Product Showcase");
  title.color = "rgba(212, 238, 244, 0.95)";
  title.fontSize = 34;
  title.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
  title.height = "54px";
  title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  stack.addControl(title);

  const subtitle = new TextBlock(
    "introSubtitle",
    "A guided Meta Quest 3 experience"
  );
  subtitle.color = "rgba(135, 218, 235, 0.92)";
  subtitle.fontSize = 26;
  subtitle.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
  subtitle.height = "44px";
  subtitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  stack.addControl(subtitle);

  runSceneTimer(scene, VR_INTRO_MS, () => {
    fadeOutAndDispose();
  });
}

function attachMeshToViewer(mesh: Mesh, zOffset: number, yOffset = 0): void {
  const xr = getXR();
  const xrCamera = xr?.baseExperience.camera;
  if (xrCamera) {
    mesh.parent = xrCamera;
    mesh.position.set(0, yOffset, zOffset);
    mesh.rotation.set(0, 0, 0);
    return;
  }

  mesh.position.set(0, 1.6 + yOffset, zOffset);
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
}

function runSceneTimer(
  scene: Scene,
  durationMs: number,
  onDone: () => void
): void {
  let elapsed = 0;
  const observer = scene.onBeforeRenderObservable.add(() => {
    if (disposed) {
      scene.onBeforeRenderObservable.remove(observer);
      return;
    }

    elapsed += scene.getEngine().getDeltaTime();
    if (elapsed >= durationMs) {
      scene.onBeforeRenderObservable.remove(observer);
      onDone();
    }
  });
}

function fadeOutAndDispose(): void {
  if (disposed) return;

  if (overlayEl) {
    overlayEl.style.opacity = "0";
  }

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

  setTimeout(() => disposeIntro(), FADE_OUT * 1000 + 100);
}

function disposeIntro(): void {
  if (disposed) return;
  disposed = true;

  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }

  if (videoEl) {
    try {
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();
    } catch {
      // ignore cleanup errors
    }
  }

  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }

  if (introTexture) {
    introTexture.dispose();
    introTexture = null;
  }
  if (introMesh) {
    introMesh.dispose();
    introMesh = null;
  }

  videoEl = null;

  if (resolvePromise) {
    const r = resolvePromise;
    resolvePromise = null;
    r();
  }
}

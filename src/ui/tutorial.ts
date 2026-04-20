import {
  Scene,
  Mesh,
  MeshBuilder,
  Observer,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  StackPanel,
  Control,
} from "@babylonjs/gui";
import { getXR, onXRInput } from "../interactions/xrSetup";

/**
 * Minimal tutorial overlay — clean, typographic, Apple-like.
 * Dismisses on XR controller input, keyboard/mouse, OR hard 8s timeout.
 * In VR the copy is optimized for a booth guide script:
 * A closer, B back, X reveal, Y explode, stick press reset.
 */

let tutorialMesh: Mesh | null = null;
let tutorialTexture: AdvancedDynamicTexture | null = null;
let skipResolve: (() => void) | null = null;

/** Hard auto-dismiss timeout in ms — tutorial ALWAYS goes away after this */
const HARD_TIMEOUT_MS = 8000;

export function showTutorial(
  scene: Scene,
  isVR = false
): { promise: Promise<void>; skip: () => void } {
  let resolved = false;
  let xrInputObserver: Observer<void> | null = null;

  const promise = new Promise<void>((resolve) => {
    skipResolve = () => {
      if (resolved) return;
      resolved = true;
      // Clean up XR input listener
      if (xrInputObserver) {
        onXRInput.remove(xrInputObserver);
        xrInputObserver = null;
      }
      fadeOutAndDispose(resolve);
    };

    // ── GUI surface ──────────────────────────────────────
    if (isVR) {
      tutorialMesh = MeshBuilder.CreatePlane(
        "tutorialPlane",
        { width: 2.35, height: 1.18 },
        scene
      );
      tutorialMesh.isPickable = false;
      attachToViewer(tutorialMesh, -1.65, -0.02);
      tutorialTexture = AdvancedDynamicTexture.CreateForMesh(
        tutorialMesh,
        800,
        400
      );
    } else {
      tutorialTexture = AdvancedDynamicTexture.CreateFullscreenUI(
        "tutorialUI",
        true,
        scene
      );
    }

    // ── Container — fully opaque in VR so scene content behind ──
    // (e.g. revealed interior, exploded parts) never bleeds through.
    const bg = new Rectangle("tutBg");
    bg.width = isVR ? 1 : "380px";
    bg.height = isVR ? 1 : "240px";
    bg.cornerRadius = isVR ? 20 : 16;
    bg.thickness = isVR ? 2 : 0;
    bg.color = isVR ? "rgba(0, 180, 220, 0.55)" : "transparent";
    bg.background = isVR ? "rgb(6, 10, 18)" : "rgba(12, 12, 18, 0.72)";
    bg.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    bg.shadowColor = "rgba(0, 0, 0, 0.55)";
    bg.shadowBlur = isVR ? 28 : 30;
    bg.shadowOffsetY = isVR ? 6 : 4;
    tutorialTexture.addControl(bg);

    // ── Content ──────────────────────────────────────────
    const stack = new StackPanel("tutStack");
    stack.isVertical = true;
    stack.paddingTopInPixels = isVR ? 40 : 32;
    stack.paddingLeftInPixels = isVR ? 50 : 40;
    stack.paddingRightInPixels = isVR ? 50 : 40;
    bg.addControl(stack);

    // ── Instruction rows — clean two-line format ─────────
    const instructions = isVR
      ? [
          { action: "A  Move Closer", hint: "Steps to the next hero view" },
          { action: "B  Step Back", hint: "Returns to the wider overview" },
          { action: "X  Reveal Interior", hint: "Toggle the cabinet shell" },
          { action: "Y  Exploded View", hint: "Open the internals dramatically" },
          { action: "Tap Glowing Points", hint: "Teleport to inspect each part" },
        ]
      : [
          { action: "Drag", hint: "Orbit around the panel" },
          { action: "Scroll", hint: "Move closer or farther" },
          { action: "D / E / R", hint: "Doors, explode, reset" },
        ];

    for (let i = 0; i < instructions.length; i++) {
      const instr = instructions[i];

      const action = new TextBlock(`action_${i}`, instr.action);
      action.color = "rgba(255, 255, 255, 0.92)";
      action.fontSize = isVR ? 26 : 19;
      action.fontWeight = "600";
      action.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
      action.height = isVR ? "38px" : "26px";
      action.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      stack.addControl(action);

      const hint = new TextBlock(`hint_${i}`, instr.hint);
      hint.color = "rgba(180, 185, 195, 0.55)";
      hint.fontSize = isVR ? 18 : 13;
      hint.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
      hint.height = isVR ? "28px" : "20px";
      hint.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      stack.addControl(hint);

      if (i < instructions.length - 1) {
        const gap = new Rectangle(`gap_${i}`);
        gap.height = isVR ? "18px" : "14px";
        gap.thickness = 0;
        gap.background = "transparent";
        stack.addControl(gap);
      }
    }

    // ── Dismiss hint ────────────────────────────────────
    const dismiss = new TextBlock(
      "tutDismiss",
      "press any button to continue"
    );
    dismiss.color = "rgba(140, 145, 155, 0.35)";
    dismiss.fontSize = isVR ? 16 : 11;
    dismiss.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
    dismiss.paddingTopInPixels = isVR ? 28 : 20;
    dismiss.height = isVR ? "44px" : "32px";
    dismiss.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    stack.addControl(dismiss);

    // ── XR controller dismiss listener ───────────────────
    // This is the primary dismiss path in VR — keyboard/mouse events
    // do NOT fire inside a WebXR session.
    xrInputObserver = onXRInput.add(() => {
      if (!resolved) {
        console.log("Tutorial dismissed via XR controller input.");
        skipResolve?.();
      }
    });

    // Also try XR squeeze events as alternative dismiss path
    const xr = getXR();
    if (xr && xr.input) {
      xr.input.onControllerAddedObservable.addOnce((controller) => {
        // Any squeeze triggers dismiss
        controller.onMeshLoadedObservable.addOnce(() => {
          if (!resolved) {
            console.log("Tutorial: XR controller loaded, dismiss available.");
          }
        });
      });
    }

    // ── Hard auto-dismiss timeout (ALWAYS fires) ─────────
    // This is the safety net — tutorial goes away no matter what
    let elapsed = 0;
    const timeoutObserver = scene.onBeforeRenderObservable.add(() => {
      if (resolved) {
        scene.onBeforeRenderObservable.remove(timeoutObserver);
        return;
      }

      elapsed += scene.getEngine().getDeltaTime();
      if (elapsed >= HARD_TIMEOUT_MS) {
        console.log("Tutorial auto-dismissed (hard timeout).");
        resolved = true;
        scene.onBeforeRenderObservable.remove(timeoutObserver);
        if (xrInputObserver) {
          onXRInput.remove(xrInputObserver);
          xrInputObserver = null;
        }
        fadeOutAndDispose(resolve);
      }
    });
  });

  return {
    promise,
    skip: () => skipResolve?.(),
  };
}

// ── Fade out ─────────────────────────────────────────────────

function fadeOutAndDispose(onDone: () => void): void {
  const start = performance.now();
  const duration = 400;

  function tick() {
    const elapsed = performance.now() - start;
    const alpha = 1 - Math.min(elapsed / duration, 1);

    if (tutorialMesh) {
      tutorialMesh.visibility = alpha;
    }

    if (elapsed >= duration) {
      disposeTutorial();
      onDone();
      return;
    }
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function disposeTutorial(): void {
  if (tutorialTexture) {
    tutorialTexture.dispose();
    tutorialTexture = null;
  }
  if (tutorialMesh) {
    tutorialMesh.dispose();
    tutorialMesh = null;
  }
  skipResolve = null;
}

function attachToViewer(mesh: Mesh, zOffset: number, yOffset = 0): void {
  const xrCamera = getXR()?.baseExperience.camera;
  if (xrCamera) {
    mesh.parent = xrCamera;
    mesh.position.set(0, yOffset, zOffset);
    mesh.rotation.set(0, 0, 0);
    return;
  }

  mesh.position.set(0, 1.6 + yOffset, zOffset);
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
}

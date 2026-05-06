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
import { PANEL, styleBody, styleFooter, stylePanel, styleTitle } from "./panelTheme";

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
        { width: 1.48, height: 0.72 },
        scene
      );
      tutorialMesh.isPickable = false;
      attachToViewer(tutorialMesh, -1.65, -0.02);
      tutorialTexture = AdvancedDynamicTexture.CreateForMesh(
        tutorialMesh,
        1040,
        504
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
    bg.width = isVR ? 1 : "292px";
    bg.height = isVR ? 1 : "172px";
    stylePanel(bg, isVR ? 15 : 12, isVR ? 14 : 16);
    bg.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    tutorialTexture.addControl(bg);

    // ── Content ──────────────────────────────────────────
    const stack = new StackPanel("tutStack");
    stack.isVertical = true;
    stack.paddingTopInPixels = isVR ? 28 : 22;
    stack.paddingLeftInPixels = isVR ? 34 : 28;
    stack.paddingRightInPixels = isVR ? 34 : 28;
    bg.addControl(stack);

    // ── Instruction rows — clean two-line format ─────────
    const instructions = isVR
      ? [
          { action: "A", hint: "Move closer" },
          { action: "B", hint: "Step back" },
          { action: "X", hint: "See inside" },
          { action: "Y", hint: "Exploded view" },
          { action: "Trigger", hint: "Open a detail point" },
        ]
      : [
          { action: "Drag", hint: "Orbit" },
          { action: "Scroll", hint: "Move in or out" },
          { action: "D / E / R", hint: "Doors, explode, reset" },
        ];

    for (let i = 0; i < instructions.length; i++) {
      const instr = instructions[i];

      const action = new TextBlock(`action_${i}`, instr.action);
      styleTitle(action, isVR ? 22 : 16);
      action.height = isVR ? "30px" : "22px";
      action.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      stack.addControl(action);

      const hint = new TextBlock(`hint_${i}`, instr.hint);
      styleBody(hint, isVR ? 15 : 12);
      hint.height = isVR ? "22px" : "18px";
      hint.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      stack.addControl(hint);

      if (i < instructions.length - 1) {
        const gap = new Rectangle(`gap_${i}`);
        gap.height = isVR ? "10px" : "8px";
        gap.thickness = 0;
        gap.background = "transparent";
        stack.addControl(gap);
      }
    }

    // ── Dismiss hint ────────────────────────────────────
    const dismiss = new TextBlock(
      "tutDismiss",
      "press any button"
    );
    styleFooter(dismiss, isVR ? 14 : 10);
    dismiss.paddingTopInPixels = isVR ? 18 : 12;
    dismiss.height = isVR ? "30px" : "22px";
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

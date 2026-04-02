import {
  Scene,
  Mesh,
  MeshBuilder,
  Vector3,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  StackPanel,
  Control,
} from "@babylonjs/gui";
import { TIMING } from "../utils/config";

/**
 * Minimal tutorial overlay — clean, typographic, Apple-like.
 * No borders, no emojis, just quiet hierarchy and whitespace.
 */

let tutorialMesh: Mesh | null = null;
let tutorialTexture: AdvancedDynamicTexture | null = null;
let skipResolve: (() => void) | null = null;

export function showTutorial(
  scene: Scene,
  isVR = false
): { promise: Promise<void>; skip: () => void } {
  let resolved = false;

  const promise = new Promise<void>((resolve) => {
    skipResolve = () => {
      if (resolved) return;
      resolved = true;
      fadeOutAndDispose(resolve);
    };

    // ── GUI surface ──────────────────────────────────────
    if (isVR) {
      tutorialMesh = MeshBuilder.CreatePlane(
        "tutorialPlane",
        { width: 2.0, height: 1.0 },
        scene
      );
      tutorialMesh.position = new Vector3(0, 1.5, -1.8);
      tutorialMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
      tutorialMesh.isPickable = false;
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

    // ── Container — no border, ultra-subtle frosted glass ──
    const bg = new Rectangle("tutBg");
    bg.width = isVR ? 1 : "380px";
    bg.height = isVR ? 1 : "240px";
    bg.cornerRadius = isVR ? 20 : 16;
    bg.thickness = 0;
    bg.background = "rgba(12, 12, 18, 0.72)";
    bg.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    bg.shadowColor = "rgba(0, 0, 0, 0.4)";
    bg.shadowBlur = 30;
    bg.shadowOffsetY = 4;
    tutorialTexture.addControl(bg);

    // ── Content ──────────────────────────────────────────
    const stack = new StackPanel("tutStack");
    stack.isVertical = true;
    stack.paddingTopInPixels = isVR ? 40 : 32;
    stack.paddingLeftInPixels = isVR ? 50 : 40;
    stack.paddingRightInPixels = isVR ? 50 : 40;
    bg.addControl(stack);

    // ── Instruction rows — clean two-line format ─────────
    const instructions = [
      { action: "Move", hint: "Left stick" },
      { action: "Interact", hint: "Right trigger" },
      { action: "Discover", hint: "Tap glowing points" },
    ];

    for (let i = 0; i < instructions.length; i++) {
      const instr = instructions[i];

      // Action word — large, white, medium weight
      const action = new TextBlock(`action_${i}`, instr.action);
      action.color = "rgba(255, 255, 255, 0.92)";
      action.fontSize = isVR ? 28 : 19;
      action.fontWeight = "600";
      action.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
      action.height = isVR ? "38px" : "26px";
      action.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      stack.addControl(action);

      // Hint — smaller, muted
      const hint = new TextBlock(`hint_${i}`, instr.hint);
      hint.color = "rgba(180, 185, 195, 0.55)";
      hint.fontSize = isVR ? 19 : 13;
      hint.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
      hint.height = isVR ? "28px" : "20px";
      hint.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      stack.addControl(hint);

      // Spacing between items (not after the last one)
      if (i < instructions.length - 1) {
        const gap = new Rectangle(`gap_${i}`);
        gap.height = isVR ? "18px" : "14px";
        gap.thickness = 0;
        gap.background = "transparent";
        stack.addControl(gap);
      }
    }

    // ── Dismiss hint — barely visible ────────────────────
    const dismiss = new TextBlock(
      "tutDismiss",
      "press anything to continue"
    );
    dismiss.color = "rgba(140, 145, 155, 0.35)";
    dismiss.fontSize = isVR ? 15 : 11;
    dismiss.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
    dismiss.paddingTopInPixels = isVR ? 28 : 20;
    dismiss.height = isVR ? "44px" : "32px";
    dismiss.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    stack.addControl(dismiss);

    // ── Auto-dismiss ─────────────────────────────────────
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        fadeOutAndDispose(resolve);
      }
    }, TIMING.tutorialDuration * 1000);
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

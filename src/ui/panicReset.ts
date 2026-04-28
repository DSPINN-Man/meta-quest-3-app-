import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  ActionManager,
  ExecuteCodeAction,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Control,
} from "@babylonjs/gui";
import type { ModelInfo } from "../scene/modelLoader";

/**
 * Panic-reset floating button.
 *
 * Always visible whenever the user is in VR — sits to the LEFT of the model
 * at eye height. Big, red/orange, hard to miss. Hand-off to a confused
 * visitor: "If you ever get lost, look left and tap the orange Reset disc."
 *
 * Distinct from the regular floating menu (which lives on the right and
 * gets hidden during the choice screen / quick tour). This one stays put.
 */

let panicMesh: Mesh | null = null;
let panicBg: Rectangle | null = null;
let panicText: TextBlock | null = null;
let onResetCallback: (() => void) | null = null;

const BG_REST = "rgba(180, 60, 30, 0.85)";    // warm red-orange
const BG_HOVER = "rgba(220, 90, 40, 0.95)";   // brighter on hover
const BG_ACTIVE = "rgba(255, 130, 60, 1.0)";  // brief flash on click

export function createPanicReset(scene: Scene, modelInfo?: ModelInfo): void {
  const modelHeight = modelInfo?.height ?? 2.5;
  const modelWidth = modelInfo?.width ?? 1.0;
  const modelCenter = modelInfo?.center ?? new Vector3(0, 1.25, 0);

  // LEFT side of the model, eye height. Floats in world space.
  const pos = new Vector3(
    modelCenter.x - modelWidth * 0.5 - 0.8,
    1.4,
    modelCenter.z
  );

  // Slightly bigger than a regular menu button so it's hard to miss.
  const btnW = Math.max(0.5, modelHeight * 0.25);
  const btnH = Math.max(0.18, modelHeight * 0.085);

  panicMesh = MeshBuilder.CreatePlane(
    "panicResetBtn",
    { width: btnW, height: btnH },
    scene
  );
  panicMesh.position = pos;
  panicMesh.billboardMode = Mesh.BILLBOARDMODE_Y;
  panicMesh.isPickable = true;
  panicMesh.receiveShadows = false;
  // Hidden by default — only shown in VR.
  panicMesh.setEnabled(false);

  const tex = AdvancedDynamicTexture.CreateForMesh(panicMesh, 512, 192, false);

  panicBg = new Rectangle("panicBg");
  panicBg.width = 1;
  panicBg.height = 1;
  panicBg.cornerRadius = 96;
  panicBg.thickness = 3;
  panicBg.color = "rgba(255, 200, 150, 0.85)";
  panicBg.background = BG_REST;
  panicBg.shadowColor = "rgba(0, 0, 0, 0.45)";
  panicBg.shadowBlur = 22;
  panicBg.shadowOffsetY = 4;
  tex.addControl(panicBg);

  panicText = new TextBlock("panicText", "⟳  Reset");
  panicText.color = "rgba(255, 255, 255, 1)";
  panicText.fontSize = 50;
  panicText.fontWeight = "700";
  panicText.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
  panicText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  panicText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  panicBg.addControl(panicText);

  panicMesh.actionManager = new ActionManager(scene);
  panicMesh.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
      if (panicBg) panicBg.background = BG_ACTIVE;
      onResetCallback?.();
      setTimeout(() => {
        if (panicBg) panicBg.background = BG_REST;
      }, 180);
    })
  );
  panicMesh.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
      if (panicBg) panicBg.background = BG_HOVER;
    })
  );
  panicMesh.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
      if (panicBg) panicBg.background = BG_REST;
    })
  );

  console.log(
    `Panic-reset button placed at (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`
  );
}

/** Wire the click handler. The right grip (right:1) calls reset_view via the
 *  XR button mapping in xrSetup.ts — this callback is for the on-screen tap. */
export function onPanicReset(cb: () => void): void {
  onResetCallback = cb;
}

/** Show the panic-reset button. Called when entering VR. */
export function showPanicReset(): void {
  if (panicMesh) panicMesh.setEnabled(true);
}

/** Hide the panic-reset button. Called when leaving VR. */
export function hidePanicReset(): void {
  if (panicMesh) panicMesh.setEnabled(false);
}

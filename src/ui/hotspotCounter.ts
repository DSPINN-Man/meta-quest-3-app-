import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Control,
} from "@babylonjs/gui";
import type { ModelInfo } from "../scene/modelLoader";

/**
 * Floating counter showing how many subsystem hotspots the visitor has
 * inspected so far ("3 of 5 explored"). Sits above the floating menu
 * on the right side of the model. Updates whenever the user clicks a
 * hotspot for the first time.
 *
 * Visible only when hotspots themselves are visible (i.e. once the
 * cabinet shell has been faded). Hidden until the experience has
 * something to count.
 */

let counterMesh: Mesh | null = null;
let textBlock: TextBlock | null = null;
let bgRect: Rectangle | null = null;

const REST_BG = "rgba(8, 14, 24, 0.78)";
const COMPLETE_BG = "rgba(20, 70, 50, 0.85)";

export function createHotspotCounter(scene: Scene, modelInfo?: ModelInfo): void {
  const modelHeight = modelInfo?.height ?? 2.5;
  const modelWidth = modelInfo?.width ?? 1.0;
  const modelCenter = modelInfo?.center ?? new Vector3(0, 1.25, 0);

  const pos = new Vector3(
    modelCenter.x + modelWidth * 0.5 + 0.8,
    1.95, // sits above the floating menu (which is at 1.4)
    modelCenter.z
  );

  const w = Math.max(0.55, modelHeight * 0.26);
  const h = Math.max(0.13, modelHeight * 0.06);

  counterMesh = MeshBuilder.CreatePlane(
    "hotspotCounter",
    { width: w, height: h },
    scene
  );
  counterMesh.position = pos;
  counterMesh.billboardMode = Mesh.BILLBOARDMODE_Y;
  counterMesh.isPickable = false;
  counterMesh.receiveShadows = false;
  counterMesh.setEnabled(false);

  const tex = AdvancedDynamicTexture.CreateForMesh(counterMesh, 512, 128, false);

  bgRect = new Rectangle("counterBg");
  bgRect.width = 1;
  bgRect.height = 1;
  bgRect.cornerRadius = 32;
  bgRect.thickness = 1;
  bgRect.color = "rgba(0, 200, 240, 0.45)";
  bgRect.background = REST_BG;
  bgRect.shadowColor = "rgba(0, 0, 0, 0.4)";
  bgRect.shadowBlur = 16;
  bgRect.shadowOffsetY = 3;
  tex.addControl(bgRect);

  textBlock = new TextBlock("counterText", "0 of 5 explored");
  textBlock.color = "rgba(255, 255, 255, 0.95)";
  textBlock.fontSize = 36;
  textBlock.fontWeight = "600";
  textBlock.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
  textBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  textBlock.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  bgRect.addControl(textBlock);
}

/** Update the counter text. Call after each first-time hotspot inspection. */
export function setHotspotCount(seen: number, total: number): void {
  if (!textBlock) return;
  if (seen >= total && total > 0) {
    textBlock.text = `✓ All ${total} explored`;
    if (bgRect) bgRect.background = COMPLETE_BG;
  } else {
    textBlock.text = `${seen} of ${total} explored`;
    if (bgRect) bgRect.background = REST_BG;
  }
}

export function showHotspotCounter(): void {
  if (counterMesh) counterMesh.setEnabled(true);
}

export function hideHotspotCounter(): void {
  if (counterMesh) counterMesh.setEnabled(false);
}

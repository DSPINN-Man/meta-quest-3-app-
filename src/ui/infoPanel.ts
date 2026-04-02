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
  Button,
  Control,
  StackPanel,
} from "@babylonjs/gui";
import { HotspotData } from "../utils/config";

/**
 * Manages a single floating info panel that appears next to hotspots.
 * Only one panel is visible at a time — opening a new one closes the previous.
 * The panel uses billboard mode so it always faces the active camera.
 */

/** The current panel plane mesh (null if none open) */
let panelMesh: Mesh | null = null;
/** The GUI texture drawn on the panel */
let panelTexture: AdvancedDynamicTexture | null = null;
/** ID of the currently displayed hotspot (to toggle on re-click) */
let currentHotspotId: string | null = null;

// Panel dimensions in world meters
const PANEL_WIDTH = 0.6;
const PANEL_HEIGHT = 0.35;
// GUI texture resolution (higher = sharper text)
const TEX_WIDTH = 512;
const TEX_HEIGHT = 300;

/**
 * Show an info panel for the given hotspot near the provided world position.
 * If the same hotspot is already showing, closes it instead (toggle).
 */
export function showInfoPanel(
  data: HotspotData,
  worldPos: Vector3,
  scene: Scene
): void {
  // Toggle off if clicking the same hotspot
  if (currentHotspotId === data.id) {
    closeInfoPanel();
    return;
  }

  // Close any existing panel first
  closeInfoPanel();

  // ── Create plane mesh ─────────────────────────────────────
  panelMesh = MeshBuilder.CreatePlane(
    "infoPanel",
    { width: PANEL_WIDTH, height: PANEL_HEIGHT },
    scene
  );

  // Position slightly above and to the right of the hotspot
  panelMesh.position = worldPos
    .clone()
    .add(new Vector3(0.35, 0.15, 0));

  // Billboard mode — always face the camera
  panelMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;

  // Don't interact with lighting or shadows
  panelMesh.isPickable = false;
  panelMesh.receiveShadows = false;

  // ── Create GUI texture on the plane ───────────────────────
  panelTexture = AdvancedDynamicTexture.CreateForMesh(
    panelMesh,
    TEX_WIDTH,
    TEX_HEIGHT
  );

  // ── Background container ──────────────────────────────────
  const bg = new Rectangle("infoBg");
  bg.width = 1;
  bg.height = 1;
  bg.cornerRadius = 12;
  bg.color = "rgba(0, 180, 220, 0.5)"; // subtle cyan border
  bg.thickness = 1.5;
  bg.background = "rgba(10, 12, 20, 0.92)"; // dark translucent bg
  panelTexture.addControl(bg);

  // ── Layout stack ──────────────────────────────────────────
  const stack = new StackPanel("infoStack");
  stack.isVertical = true;
  stack.paddingTopInPixels = 16;
  stack.paddingLeftInPixels = 20;
  stack.paddingRightInPixels = 20;
  stack.paddingBottomInPixels = 12;
  stack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  stack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  bg.addControl(stack);

  // ── Title ─────────────────────────────────────────────────
  const title = new TextBlock("infoTitle", data.title);
  title.color = "white";
  title.fontSize = 28;
  title.fontWeight = "bold";
  title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  title.height = "40px";
  title.resizeToFit = false;
  stack.addControl(title);

  // ── Separator line ────────────────────────────────────────
  const sep = new Rectangle("infoSep");
  sep.width = "90%";
  sep.height = "2px";
  sep.background = "rgba(0, 180, 220, 0.4)";
  sep.thickness = 0;
  sep.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  sep.paddingTopInPixels = 4;
  sep.paddingBottomInPixels = 8;
  stack.addControl(sep);

  // ── Description ───────────────────────────────────────────
  const desc = new TextBlock("infoDesc", data.description);
  desc.color = "rgba(200, 210, 220, 0.95)";
  desc.fontSize = 19;
  desc.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  desc.textWrapping = true;
  desc.height = "140px";
  desc.lineSpacing = "4px";
  desc.resizeToFit = false;
  stack.addControl(desc);

  // ── Close button (top-right corner) ───────────────────────
  const closeBtn = Button.CreateSimpleButton("infoClose", "\u2715");
  closeBtn.width = "36px";
  closeBtn.height = "36px";
  closeBtn.color = "rgba(200, 210, 220, 0.8)";
  closeBtn.fontSize = 20;
  closeBtn.thickness = 0;
  closeBtn.background = "transparent";
  closeBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  closeBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  closeBtn.paddingTopInPixels = 6;
  closeBtn.paddingRightInPixels = 6;
  closeBtn.hoverCursor = "pointer";
  closeBtn.onPointerClickObservable.add(() => {
    closeInfoPanel();
  });
  bg.addControl(closeBtn);

  currentHotspotId = data.id;
}

/**
 * Close and dispose the current info panel.
 */
export function closeInfoPanel(): void {
  if (panelTexture) {
    panelTexture.dispose();
    panelTexture = null;
  }
  if (panelMesh) {
    panelMesh.dispose();
    panelMesh = null;
  }
  currentHotspotId = null;
}

/**
 * Returns true if an info panel is currently open.
 */
export function isInfoPanelOpen(): boolean {
  return panelMesh !== null;
}

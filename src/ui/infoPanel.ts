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
 * Minimal floating info card — quiet, typographic, Apple-like.
 * One card at a time. Billboard faces the viewer.
 */

let panelMesh: Mesh | null = null;
let panelTexture: AdvancedDynamicTexture | null = null;
let currentHotspotId: string | null = null;

const PANEL_WIDTH = 0.75;
const PANEL_HEIGHT = 0.42;
const TEX_WIDTH = 600;
const TEX_HEIGHT = 340;

export function showInfoPanel(
  data: HotspotData,
  worldPos: Vector3,
  scene: Scene
): void {
  if (currentHotspotId === data.id) {
    closeInfoPanel();
    return;
  }

  closeInfoPanel();

  // ── Mesh ──────────────────────────────────────────────────
  panelMesh = MeshBuilder.CreatePlane(
    "infoPanel",
    { width: PANEL_WIDTH, height: PANEL_HEIGHT },
    scene
  );
  panelMesh.position = worldPos.clone().add(new Vector3(0.3, 0.18, 0));
  panelMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  panelMesh.isPickable = true;
  panelMesh.receiveShadows = false;

  panelTexture = AdvancedDynamicTexture.CreateForMesh(
    panelMesh,
    TEX_WIDTH,
    TEX_HEIGHT
  );

  // ── Card background — dark, clean, minimal ────────────────
  const bg = new Rectangle("infoBg");
  bg.width = 1;
  bg.height = 1;
  bg.cornerRadius = 20;
  bg.thickness = 0;
  bg.background = "rgb(14, 16, 22)";
  bg.shadowColor = "rgba(0, 0, 0, 0.5)";
  bg.shadowBlur = 24;
  bg.shadowOffsetY = 4;
  panelTexture.addControl(bg);

  // ── Content stack ─────────────────────────────────────────
  const stack = new StackPanel("infoStack");
  stack.isVertical = true;
  stack.paddingTopInPixels = 28;
  stack.paddingLeftInPixels = 30;
  stack.paddingRightInPixels = 30;
  stack.paddingBottomInPixels = 20;
  stack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  stack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  bg.addControl(stack);

  // ── Title — clean, white, medium weight ───────────────────
  const title = new TextBlock("infoTitle", data.title);
  title.color = "rgba(255, 255, 255, 0.95)";
  title.fontSize = 26;
  title.fontWeight = "600";
  title.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
  title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  title.height = "38px";
  title.resizeToFit = false;
  stack.addControl(title);

  // ── Thin accent line ──────────────────────────────────────
  const line = new Rectangle("infoLine");
  line.width = "48px";
  line.height = "2px";
  line.background = "rgba(100, 180, 220, 0.5)";
  line.thickness = 0;
  line.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  line.paddingTopInPixels = 6;
  line.paddingBottomInPixels = 10;
  stack.addControl(line);

  // ── Description — muted, readable ─────────────────────────
  const desc = new TextBlock("infoDesc", data.description);
  desc.color = "rgba(190, 200, 210, 0.85)";
  desc.fontSize = 17;
  desc.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
  desc.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  desc.textWrapping = true;
  desc.height = "150px";
  desc.lineSpacing = "5px";
  desc.resizeToFit = false;
  stack.addControl(desc);

  // ── Close — small, quiet, bottom-right ────────────────────
  const closeBtn = Button.CreateSimpleButton("infoClose", "Dismiss");
  closeBtn.width = "90px";
  closeBtn.height = "32px";
  closeBtn.color = "rgba(160, 170, 180, 0.7)";
  closeBtn.fontSize = 14;
  closeBtn.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
  closeBtn.thickness = 1;
  closeBtn.background = "rgba(255, 255, 255, 0.06)";
  closeBtn.cornerRadius = 16;
  closeBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  closeBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  closeBtn.paddingBottomInPixels = 14;
  closeBtn.paddingRightInPixels = 16;
  closeBtn.hoverCursor = "pointer";
  closeBtn.onPointerClickObservable.add(() => {
    closeInfoPanel();
  });
  bg.addControl(closeBtn);

  currentHotspotId = data.id;
}

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

export function isInfoPanelOpen(): boolean {
  return panelMesh !== null;
}

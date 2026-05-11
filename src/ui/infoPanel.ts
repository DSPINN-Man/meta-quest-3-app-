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
import {
  VR_PANEL,
  styleVRBody,
  styleVRPanel,
  styleVRTitle,
} from "./panelTheme";

/**
 * Minimal floating info card — quiet, typographic, Apple-like.
 * One card at a time. Billboard faces the viewer.
 */

let panelMesh: Mesh | null = null;
let panelTexture: AdvancedDynamicTexture | null = null;
let currentHotspotId: string | null = null;

const PANEL_WIDTH = 1.08;
const PANEL_HEIGHT = 0.62;
const TEX_WIDTH = 900;
const TEX_HEIGHT = 520;

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
  panelMesh.position = worldPos.clone().add(new Vector3(0.44, 0.26, 0));
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
  styleVRPanel(bg, 18, 18);
  panelTexture.addControl(bg);

  // ── Content stack ─────────────────────────────────────────
  const stack = new StackPanel("infoStack");
  stack.isVertical = true;
  stack.paddingTopInPixels = 34;
  stack.paddingLeftInPixels = 38;
  stack.paddingRightInPixels = 38;
  stack.paddingBottomInPixels = 26;
  stack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  stack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  bg.addControl(stack);

  // ── Title — clean, white, medium weight ───────────────────
  const title = new TextBlock("infoTitle", data.title);
  styleVRTitle(title, 28);
  title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  title.height = "46px";
  title.resizeToFit = false;
  stack.addControl(title);

  // ── Thin accent line ──────────────────────────────────────
  const line = new Rectangle("infoLine");
  line.width = "60px";
  line.height = "2px";
  line.background = VR_PANEL.accent;
  line.thickness = 0;
  line.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  line.paddingTopInPixels = 6;
  line.paddingBottomInPixels = 10;
  stack.addControl(line);

  // ── Description — muted, readable ─────────────────────────
  const desc = new TextBlock("infoDesc", data.description);
  styleVRBody(desc, 20);
  desc.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  desc.textWrapping = true;
  desc.height = "260px";
  desc.lineSpacing = "6px";
  desc.resizeToFit = false;
  stack.addControl(desc);

  // ── Close — small, quiet, bottom-right ────────────────────
  const closeBtn = Button.CreateSimpleButton("infoClose", "Dismiss");
  closeBtn.width = "90px";
  closeBtn.height = "38px";
  closeBtn.color = VR_PANEL.faint;
  closeBtn.fontSize = 16;
  closeBtn.fontFamily = VR_PANEL.fontText;
  closeBtn.thickness = 1;
  closeBtn.background = VR_PANEL.surfaceSoft;
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

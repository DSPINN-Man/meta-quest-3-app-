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
 * Floating 3D menu — minimal, borderless, Apple-like.
 * Soft frosted-glass pills with quiet typography.
 */

interface MenuButton {
  label: string;
  id: string;
  mesh: Mesh;
  bg: Rectangle;
  text: TextBlock;
}

let menuRoot: Mesh | null = null;
let buttons: MenuButton[] = [];
let onButtonCallback: ((id: string) => void) | null = null;

// ── Style constants ─────────────────────────────────────────
const BG_REST = "rgba(18, 18, 24, 0.55)";
const BG_HOVER = "rgba(32, 32, 42, 0.7)";
const BG_ACTIVE = "rgba(48, 48, 58, 0.8)";
const TEXT_REST = "rgba(255, 255, 255, 0.78)";
const TEXT_HOVER = "rgba(255, 255, 255, 0.95)";

export function onMenuButton(cb: (id: string) => void): void {
  onButtonCallback = cb;
}

export function createFloatingMenu(scene: Scene, modelInfo?: ModelInfo): void {
  const modelHeight = modelInfo?.height ?? 2.5;
  const modelWidth = modelInfo?.width ?? 1.0;
  const modelCenter = modelInfo?.center ?? new Vector3(0, 1.25, 0);

  const menuPos = new Vector3(
    modelCenter.x + modelWidth * 0.8 + 0.4,
    modelHeight * 0.6,
    modelCenter.z
  );

  const buttonDefs = [
    { label: "Reveal Interior", id: "open_doors" },
    { label: "Restore Shell", id: "close_doors" },
    { label: "Exploded View", id: "exploded_view" },
    { label: "Reset", id: "reset" },
  ];

  const btnWidth = Math.max(0.4, modelHeight * 0.2);
  const btnHeight = Math.max(0.1, modelHeight * 0.05);
  const gap = btnHeight * 0.25;

  for (let i = 0; i < buttonDefs.length; i++) {
    const def = buttonDefs[i];
    const yOffset = (buttonDefs.length / 2 - i - 0.5) * (btnHeight + gap);

    const plane = MeshBuilder.CreatePlane(
      `menuBtn_${def.id}`,
      { width: btnWidth, height: btnHeight },
      scene
    );
    plane.position = menuPos.clone();
    plane.position.y += yOffset;
    plane.billboardMode = Mesh.BILLBOARDMODE_Y;
    plane.isPickable = true;
    plane.receiveShadows = false;

    const guiTexture = AdvancedDynamicTexture.CreateForMesh(
      plane,
      512,
      128,
      false
    );

    // Pill background — no border, soft shadow
    const bg = new Rectangle(`bg_${def.id}`);
    bg.width = 1;
    bg.height = 1;
    bg.cornerRadius = 64;
    bg.thickness = 0;
    bg.background = BG_REST;
    bg.shadowColor = "rgba(0, 0, 0, 0.25)";
    bg.shadowBlur = 12;
    bg.shadowOffsetY = 2;
    guiTexture.addControl(bg);

    // Label — light weight, tracked
    const text = new TextBlock(`text_${def.id}`, def.label);
    text.color = TEXT_REST;
    text.fontSize = 36;
    text.fontWeight = "500";
    text.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
    text.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    bg.addControl(text);

    // Click
    plane.actionManager = new ActionManager(scene);
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        if (onButtonCallback) onButtonCallback(def.id);
        // Subtle press feedback
        bg.background = BG_ACTIVE;
        text.color = "rgba(255, 255, 255, 1)";
        setTimeout(() => {
          bg.background = BG_REST;
          text.color = TEXT_REST;
        }, 180);
      })
    );

    // Hover
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        bg.background = BG_HOVER;
        text.color = TEXT_HOVER;
      })
    );
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        bg.background = BG_REST;
        text.color = TEXT_REST;
      })
    );

    buttons.push({ label: def.label, id: def.id, mesh: plane, bg, text });
  }

  console.log(`Floating menu created: ${buttons.length} buttons`);
}

export function showMenu(): void {
  for (const btn of buttons) {
    btn.mesh.setEnabled(true);
  }
}

export function hideMenu(): void {
  for (const btn of buttons) {
    btn.mesh.setEnabled(false);
  }
}

export function disposeMenu(): void {
  for (const btn of buttons) {
    btn.mesh.dispose();
  }
  buttons = [];
  if (menuRoot) {
    menuRoot.dispose();
    menuRoot = null;
  }
}

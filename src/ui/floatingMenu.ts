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
import { VR_PANEL } from "./panelTheme";

/**
 * Floating 3D menu fixed beside the model.
 * It mirrors the Quest controller shortcuts so the booth guide can
 * teach one interaction language across headset and menu.
 */

interface MenuButton {
  label: string;
  id: string;
  mesh: Mesh;
  bg: Rectangle;
  text: TextBlock;
}

let buttons: MenuButton[] = [];
let onButtonCallback: ((id: string) => void) | null = null;

const BG_REST = "rgba(10, 18, 30, 0.9)";
const BG_HOVER = VR_PANEL.surfaceHover;
const BG_ACTIVE = VR_PANEL.surfacePressed;
const TEXT_REST = VR_PANEL.text;
const TEXT_HOVER = VR_PANEL.text;

const BG_RESET = "rgba(18, 54, 72, 0.94)";
const BG_RESET_HOVER = "rgba(24, 72, 94, 0.98)";

export function onMenuButton(cb: (id: string) => void): void {
  onButtonCallback = cb;
}

export function createFloatingMenu(scene: Scene, modelInfo?: ModelInfo): void {
  const modelHeight = modelInfo?.height ?? 2.5;
  const modelWidth = modelInfo?.width ?? 1.0;
  const modelCenter = modelInfo?.center ?? new Vector3(0, 1.25, 0);

  const menuPos = new Vector3(
    modelCenter.x + modelWidth * 0.5 + 0.8,
    1.4,
    modelCenter.z
  );

  const buttonDefs = [
    { label: "A  Closer", id: "move_closer" },
    { label: "B  Back", id: "move_back" },
    { label: "X  Interior", id: "toggle_interior" },
    { label: "Y  Explode", id: "toggle_explode" },
    { label: "Background", id: "settings" },
    { label: "Quick Tour", id: "quick_tour" },
    { label: "Reset View", id: "reset" },
  ];

  const btnWidth = Math.max(0.45, modelHeight * 0.2);
  const btnHeight = Math.max(0.1, modelHeight * 0.05);
  const gap = btnHeight * 0.25;

  for (let i = 0; i < buttonDefs.length; i++) {
    const def = buttonDefs[i];
    const isReset =
      def.id === "reset" || def.id === "quick_tour" || def.id === "settings";
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
    plane.setEnabled(false);

    const guiTexture = AdvancedDynamicTexture.CreateForMesh(
      plane,
      512,
      128,
      false
    );

    const bg = new Rectangle(`bg_${def.id}`);
    bg.width = 1;
    bg.height = 1;
    bg.cornerRadius = 64;
    bg.thickness = isReset ? 2 : 1;
    bg.color = isReset ? VR_PANEL.borderHover : VR_PANEL.border;
    bg.background = isReset ? BG_RESET : BG_REST;
    bg.shadowColor = "rgba(0, 0, 0, 0.36)";
    bg.shadowBlur = isReset ? 18 : 14;
    bg.shadowOffsetY = 4;
    guiTexture.addControl(bg);

    const text = new TextBlock(`text_${def.id}`, def.label);
    text.color = TEXT_REST;
    text.fontSize = 34;
    text.fontWeight = isReset ? "600" : "500";
    text.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
    text.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    bg.addControl(text);

    const restBg = isReset ? BG_RESET : BG_REST;
    const hoverBg = isReset ? BG_RESET_HOVER : BG_HOVER;

    plane.actionManager = new ActionManager(scene);
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        onButtonCallback?.(def.id);
        bg.background = BG_ACTIVE;
        text.color = "rgba(255, 255, 255, 1)";
        setTimeout(() => {
          bg.background = restBg;
          text.color = TEXT_REST;
        }, 180);
      })
    );
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        bg.background = hoverBg;
        text.color = TEXT_HOVER;
      })
    );
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        bg.background = restBg;
        text.color = TEXT_REST;
      })
    );

    buttons.push({ label: def.label, id: def.id, mesh: plane, bg, text });
  }

  console.log(
    `Floating menu created: ${buttons.length} buttons (conference shortcut layout)`
  );
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
}

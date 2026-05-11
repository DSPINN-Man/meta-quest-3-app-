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
import { SKYBOX_OPTIONS } from "../utils/config";
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

interface MenuButtonDef {
  label: string;
  id: string;
}

type MenuMode = "main" | "backgrounds";

let buttons: MenuButton[] = [];
let onButtonCallback: ((id: string) => void) | null = null;
let menuMode: MenuMode = "main";

const MAIN_MENU_BUTTONS: MenuButtonDef[] = [
  { label: "A  Closer", id: "move_closer" },
  { label: "B  Back", id: "move_back" },
  { label: "X  Interior", id: "toggle_interior" },
  { label: "Y  Explode", id: "toggle_explode" },
  { label: "Backgrounds", id: "settings" },
  { label: "Reset View", id: "reset" },
];

const BACKGROUND_ACTION_LABELS = ["A", "B", "X", "Y"];

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
    modelCenter.x + modelWidth * 0.5 + 0.55,
    1.48,
    modelCenter.z - 0.7
  );

  const buttonDefs = MAIN_MENU_BUTTONS;

  const btnWidth = Math.max(0.72, modelHeight * 0.28);
  const btnHeight = Math.max(0.15, modelHeight * 0.065);
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
    bg.shadowColor = "rgba(0, 0, 0, 0.36)";
    bg.shadowOffsetY = 4;
    guiTexture.addControl(bg);

    const text = new TextBlock(`text_${def.id}`, def.label);
    text.color = TEXT_REST;
    text.fontSize = 38;
    text.fontWeight = "500";
    text.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
    text.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    bg.addControl(text);

    plane.actionManager = new ActionManager(scene);
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        const button = buttons[i];
        if (!button) return;

        onButtonCallback?.(button.id);
        button.bg.background = BG_ACTIVE;
        button.text.color = "rgba(255, 255, 255, 1)";
        setTimeout(() => {
          const current = buttons[i];
          if (current) applyButtonVisual(current);
        }, 180);
      })
    );
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        const button = buttons[i];
        if (!button) return;
        button.bg.background = getHoverBackground(button.id);
        button.text.color = TEXT_HOVER;
      })
    );
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        const button = buttons[i];
        if (button) applyButtonVisual(button);
      })
    );

    buttons.push({ label: def.label, id: def.id, mesh: plane, bg, text });
  }

  applyButtonDefs(MAIN_MENU_BUTTONS);

  console.log(
    `Floating menu created: ${buttons.length} buttons (conference shortcut layout)`
  );
}

export function showMainMenu(): void {
  menuMode = "main";
  applyButtonDefs(MAIN_MENU_BUTTONS);
}

export function showBackgroundMenu(): void {
  menuMode = "backgrounds";
  applyButtonDefs(getBackgroundMenuButtons());
  showMenu();
}

export function isBackgroundMenuOpen(): boolean {
  return menuMode === "backgrounds";
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

function getBackgroundMenuButtons(): MenuButtonDef[] {
  const options = SKYBOX_OPTIONS.slice(0, BACKGROUND_ACTION_LABELS.length);
  const backgroundButtons = options.map((option, index) => ({
    label: `${BACKGROUND_ACTION_LABELS[index]}  ${option.label}`,
    id: `skybox:${option.id}`,
  }));

  return [
    ...backgroundButtons,
    { label: "Back", id: "background_back" },
    { label: "Reset View", id: "reset" },
  ];
}

function applyButtonDefs(defs: MenuButtonDef[]): void {
  for (let i = 0; i < buttons.length; i++) {
    const def = defs[i] ?? { label: "", id: "disabled" };
    const button = buttons[i];
    button.label = def.label;
    button.id = def.id;
    button.text.text = def.label;
    button.text.fontSize = def.label.length > 21 ? 30 : 38;
    applyButtonVisual(button);
  }
}

function applyButtonVisual(button: MenuButton): void {
  const emphasis = isEmphasisButton(button.id);
  button.bg.thickness = emphasis ? 2 : 1;
  button.bg.color = emphasis ? VR_PANEL.borderHover : VR_PANEL.border;
  button.bg.background = emphasis ? BG_RESET : BG_REST;
  button.bg.shadowBlur = emphasis ? 18 : 14;
  button.text.color = TEXT_REST;
  button.text.fontWeight = emphasis ? "600" : "500";
}

function getHoverBackground(id: string): string {
  return isEmphasisButton(id) ? BG_RESET_HOVER : BG_HOVER;
}

function isEmphasisButton(id: string): boolean {
  return (
    id === "reset" ||
    id === "settings" ||
    id === "background_back" ||
    id.startsWith("skybox:")
  );
}

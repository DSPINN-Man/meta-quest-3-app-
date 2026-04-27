import {
  Scene,
  Mesh,
  MeshBuilder,
  ActionManager,
  ExecuteCodeAction,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  StackPanel,
  Control,
} from "@babylonjs/gui";
import { getXR } from "../interactions/xrSetup";
import { SKYBOX_OPTIONS } from "../utils/config";

/**
 * VR choice screen — shown on VR enter before the experience begins.
 * User picks:
 *   1. Experience mode: Quick Tour or Full Experience
 *   2. Background environment
 *
 * Results are returned via a Promise so main.ts can act on the choices.
 */

export interface VRChoices {
  mode: "quick" | "full";
  skyboxId: string;
}

let choiceMeshes: Mesh[] = [];

export function showVRChoiceScreen(scene: Scene): Promise<VRChoices> {
  return new Promise((resolve) => {
    const choices: VRChoices = { mode: "full", skyboxId: "dark_studio" };

    // ── Panel 1: Experience Mode ─────────────────────────
    const modePanel = createChoicePanel(
      scene,
      "choiceMode",
      { width: 1.6, height: 0.7 },
      0.35,
      -1.4
    );

    const modeTex = AdvancedDynamicTexture.CreateForMesh(modePanel, 800, 350);

    const modeBg = createCardBg();
    modeTex.addControl(modeBg);

    const modeStack = new StackPanel("modeStack");
    modeStack.isVertical = true;
    modeStack.paddingTopInPixels = 24;
    modeStack.paddingLeftInPixels = 36;
    modeStack.paddingRightInPixels = 36;
    modeBg.addControl(modeStack);

    addText(modeStack, "Choose Your Experience", 30, "700", "rgba(255,255,255,0.95)", "40px");

    // Quick Tour button
    const quickBtn = createButtonRow(
      scene, modePanel, modeTex, modeBg,
      "quickTour",
      "Quick Tour  (2 min)",
      "Auto-guided highlights — sit back and watch",
      0.18
    );
    quickBtn.onPickTrigger(() => {
      choices.mode = "quick";
      cleanup();
      resolve(choices);
    });

    // Full Experience button
    const fullBtn = createButtonRow(
      scene, modePanel, modeTex, modeBg,
      "fullExp",
      "Full Experience",
      "Free exploration with guided controls",
      -0.08
    );
    fullBtn.onPickTrigger(() => {
      choices.mode = "full";
      cleanup();
      resolve(choices);
    });

    choiceMeshes.push(modePanel);

    function cleanup() {
      for (const m of choiceMeshes) {
        m.dispose();
      }
      choiceMeshes = [];
    }
  });
}

function createChoicePanel(
  scene: Scene,
  name: string,
  size: { width: number; height: number },
  yOffset: number,
  zOffset: number
): Mesh {
  const mesh = MeshBuilder.CreatePlane(name, size, scene);
  mesh.isPickable = true;

  const xr = getXR();
  const xrCamera = xr?.baseExperience.camera;
  if (xrCamera) {
    mesh.parent = xrCamera;
    mesh.position.set(0, yOffset, zOffset);
    mesh.rotation.set(0, 0, 0);
  } else {
    mesh.position.set(0, 1.6 + yOffset, zOffset);
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  }

  return mesh;
}

function createCardBg(): Rectangle {
  const bg = new Rectangle("choiceBg");
  bg.width = 1;
  bg.height = 1;
  bg.cornerRadius = 24;
  bg.thickness = 0;
  bg.background = "rgb(10, 14, 22)";
  bg.shadowColor = "rgba(0,0,0,0.5)";
  bg.shadowBlur = 28;
  bg.shadowOffsetY = 6;
  return bg;
}

function addText(
  parent: StackPanel,
  text: string,
  fontSize: number,
  fontWeight: string,
  color: string,
  height: string
): void {
  const tb = new TextBlock("", text);
  tb.color = color;
  tb.fontSize = fontSize;
  tb.fontWeight = fontWeight;
  tb.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
  tb.height = height;
  tb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  parent.addControl(tb);
}

interface PickableButton {
  onPickTrigger: (cb: () => void) => void;
}

function createButtonRow(
  scene: Scene,
  _parentMesh: Mesh,
  _texture: AdvancedDynamicTexture,
  parentBg: Rectangle,
  id: string,
  label: string,
  subtitle: string,
  yPos: number
): PickableButton {
  const row = new Rectangle(`row_${id}`);
  row.width = "90%";
  row.height = "80px";
  row.cornerRadius = 16;
  row.thickness = 1;
  row.color = "rgba(100, 180, 220, 0.3)";
  row.background = "rgba(30, 40, 55, 0.6)";
  row.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  row.topInPixels = yPos * 350;
  row.isPointerBlocker = true;
  parentBg.addControl(row);

  const labelTb = new TextBlock(`label_${id}`, label);
  labelTb.color = "rgba(255,255,255,0.92)";
  labelTb.fontSize = 22;
  labelTb.fontWeight = "600";
  labelTb.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
  labelTb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  labelTb.paddingLeftInPixels = 24;
  labelTb.topInPixels = -10;
  row.addControl(labelTb);

  const subTb = new TextBlock(`sub_${id}`, subtitle);
  subTb.color = "rgba(170, 180, 195, 0.65)";
  subTb.fontSize = 15;
  subTb.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
  subTb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  subTb.paddingLeftInPixels = 24;
  subTb.topInPixels = 16;
  row.addControl(subTb);

  let callback: (() => void) | null = null;

  row.onPointerClickObservable.add(() => {
    if (callback) callback();
  });

  return {
    onPickTrigger: (cb: () => void) => {
      callback = cb;
    },
  };
}

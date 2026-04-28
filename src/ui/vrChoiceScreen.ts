import {
  Scene,
  Mesh,
  MeshBuilder,
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
 *
 * Two sequential pickers:
 *   1. Experience mode — Quick Tour or Full Experience
 *   2. Background environment — one of SKYBOX_OPTIONS
 *
 * Resolves once both choices are made, so main.ts can branch on `mode`
 * and apply `skyboxId` via setSkybox().
 */

export interface VRChoices {
  mode: "quick" | "full";
  skyboxId: string;
}

let activeMeshes: Mesh[] = [];

export function showVRChoiceScreen(scene: Scene): Promise<VRChoices> {
  return new Promise((resolve) => {
    const choices: VRChoices = { mode: "full", skyboxId: "dark_studio" };

    showModePicker(scene, (mode) => {
      choices.mode = mode;
      disposeActive();
      showSkyboxPicker(scene, (skyboxId) => {
        choices.skyboxId = skyboxId;
        disposeActive();
        resolve(choices);
      });
    });
  });
}

/**
 * Show ONLY the background picker — used for the in-VR settings menu
 * so visitors can change the skybox mid-session without restarting.
 * Resolves with the chosen skyboxId.
 */
export function showSkyboxPickerOnly(scene: Scene): Promise<string> {
  return new Promise((resolve) => {
    showSkyboxPicker(scene, (skyboxId) => {
      disposeActive();
      resolve(skyboxId);
    });
  });
}

// ── Step 1: Mode picker ─────────────────────────────────────────

function showModePicker(
  scene: Scene,
  onPicked: (mode: "quick" | "full") => void
): void {
  const panel = createChoicePanel(scene, "choiceMode", { width: 1.6, height: 0.9 }, 0.0, -1.6);
  const tex = AdvancedDynamicTexture.CreateForMesh(panel, 800, 450);

  const bg = createCardBg();
  tex.addControl(bg);

  addTitle(bg, "Choose Your Experience");

  // Two button rows, one above the other
  createButtonRow(
    bg,
    "quickTour",
    "Quick Tour  (2 min)",
    "Auto-guided highlights — sit back and watch",
    -50,
    () => onPicked("quick")
  );
  createButtonRow(
    bg,
    "fullExp",
    "Full Experience",
    "Free exploration with guided controls",
    50,
    () => onPicked("full")
  );

  activeMeshes.push(panel);
}

// ── Step 2: Skybox picker ───────────────────────────────────────

function showSkyboxPicker(scene: Scene, onPicked: (skyboxId: string) => void): void {
  const count = SKYBOX_OPTIONS.length;
  // Make the panel taller so all 4 options fit comfortably
  const panel = createChoicePanel(scene, "choiceSkybox", { width: 1.7, height: 1.1 }, 0.0, -1.6);
  const tex = AdvancedDynamicTexture.CreateForMesh(panel, 850, 550);

  const bg = createCardBg();
  tex.addControl(bg);

  addTitle(bg, "Choose The Environment");

  // Distribute the rows below the title.
  const rowSpacing = 88;
  const startY = -((count - 1) / 2) * rowSpacing + 30;

  for (let i = 0; i < count; i++) {
    const opt = SKYBOX_OPTIONS[i];
    const subtitle = opt.file ? "Photographic 360° backdrop" : "Solid studio backdrop";
    createButtonRow(
      bg,
      `sky_${opt.id}`,
      opt.label,
      subtitle,
      startY + i * rowSpacing,
      () => onPicked(opt.id)
    );
  }

  activeMeshes.push(panel);
}

// ── Shared building blocks ──────────────────────────────────────

function disposeActive(): void {
  for (const m of activeMeshes) {
    m.dispose();
  }
  activeMeshes = [];
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

function addTitle(parent: Rectangle, title: string): void {
  const tb = new TextBlock("choiceTitle", title);
  tb.color = "rgba(255,255,255,0.95)";
  tb.fontSize = 30;
  tb.fontWeight = "700";
  tb.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
  tb.height = "60px";
  tb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  tb.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  tb.paddingTopInPixels = 24;
  parent.addControl(tb);
}

function createButtonRow(
  parentBg: Rectangle,
  id: string,
  label: string,
  subtitle: string,
  topPx: number,
  onClick: () => void
): void {
  const row = new Rectangle(`row_${id}`);
  row.width = "88%";
  row.height = "76px";
  row.cornerRadius = 16;
  row.thickness = 1;
  row.color = "rgba(100, 180, 220, 0.3)";
  row.background = "rgba(30, 40, 55, 0.6)";
  row.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  row.topInPixels = topPx;
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
  subTb.color = "rgba(170, 180, 195, 0.7)";
  subTb.fontSize = 15;
  subTb.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
  subTb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  subTb.paddingLeftInPixels = 24;
  subTb.topInPixels = 16;
  row.addControl(subTb);

  // Hover feedback so the user can tell their controller ray is on the row
  row.onPointerEnterObservable.add(() => {
    row.background = "rgba(45, 65, 90, 0.85)";
    row.color = "rgba(120, 200, 240, 0.55)";
  });
  row.onPointerOutObservable.add(() => {
    row.background = "rgba(30, 40, 55, 0.6)";
    row.color = "rgba(100, 180, 220, 0.3)";
  });

  row.onPointerClickObservable.add(() => {
    onClick();
  });
}

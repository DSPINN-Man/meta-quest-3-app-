import {
  Scene,
  Mesh,
  MeshBuilder,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Control,
} from "@babylonjs/gui";
import { getXR } from "../interactions/xrSetup";
import { SKYBOX_OPTIONS } from "../utils/config";
import { PANEL, styleBody, styleButton, stylePanel, styleTitle } from "./panelTheme";

export interface VRChoices {
  mode: "quick" | "full";
  skyboxId: string;
}

let activeMeshes: Mesh[] = [];

export function showVRChoiceScreen(scene: Scene): Promise<VRChoices> {
  return new Promise((resolve) => {
    const choices: VRChoices = { mode: "full", skyboxId: "plant_room" };

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

export function showSkyboxPickerOnly(scene: Scene): Promise<string> {
  return new Promise((resolve) => {
    showSkyboxPicker(scene, (skyboxId) => {
      disposeActive();
      resolve(skyboxId);
    });
  });
}

function showModePicker(
  scene: Scene,
  onPicked: (mode: "quick" | "full") => void
): void {
  const panel = createChoicePanel(scene, "choiceMode", { width: 1.48, height: 0.62 }, 0.0, -1.6);
  const tex = AdvancedDynamicTexture.CreateForMesh(panel, 980, 412);

  const bg = createCardBg();
  tex.addControl(bg);

  addTitle(bg, "Choose experience");

  createButtonRow(
    bg,
    "quickTour",
    "Quick Tour",
    "Guided highlights",
    -34,
    () => onPicked("quick")
  );
  createButtonRow(
    bg,
    "fullExp",
    "Free Explore",
    "Move, open, inspect",
    42,
    () => onPicked("full")
  );

  activeMeshes.push(panel);
}

function showSkyboxPicker(scene: Scene, onPicked: (skyboxId: string) => void): void {
  const count = SKYBOX_OPTIONS.length;
  const panel = createChoicePanel(scene, "choiceSkybox", { width: 1.48, height: 0.78 }, 0.0, -1.6);
  const tex = AdvancedDynamicTexture.CreateForMesh(panel, 980, 516);

  const bg = createCardBg();
  tex.addControl(bg);

  addTitle(bg, "Choose background");

  const rowSpacing = 74;
  const startY = -((count - 1) / 2) * rowSpacing + 34;

  for (let i = 0; i < count; i++) {
    const opt = SKYBOX_OPTIONS[i];
    createButtonRow(
      bg,
      `sky_${opt.id}`,
      opt.label,
      opt.file ? "4K environment" : "Studio background",
      startY + i * rowSpacing,
      () => onPicked(opt.id)
    );
  }

  activeMeshes.push(panel);
}

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
  stylePanel(bg);
  return bg;
}

function addTitle(parent: Rectangle, title: string): void {
  const tb = new TextBlock("choiceTitle", title);
  styleTitle(tb, 28);
  tb.height = "52px";
  tb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  tb.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  tb.paddingTopInPixels = 20;
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
  row.height = "58px";
  styleButton(row);
  row.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  row.topInPixels = topPx;
  row.isPointerBlocker = true;
  parentBg.addControl(row);

  const labelTb = new TextBlock(`label_${id}`, label);
  styleTitle(labelTb, 19);
  labelTb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  labelTb.paddingLeftInPixels = 20;
  labelTb.topInPixels = -8;
  row.addControl(labelTb);

  const subTb = new TextBlock(`sub_${id}`, subtitle);
  styleBody(subTb, 13);
  subTb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  subTb.paddingLeftInPixels = 20;
  subTb.topInPixels = 14;
  row.addControl(subTb);

  row.onPointerEnterObservable.add(() => {
    row.background = PANEL.surfaceHover;
    row.color = PANEL.borderHover;
  });
  row.onPointerOutObservable.add(() => {
    styleButton(row);
  });

  row.onPointerClickObservable.add(() => {
    row.background = PANEL.surfacePressed;
    onClick();
  });
}

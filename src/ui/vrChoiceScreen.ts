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
import {
  VR_PANEL,
  styleVRBody,
  styleVRButton,
  styleVRPanel,
  styleVRTitle,
} from "./panelTheme";

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

export function showSkyboxPickerOnly(scene: Scene): Promise<string | null> {
  return new Promise((resolve) => {
    disposeActive();
    showSkyboxPicker(scene, (skyboxId) => {
      disposeActive();
      resolve(skyboxId === "__cancel__" ? null : skyboxId);
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
  const panel = createChoicePanel(scene, "choiceSkybox", { width: 1.82, height: 1.05 }, 0.0, -1.28);
  const tex = AdvancedDynamicTexture.CreateForMesh(panel, 1280, 740);

  const bg = createCardBg();
  tex.addControl(bg);

  addTitle(bg, "Choose background");

  const rowSpacing = 82;
  const startY = -((count - 1) / 2) * rowSpacing + 22;

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

  createButtonRow(
    bg,
    "sky_cancel",
    "Close",
    "Keep current background",
    startY + count * rowSpacing,
    () => onPicked("__cancel__")
  );

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
  styleVRPanel(bg, 20, 20);
  return bg;
}

function addTitle(parent: Rectangle, title: string): void {
  const tb = new TextBlock("choiceTitle", title);
  styleVRTitle(tb, 32);
  tb.height = "64px";
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
  row.height = "66px";
  styleVRButton(row);
  row.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  row.topInPixels = topPx;
  row.isPointerBlocker = true;
  parentBg.addControl(row);

  const labelTb = new TextBlock(`label_${id}`, label);
  styleVRTitle(labelTb, 22);
  labelTb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  labelTb.paddingLeftInPixels = 20;
  labelTb.topInPixels = -8;
  row.addControl(labelTb);

  const subTb = new TextBlock(`sub_${id}`, subtitle);
  styleVRBody(subTb, 15);
  subTb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  subTb.paddingLeftInPixels = 20;
  subTb.topInPixels = 14;
  row.addControl(subTb);

  row.onPointerEnterObservable.add(() => {
    row.background = VR_PANEL.surfaceHover;
    row.color = VR_PANEL.borderHover;
  });
  row.onPointerOutObservable.add(() => {
    styleVRButton(row);
  });

  row.onPointerClickObservable.add(() => {
    row.background = VR_PANEL.surfacePressed;
    onClick();
  });
}

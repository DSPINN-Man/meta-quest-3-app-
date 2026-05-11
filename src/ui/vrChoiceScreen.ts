import {
  ActionManager,
  ExecuteCodeAction,
  Mesh,
  MeshBuilder,
  Scene,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Control,
  Rectangle,
  TextBlock,
} from "@babylonjs/gui";
import { getXR, type XRButtonAction } from "../interactions/xrSetup";
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

type SkyboxPick = string | null;

const ACTION_LABELS: Partial<Record<XRButtonAction, string>> = {
  move_closer: "A",
  move_back: "B",
  toggle_interior: "X",
  toggle_explode: "Y",
};

const ACTION_ORDER: XRButtonAction[] = [
  "move_closer",
  "move_back",
  "toggle_interior",
  "toggle_explode",
];

let activeMeshes: Mesh[] = [];
let activePickerResolve: ((value: SkyboxPick) => void) | null = null;
let activeActionMap = new Map<XRButtonAction, SkyboxPick>();

export function showVRChoiceScreen(scene: Scene): Promise<VRChoices> {
  return new Promise((resolve) => {
    showSkyboxPickerOnly(scene).then((skyboxId) => {
      resolve({ mode: "full", skyboxId: skyboxId ?? "enspec_theme" });
    });
  });
}

export function showSkyboxPickerOnly(scene: Scene): Promise<SkyboxPick> {
  disposeActive();

  return new Promise((resolve) => {
    activePickerResolve = resolve;
    activeActionMap = new Map();
    showSkyboxPicker(scene);
  });
}

export function handleSkyboxPickerAction(action: XRButtonAction): boolean {
  if (!activePickerResolve) return false;

  if (action === "reset_view") {
    resolvePicker(null);
    return true;
  }

  if (!activeActionMap.has(action)) return true;
  resolvePicker(activeActionMap.get(action) ?? null);
  return true;
}

function showSkyboxPicker(scene: Scene): void {
  const options = SKYBOX_OPTIONS.slice(0, ACTION_ORDER.length);
  const panel = createPlane(scene, "choiceSkyboxPanel", 1.98, 1.12, 0, 0, -1.2);
  panel.isPickable = false;
  const panelTex = AdvancedDynamicTexture.CreateForMesh(panel, 1320, 748);
  const panelBg = new Rectangle("choiceSkyboxBg");
  panelBg.width = 1;
  panelBg.height = 1;
  styleVRPanel(panelBg, 20, 20);
  panelTex.addControl(panelBg);
  activeMeshes.push(panel);

  const title = createTextPlane(scene, "choiceSkyboxTitle", 1.74, 0.14, 0, 0.42, -1.19);
  const titleTex = AdvancedDynamicTexture.CreateForMesh(title, 1100, 120);
  const titleText = new TextBlock("choiceSkyboxTitleText", "Choose background");
  styleVRTitle(titleText, 34);
  titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  titleTex.addControl(titleText);
  activeMeshes.push(title);

  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const action = ACTION_ORDER[i];
    const label = ACTION_LABELS[action] ?? "";
    activeActionMap.set(action, option.id);

    const y = 0.22 - i * 0.18;
    createPickButton(
      scene,
      `skyboxButton_${option.id}`,
      `${label}  ${option.label}`,
      option.file ? "environment scene" : "ENSPEC theme",
      y,
      () => resolvePicker(option.id)
    );
  }

  createPickButton(
    scene,
    "skyboxButton_close",
    "Grip  Close",
    "keep current background",
    -0.52,
    () => resolvePicker(null)
  );
}

function createPickButton(
  scene: Scene,
  name: string,
  label: string,
  subtitle: string,
  y: number,
  onPick: () => void
): void {
  const mesh = createPlane(scene, name, 1.58, 0.13, 0, y, -1.18);
  mesh.isPickable = true;
  mesh.actionManager = new ActionManager(scene);
  mesh.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPickTrigger, onPick)
  );

  const tex = AdvancedDynamicTexture.CreateForMesh(mesh, 1000, 120);
  const bg = new Rectangle(`${name}_bg`);
  bg.width = 1;
  bg.height = 1;
  styleVRButton(bg);
  tex.addControl(bg);

  const labelText = new TextBlock(`${name}_label`, label);
  styleVRTitle(labelText, 23);
  labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  labelText.paddingLeftInPixels = 34;
  labelText.topInPixels = -12;
  bg.addControl(labelText);

  const subText = new TextBlock(`${name}_subtitle`, subtitle);
  styleVRBody(subText, 15);
  subText.color = VR_PANEL.faint;
  subText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  subText.paddingLeftInPixels = 34;
  subText.topInPixels = 20;
  bg.addControl(subText);

  mesh.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
      bg.background = VR_PANEL.surfaceHover;
      bg.color = VR_PANEL.borderHover;
    })
  );
  mesh.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
      styleVRButton(bg);
    })
  );

  activeMeshes.push(mesh);
}

function createTextPlane(
  scene: Scene,
  name: string,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number
): Mesh {
  const mesh = createPlane(scene, name, width, height, x, y, z);
  mesh.isPickable = false;
  return mesh;
}

function createPlane(
  scene: Scene,
  name: string,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number
): Mesh {
  const mesh = MeshBuilder.CreatePlane(name, { width, height }, scene);
  const xrCamera = getXR()?.baseExperience.camera;
  if (xrCamera) {
    mesh.parent = xrCamera;
    mesh.position.set(x, y, z);
    mesh.rotation.set(0, 0, 0);
  } else {
    mesh.position.set(x, 1.6 + y, z);
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  }
  return mesh;
}

function resolvePicker(value: SkyboxPick): void {
  const resolve = activePickerResolve;
  if (!resolve) return;

  activePickerResolve = null;
  activeActionMap.clear();
  disposeActive();
  resolve(value);
}

function disposeActive(): void {
  for (const mesh of activeMeshes) {
    mesh.dispose();
  }
  activeMeshes = [];
}

import {
  ActionManager,
  ExecuteCodeAction,
  Mesh,
  MeshBuilder,
  Scene,
  Vector3,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Control,
  Rectangle,
  StackPanel,
  TextBlock,
} from "@babylonjs/gui";
import { HotspotData } from "../utils/config";
import {
  VR_PANEL,
  styleVRBody,
  styleVRPanel,
  styleVRTitle,
} from "./panelTheme";

let panelMesh: Mesh | null = null;
let panelTexture: AdvancedDynamicTexture | null = null;
let currentHotspotId: string | null = null;

const PANEL_WIDTH = 1.08;
const PANEL_HEIGHT = 0.28;
const TEX_WIDTH = 900;
const TEX_HEIGHT = 260;

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

  panelMesh = MeshBuilder.CreatePlane(
    "infoPanel",
    { width: PANEL_WIDTH, height: PANEL_HEIGHT },
    scene
  );
  panelMesh.position = worldPos.clone().add(new Vector3(0.4, 0.24, 0));
  panelMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  panelMesh.isPickable = true;
  panelMesh.receiveShadows = false;
  panelMesh.actionManager = new ActionManager(scene);
  panelMesh.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPickTrigger, closeInfoPanel)
  );

  panelTexture = AdvancedDynamicTexture.CreateForMesh(
    panelMesh,
    TEX_WIDTH,
    TEX_HEIGHT
  );

  const bg = new Rectangle("infoBg");
  bg.width = 1;
  bg.height = 1;
  styleVRPanel(bg, 18, 18);
  panelTexture.addControl(bg);

  const stack = new StackPanel("infoStack");
  stack.isVertical = true;
  stack.paddingTopInPixels = 44;
  stack.paddingLeftInPixels = 42;
  stack.paddingRightInPixels = 42;
  stack.paddingBottomInPixels = 28;
  stack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  stack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  bg.addControl(stack);

  const title = new TextBlock("infoTitle", data.title);
  styleVRTitle(title, 34);
  title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  title.textWrapping = true;
  title.height = "72px";
  title.resizeToFit = false;
  stack.addControl(title);

  const line = new Rectangle("infoLine");
  line.width = "90px";
  line.height = "2px";
  line.background = VR_PANEL.accent;
  line.thickness = 0;
  line.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  line.paddingTopInPixels = 8;
  line.paddingBottomInPixels = 8;
  stack.addControl(line);

  const hint = new TextBlock("infoHint", "tap card to close");
  styleVRBody(hint, 16);
  hint.color = VR_PANEL.faint;
  hint.height = "34px";
  hint.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  stack.addControl(hint);

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

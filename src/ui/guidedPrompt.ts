import { Scene, Mesh, MeshBuilder } from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  StackPanel,
  Control,
} from "@babylonjs/gui";
import { getXR } from "../interactions/xrSetup";

/**
 * A simple stage prompt that sits in front of the visitor during the guided demo.
 * The mesh is kept PARENTED to the XR camera so it always tracks the viewer —
 * any scene changes behind it (revealing the interior, exploding, etc) never
 * affect its readability.
 */

let promptMesh: Mesh | null = null;
let promptTexture: AdvancedDynamicTexture | null = null;
let titleBlock: TextBlock | null = null;
let bodyBlock: TextBlock | null = null;
let footerBlock: TextBlock | null = null;

/** Fixed offset from the XR camera / viewer. */
const VIEWER_Z_OFFSET = -1.08;
const VIEWER_Y_OFFSET = 0.2;

export function initGuidedPrompt(scene: Scene): void {
  if (promptMesh || promptTexture) return;

  promptMesh = MeshBuilder.CreatePlane(
    "guidedPromptPlane",
    { width: 1.55, height: 0.72 },
    scene
  );
  promptMesh.isPickable = false;
  promptMesh.setEnabled(false);
  attachToViewer(promptMesh);

  promptTexture = AdvancedDynamicTexture.CreateForMesh(promptMesh, 1024, 480);

  const bg = new Rectangle("guidedPromptBg");
  bg.width = 1;
  bg.height = 1;
  bg.cornerRadius = 28;
  bg.thickness = 2;
  bg.color = "rgba(0, 180, 220, 0.65)";
  // Fully opaque so scene content behind (bright interior, exploded parts)
  // never bleeds through and makes text unreadable.
  bg.background = "rgb(6, 10, 18)";
  bg.shadowColor = "rgba(0, 0, 0, 0.55)";
  bg.shadowBlur = 28;
  bg.shadowOffsetY = 6;
  promptTexture.addControl(bg);

  const stack = new StackPanel("guidedPromptStack");
  stack.isVertical = true;
  stack.paddingTopInPixels = 30;
  stack.paddingLeftInPixels = 44;
  stack.paddingRightInPixels = 44;
  stack.paddingBottomInPixels = 22;
  bg.addControl(stack);

  titleBlock = new TextBlock("guidedPromptTitle", "");
  titleBlock.color = "rgba(255, 255, 255, 1)";
  titleBlock.fontSize = 38;
  titleBlock.fontWeight = "700";
  titleBlock.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
  titleBlock.height = "56px";
  titleBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  stack.addControl(titleBlock);

  bodyBlock = new TextBlock("guidedPromptBody", "");
  bodyBlock.color = "rgba(225, 232, 240, 1)";
  bodyBlock.fontSize = 24;
  bodyBlock.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
  bodyBlock.textWrapping = true;
  bodyBlock.lineSpacing = "6px";
  bodyBlock.height = "180px";
  bodyBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  stack.addControl(bodyBlock);

  footerBlock = new TextBlock("guidedPromptFooter", "");
  footerBlock.color = "rgba(130, 220, 255, 1)";
  footerBlock.fontSize = 20;
  footerBlock.fontWeight = "600";
  footerBlock.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
  footerBlock.height = "42px";
  footerBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  stack.addControl(footerBlock);
}

/**
 * Re-attach the prompt to the (now available) XR camera.
 * Call this after the VR session has begun — the mesh may have
 * been created before XR was ready.
 */
export function reparentGuidedPromptToXR(): void {
  if (!promptMesh) return;
  attachToViewer(promptMesh);
}

export function showGuidedPrompt(
  title: string,
  body: string,
  footer = ""
): void {
  if (!promptMesh || !titleBlock || !bodyBlock || !footerBlock) return;
  titleBlock.text = title;
  bodyBlock.text = body;
  footerBlock.text = footer;
  // Make absolutely sure we're tracking the viewer whenever we go visible.
  attachToViewer(promptMesh);
  promptMesh.setEnabled(true);
}

export function hideGuidedPrompt(): void {
  if (!promptMesh) return;
  promptMesh.setEnabled(false);
}

/** Show the controls help card — dismissed by any button press */
export function showHelpCard(): void {
  showGuidedPrompt(
    "Controls",
    "A — Move closer\n" +
    "B — Step back / close info\n" +
    "X — Reveal interior\n" +
    "Y — Exploded view\n" +
    "Right stick — Move around\n" +
    "Left stick — Spin model\n" +
    "Trigger — Click / interact\n" +
    "Grip — Reset view",
    "Press any button to dismiss"
  );
}

export function isGuidedPromptVisible(): boolean {
  return promptMesh?.isEnabled() ?? false;
}

function attachToViewer(mesh: Mesh): void {
  const xrCamera = getXR()?.baseExperience.camera;
  if (xrCamera) {
    mesh.parent = xrCamera;
    mesh.position.set(0, VIEWER_Y_OFFSET, VIEWER_Z_OFFSET);
    mesh.rotation.set(0, 0, 0);
    mesh.billboardMode = Mesh.BILLBOARDMODE_NONE;
    return;
  }

  mesh.parent = null;
  mesh.position.set(0, 1.6 + VIEWER_Y_OFFSET, VIEWER_Z_OFFSET);
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
}

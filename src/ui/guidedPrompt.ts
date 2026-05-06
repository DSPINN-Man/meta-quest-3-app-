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
 * Minimal prompt card that follows the XR camera during guided moments.
 * Keep this quiet and compact so it supports the model instead of taking over.
 */

let promptMesh: Mesh | null = null;
let promptTexture: AdvancedDynamicTexture | null = null;
let titleBlock: TextBlock | null = null;
let bodyBlock: TextBlock | null = null;
let footerBlock: TextBlock | null = null;

const VIEWER_Z_OFFSET = -1.75;
const VIEWER_Y_OFFSET = -0.08;

export function initGuidedPrompt(scene: Scene): void {
  if (promptMesh || promptTexture) return;

  promptMesh = MeshBuilder.CreatePlane(
    "guidedPromptPlane",
    { width: 1.86, height: 0.94 },
    scene
  );
  promptMesh.isPickable = false;
  promptMesh.setEnabled(false);
  attachToViewer(promptMesh);

  promptTexture = AdvancedDynamicTexture.CreateForMesh(promptMesh, 1240, 628);

  const bg = new Rectangle("guidedPromptBg");
  bg.width = 1;
  bg.height = 1;
  bg.cornerRadius = 18;
  bg.thickness = 1;
  bg.color = "rgba(32, 36, 40, 0.22)";
  bg.background = "rgba(246, 244, 238, 0.96)";
  bg.shadowColor = "rgba(0, 0, 0, 0.24)";
  bg.shadowBlur = 18;
  bg.shadowOffsetY = 4;
  promptTexture.addControl(bg);

  const stack = new StackPanel("guidedPromptStack");
  stack.isVertical = true;
  stack.paddingTopInPixels = 34;
  stack.paddingLeftInPixels = 42;
  stack.paddingRightInPixels = 42;
  stack.paddingBottomInPixels = 26;
  bg.addControl(stack);

  titleBlock = new TextBlock("guidedPromptTitle", "");
  titleBlock.color = "rgba(26, 28, 30, 1)";
  titleBlock.fontSize = 31;
  titleBlock.fontWeight = "650";
  titleBlock.fontFamily = "system-ui, -apple-system, 'SF Pro Display', sans-serif";
  titleBlock.height = "48px";
  titleBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  stack.addControl(titleBlock);

  bodyBlock = new TextBlock("guidedPromptBody", "");
  bodyBlock.color = "rgba(55, 58, 60, 1)";
  bodyBlock.fontSize = 18;
  bodyBlock.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
  bodyBlock.textWrapping = true;
  bodyBlock.lineSpacing = "5px";
  bodyBlock.height = "404px";
  bodyBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  stack.addControl(bodyBlock);

  footerBlock = new TextBlock("guidedPromptFooter", "");
  footerBlock.color = "rgba(94, 86, 68, 1)";
  footerBlock.fontSize = 16;
  footerBlock.fontWeight = "600";
  footerBlock.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
  footerBlock.height = "34px";
  footerBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  stack.addControl(footerBlock);
}

export function reparentGuidedPromptToXR(): void {
  if (!promptMesh) return;
  attachToViewer(promptMesh);
}

export function showGuidedPrompt(
  title: string,
  body: string,
  footer = ""
): void {
  if (!promptMesh || !titleBlock || !bodyBlock || !footerBlock) {
    console.error("showGuidedPrompt: mesh or text blocks not initialized!");
    return;
  }
  titleBlock.text = title;
  bodyBlock.text = body;
  footerBlock.text = footer;
  attachToViewer(promptMesh);
  promptMesh.setEnabled(true);
  console.log(
    `showGuidedPrompt: "${title}" parent=${promptMesh.parent?.name ?? "none"}, enabled=${promptMesh.isEnabled()}`
  );
}

export function hideGuidedPrompt(): void {
  if (!promptMesh) return;
  promptMesh.setEnabled(false);
}

export function showHelpCard(): void {
  showGuidedPrompt(
    "Controller reference",
    "LEFT CONTROLLER\n" +
    "   X  =  See inside\n" +
    "   Y  =  Exploded view\n" +
    "   Stick  =  Spin model\n" +
    "\n" +
    "RIGHT CONTROLLER\n" +
    "   A  =  Step closer\n" +
    "   B  =  Step back\n" +
    "   Grip  =  Reset\n" +
    "   Stick  =  Walk around\n" +
    "\n" +
    "Trigger = click dots and buttons\n" +
    "Hold any button for 3s to reopen this",
    "Press any button"
  );
}

export function isGuidedPromptVisible(): boolean {
  return promptMesh?.isEnabled() ?? false;
}

export function showSuccessFeedback(message: string = "Got it"): void {
  if (!promptMesh || !titleBlock) return;
  if (!promptMesh.isEnabled()) return;

  const originalTitle = titleBlock.text;
  const originalTitleColor = titleBlock.color;

  titleBlock.text = message;
  titleBlock.color = "rgba(48, 118, 88, 1)";

  setTimeout(() => {
    if (titleBlock && titleBlock.text === message) {
      titleBlock.text = originalTitle;
      titleBlock.color = originalTitleColor;
    }
  }, 700);
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

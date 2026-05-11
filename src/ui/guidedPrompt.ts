import { Scene, Mesh, MeshBuilder } from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  StackPanel,
  Control,
} from "@babylonjs/gui";
import { getXR } from "../interactions/xrSetup";
import {
  VR_PANEL,
  styleVRBody,
  styleVRFooter,
  styleVRPanel,
  styleVRTitle,
} from "./panelTheme";

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
const VIEWER_Y_OFFSET = -0.04;

export function initGuidedPrompt(scene: Scene): void {
  if (promptMesh || promptTexture) return;

  promptMesh = MeshBuilder.CreatePlane(
    "guidedPromptPlane",
    { width: 1.78, height: 0.78 },
    scene
  );
  promptMesh.isPickable = false;
  promptMesh.setEnabled(false);
  attachToViewer(promptMesh);

  promptTexture = AdvancedDynamicTexture.CreateForMesh(promptMesh, 1320, 580);

  const bg = new Rectangle("guidedPromptBg");
  bg.width = 1;
  bg.height = 1;
  styleVRPanel(bg, 20, 18);
  promptTexture.addControl(bg);

  const stack = new StackPanel("guidedPromptStack");
  stack.isVertical = true;
  stack.paddingTopInPixels = 34;
  stack.paddingLeftInPixels = 44;
  stack.paddingRightInPixels = 44;
  stack.paddingBottomInPixels = 28;
  bg.addControl(stack);

  titleBlock = new TextBlock("guidedPromptTitle", "");
  styleVRTitle(titleBlock, 30);
  titleBlock.height = "46px";
  titleBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  stack.addControl(titleBlock);

  bodyBlock = new TextBlock("guidedPromptBody", "");
  styleVRBody(bodyBlock, 20);
  bodyBlock.textWrapping = true;
  bodyBlock.lineSpacing = "6px";
  bodyBlock.height = "340px";
  bodyBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  stack.addControl(bodyBlock);

  footerBlock = new TextBlock("guidedPromptFooter", "");
  styleVRFooter(footerBlock, 17);
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
    "Left: X inside, Y exploded, stick spins.\n" +
    "Right: A closer, B back, grip resets.\n" +
    "Trigger opens dots. Hold any button for controls.",
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
  titleBlock.color = VR_PANEL.success;

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

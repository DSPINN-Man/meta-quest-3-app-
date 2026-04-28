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
const VIEWER_Z_OFFSET = -1.8;
const VIEWER_Y_OFFSET = -0.1;

export function initGuidedPrompt(scene: Scene): void {
  if (promptMesh || promptTexture) return;

  // Bigger card geometry (was 2.0 × 0.9) so the longer Quick Tour story
  // cards and the multi-line controller help card both fit without
  // clipping. Texture resolution scales accordingly to stay sharp.
  promptMesh = MeshBuilder.CreatePlane(
    "guidedPromptPlane",
    { width: 2.2, height: 1.2 },
    scene
  );
  promptMesh.isPickable = false;
  promptMesh.setEnabled(false);
  attachToViewer(promptMesh);

  promptTexture = AdvancedDynamicTexture.CreateForMesh(promptMesh, 1100, 600);

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
  bodyBlock.fontSize = 22;
  bodyBlock.fontFamily = "system-ui, -apple-system, 'SF Pro Text', sans-serif";
  bodyBlock.textWrapping = true;
  bodyBlock.lineSpacing = "6px";
  bodyBlock.height = "440px";
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
  if (!promptMesh || !titleBlock || !bodyBlock || !footerBlock) {
    console.error("showGuidedPrompt: mesh or text blocks not initialized!");
    return;
  }
  titleBlock.text = title;
  bodyBlock.text = body;
  footerBlock.text = footer;
  attachToViewer(promptMesh);
  promptMesh.setEnabled(true);
  console.log(`showGuidedPrompt: "${title}" — parent=${promptMesh.parent?.name ?? "none"}, enabled=${promptMesh.isEnabled()}, pos=(${promptMesh.position.x.toFixed(2)}, ${promptMesh.position.y.toFixed(2)}, ${promptMesh.position.z.toFixed(2)})`);
}

export function hideGuidedPrompt(): void {
  if (!promptMesh) return;
  promptMesh.setEnabled(false);
}

/**
 * Show the controls help card — dismissed by any button press.
 *
 * Two columns: LEFT controller actions and RIGHT controller actions.
 * Each row is button + what it does (the *effect*, not just the name)
 * so a confused user knows what they're about to make happen.
 */
export function showHelpCard(): void {
  showGuidedPrompt(
    "Controller Reference",
    "LEFT CONTROLLER\n" +
    "   X  →  See Inside  (fade the cabinet shell)\n" +
    "   Y  →  Explode     (spread the subsystems apart)\n" +
    "   Stick → Spin the model (turntable)\n" +
    "\n" +
    "RIGHT CONTROLLER\n" +
    "   A  →  Step closer to the panel\n" +
    "   B  →  Step back / close info card\n" +
    "   Grip →  Reset everything\n" +
    "   Stick → Walk around the model\n" +
    "\n" +
    "Trigger = click on dots / buttons\n" +
    "Hold any button 3s = open this card again",
    "Press any button to dismiss"
  );
}

export function isGuidedPromptVisible(): boolean {
  return promptMesh?.isEnabled() ?? false;
}

/**
 * Briefly recolour the current prompt card to green and replace the title
 * with a "✓ Got it!" confirmation. Auto-restores after ~800ms so the next
 * step transitions cleanly afterwards.
 *
 * Intended for the guided tutorial: when the user presses the correct
 * button, fire this *before* advancing to the next card so the user gets
 * positive feedback that they did the right thing.
 */
export function showSuccessFeedback(message: string = "✓ Got it!"): void {
  if (!promptMesh || !titleBlock) return;
  if (!promptMesh.isEnabled()) return;

  const originalTitle = titleBlock.text;
  const originalTitleColor = titleBlock.color;

  titleBlock.text = message;
  titleBlock.color = "rgba(120, 240, 160, 1)";

  setTimeout(() => {
    // Only restore if our message is still visible — if a new step has
    // already been rendered, leave it alone.
    if (titleBlock && titleBlock.text === message) {
      titleBlock.text = originalTitle;
      titleBlock.color = originalTitleColor;
    }
  }, 800);
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

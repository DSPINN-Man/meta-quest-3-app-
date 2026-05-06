import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Color3,
} from "@babylonjs/core";
import type { ModelInfo } from "./modelLoader";

/**
 * Contact-shadow disc for photo skyboxes.
 *
 * Without one, the cabinet visibly "floats" above the photo's ground —
 * your eye looks for a soft dark transition where the model meets the
 * floor and finds nothing, so it reads the model as suspended in space.
 *
 * This module paints a flat transparent disc at world Y = 0.01 directly
 * under the model. The texture is a radial gradient: dark at the centre,
 * fading to fully transparent at the edges. The result is the standard
 * product-viz "ground anchor" cheat, but it's invisible in any context
 * that doesn't need it.
 *
 * Show/hide is driven by the active skybox: photo modes turn it on,
 * Dark Studio leaves it off (the ENSPEC floor grounds the cabinet on
 * its own).
 */

let shadowMesh: Mesh | null = null;

/**
 * Build the disc once after the model is loaded so we can size it from
 * the model's bounding box. Stays disabled until showContactShadow()
 * is called.
 */
export function createContactShadow(scene: Scene, modelInfo?: ModelInfo): void {
  if (shadowMesh) return;

  const center = modelInfo?.center ?? new Vector3(0, 0, 0);
  const w = modelInfo?.width ?? 2.5;
  const d = modelInfo?.depth ?? 1.0;

  // Generously over-sized so the gradient fades cleanly off the edges
  // and the disc still covers the cabinet at any turntable rotation.
  const maxDim = Math.max(w, d);
  const planeSize = maxDim * 2.2;

  // ── Radial-gradient alpha texture ─────────────────────────────
  const tex = new DynamicTexture(
    "contactShadowTex",
    { width: 512, height: 512 },
    scene,
    true
  );
  tex.hasAlpha = true;
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 512, 512);
  const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 240);
  grad.addColorStop(0, "rgba(0,0,0,0.72)");
  grad.addColorStop(0.45, "rgba(0,0,0,0.34)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  tex.update();

  const mat = new StandardMaterial("contactShadowMat", scene);
  mat.diffuseTexture = tex;
  mat.useAlphaFromDiffuseTexture = true;
  mat.disableLighting = true;
  mat.diffuseColor = Color3.Black();
  mat.emissiveColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.backFaceCulling = false;

  shadowMesh = MeshBuilder.CreateGround(
    "contactShadow",
    { width: planeSize, height: planeSize },
    scene
  );
  // Slight Y offset above world zero to avoid Z-fighting with anything
  // else that might paint the ground plane in the same pixel.
  shadowMesh.position = new Vector3(center.x, 0.01, center.z);
  shadowMesh.material = mat;
  shadowMesh.renderingGroupId = 1;
  shadowMesh.alwaysSelectAsActiveMesh = true;
  shadowMesh.isPickable = false;
  shadowMesh.receiveShadows = false;
  shadowMesh.setEnabled(false);

  console.log(
    `Contact shadow ready: ${planeSize.toFixed(2)}×${planeSize.toFixed(2)}m at (${center.x.toFixed(2)}, 0.01, ${center.z.toFixed(2)})`
  );
}

export function showContactShadow(): void {
  if (shadowMesh) shadowMesh.setEnabled(true);
}

export function hideContactShadow(): void {
  if (shadowMesh) shadowMesh.setEnabled(false);
}

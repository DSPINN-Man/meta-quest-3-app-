import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Texture,
  Color3,
  Mesh,
} from "@babylonjs/core";
import { SKYBOX_OPTIONS, type SkyboxOption } from "../utils/config";

/**
 * Skybox system — loads 360° equirectangular images as environment backgrounds.
 * Supports switching between environments at runtime.
 */

let skyboxMesh: Mesh | null = null;
let skyboxMat: StandardMaterial | null = null;
let currentSkyboxId = "dark_studio";

/**
 * Initialize the skybox mesh (large sphere around the scene).
 * Call once after scene is created.
 */
export function initSkybox(scene: Scene): void {
  skyboxMesh = MeshBuilder.CreateSphere(
    "skybox",
    { diameter: 200, segments: 32 },
    scene
  );

  skyboxMat = new StandardMaterial("skyboxMat", scene);
  skyboxMat.backFaceCulling = false;
  skyboxMat.disableLighting = true;
  skyboxMat.diffuseColor = Color3.Black();
  skyboxMat.specularColor = Color3.Black();

  skyboxMesh.material = skyboxMat;
  skyboxMesh.infiniteDistance = true;
  skyboxMesh.isPickable = false;
  skyboxMesh.receiveShadows = false;

  // Start hidden — dark studio doesn't need a skybox
  skyboxMesh.setEnabled(false);
}

/**
 * Switch the environment background.
 * Pass a skybox option ID from SKYBOX_OPTIONS.
 */
export function setSkybox(scene: Scene, optionId: string): void {
  const option = SKYBOX_OPTIONS.find((o) => o.id === optionId);
  if (!option) {
    console.warn(`Skybox option "${optionId}" not found.`);
    return;
  }

  currentSkyboxId = optionId;

  if (!option.file) {
    // Solid color mode — hide skybox, use scene clear color
    if (skyboxMesh) skyboxMesh.setEnabled(false);
    console.log(`Skybox: "${option.label}" (solid color)`);
    return;
  }

  if (!skyboxMesh || !skyboxMat) {
    console.warn("Skybox not initialized.");
    return;
  }

  // Load the equirectangular texture
  const texturePath = `textures/${option.file}`;
  try {
    const texture = new Texture(texturePath, scene);
    texture.coordinatesMode = Texture.FIXED_EQUIRECTANGULAR_MIRRORED_MODE;

    // Dispose old texture
    if (skyboxMat.emissiveTexture) {
      skyboxMat.emissiveTexture.dispose();
    }

    skyboxMat.emissiveTexture = texture;
    skyboxMat.emissiveColor = Color3.White();
    skyboxMesh.setEnabled(true);

    console.log(`Skybox: "${option.label}" loaded from ${texturePath}`);
  } catch (err) {
    console.warn(`Failed to load skybox texture: ${texturePath}`, err);
    skyboxMesh.setEnabled(false);
  }
}

/** Get the current skybox option ID */
export function getCurrentSkyboxId(): string {
  return currentSkyboxId;
}

/** Get available skybox options */
export function getSkyboxOptions(): SkyboxOption[] {
  return SKYBOX_OPTIONS;
}

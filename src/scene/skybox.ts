import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Texture,
  Color3,
  Color4,
  Mesh,
} from "@babylonjs/core";
import { SKYBOX_OPTIONS, type SkyboxOption } from "../utils/config";

/**
 * Skybox system — loads 360° equirectangular images as environment backgrounds.
 *
 * Every SKYBOX_OPTIONS entry has a `fallbackColor`. If the image file is null
 * OR fails to load (e.g. file not yet provided), we silently fall back to that
 * colour as the scene clear colour. This means the choice screen never crashes
 * even before the real photos are dropped into public/textures/.
 *
 * TODO (conference): replace fallback colours with real equirectangular photos.
 *   public/textures/skybox_industrial.jpg
 *   public/textures/skybox_showroom.jpg
 *   public/textures/skybox_site.jpg
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
 *
 * If the option has no file (or the file fails to load) we apply the option's
 * fallback colour as the scene clear colour. This is the default for every
 * option until real photos are dropped in.
 */
export function setSkybox(scene: Scene, optionId: string): void {
  const option = SKYBOX_OPTIONS.find((o) => o.id === optionId);
  if (!option) {
    console.warn(`Skybox option "${optionId}" not found.`);
    return;
  }

  currentSkyboxId = optionId;

  // No file specified → solid colour mode (procedural fallback only)
  if (!option.file) {
    applyFallbackColor(scene, option);
    return;
  }

  if (!skyboxMesh || !skyboxMat) {
    console.warn("Skybox not initialized — using fallback colour.");
    applyFallbackColor(scene, option);
    return;
  }

  // Attempt to load the equirectangular texture. If it fails (file missing),
  // fall back to the procedural colour so the scene never crashes.
  const texturePath = `textures/${option.file}`;
  try {
    const texture = new Texture(
      texturePath,
      scene,
      undefined, // noMipmap
      undefined, // invertY
      undefined, // samplingMode
      () => {
        // onLoad — apply texture to skybox sphere
        if (!skyboxMesh || !skyboxMat) return;
        if (skyboxMat.emissiveTexture && skyboxMat.emissiveTexture !== texture) {
          skyboxMat.emissiveTexture.dispose();
        }
        skyboxMat.emissiveTexture = texture;
        skyboxMat.emissiveColor = Color3.White();
        skyboxMesh.setEnabled(true);
        // Force the scene clear colour to black so any sliver of view not
        // covered by the sphere doesn't read as the original ENSPEC blue.
        scene.clearColor = new Color4(0, 0, 0, 1);
        // Recolour the floor to match — otherwise the lower half of the
        // view stays bright ENSPEC blue and visitors don't see the
        // background change at all.
        applyGroundColor(scene, option.groundColor);
        console.log(`Skybox: "${option.label}" loaded from ${texturePath}`);
      },
      () => {
        // onError — file missing or failed to decode. Fall back to colour.
        console.warn(
          `Skybox texture "${texturePath}" not found — using fallback colour for "${option.label}".`
        );
        try {
          texture.dispose();
        } catch {
          // ignore
        }
        applyFallbackColor(scene, option);
      }
    );
    texture.coordinatesMode = Texture.FIXED_EQUIRECTANGULAR_MIRRORED_MODE;
  } catch (err) {
    console.warn(`Skybox load threw, using fallback colour: ${texturePath}`, err);
    applyFallbackColor(scene, option);
  }
}

/**
 * Repaint the ground mesh's diffuse colour. The ground is created in
 * environment.ts with name "ground" (XR.teleportFloorMeshName). We look
 * it up by name to avoid threading a reference through every call site.
 */
function applyGroundColor(scene: Scene, color: Color3): void {
  const ground = scene.getMeshByName("ground");
  if (!ground) return;
  const mat = ground.material;
  if (mat instanceof StandardMaterial) {
    mat.diffuseColor = color.clone();
    // Keep the existing ambient contribution but darken slightly so the
    // floor doesn't glow brighter than the sky behind it.
    mat.emissiveColor = color.scale(0.05);
  }
}

/**
 * Apply the option's procedural fallback colour as the scene clear colour
 * and hide the skybox sphere. Also recolour the floor so the user sees
 * the ground change — otherwise the lower half of the view sticks at
 * the previous skybox's floor.
 */
function applyFallbackColor(scene: Scene, option: SkyboxOption): void {
  if (skyboxMesh) {
    skyboxMesh.setEnabled(false);
    if (skyboxMat?.emissiveTexture) {
      skyboxMat.emissiveTexture.dispose();
      skyboxMat.emissiveTexture = null;
    }
  }
  scene.clearColor = option.fallbackColor.clone();
  applyGroundColor(scene, option.groundColor);
  console.log(
    `Skybox: "${option.label}" — procedural colour fallback applied.`
  );
}

/** Get the current skybox option ID */
export function getCurrentSkyboxId(): string {
  return currentSkyboxId;
}

/** Get available skybox options */
export function getSkyboxOptions(): SkyboxOption[] {
  return SKYBOX_OPTIONS;
}

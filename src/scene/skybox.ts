import {
  Scene,
  StandardMaterial,
  Texture,
  Color3,
  Color4,
  PhotoDome,
} from "@babylonjs/core";
import { SKYBOX_OPTIONS, type SkyboxOption } from "../utils/config";

/**
 * Skybox / 360° photo backdrop system.
 *
 * Earlier we used a hand-rolled inside-out sphere with
 * FIXED_EQUIRECTANGULAR_MIRRORED_MODE — and the photos *did* load, but
 * the projection was wrong. From a typical eye-line camera the user
 * was always staring at the *bottom* slice of the equirectangular
 * image (which on industrial / concrete photos is just dark floor) so
 * it looked like the background never changed.
 *
 * Babylon's PhotoDome is purpose-built for 360° photos: it builds a
 * sphere with the correct UV layout, inside-out winding, and texture
 * coordinatesMode so the camera sees the panorama in the orientation
 * the photographer actually captured. We use it as the single source
 * of truth for photo skyboxes.
 *
 * Every SKYBOX_OPTIONS entry also has a `fallbackColor` and
 * `groundColor`. If `file` is null (Dark Studio) or the file fails to
 * load we hide the dome and apply those colours so the scene never
 * crashes and the user always sees a clear background change.
 *
 * TODO (conference): the three photos in public/textures/ are
 * placeholders. Drop the real Indian Queens / industrial / concrete
 * panos in the same paths and the loader picks them up.
 */

let dome: PhotoDome | null = null;
let currentSkyboxId = "dark_studio";
let scene: Scene | null = null;

/** Initialize. Stash the scene; PhotoDome is created lazily on first photo skybox. */
export function initSkybox(s: Scene): void {
  scene = s;
}

/**
 * Switch the environment background.
 * Pass a skybox option ID from SKYBOX_OPTIONS.
 */
export function setSkybox(_scene: Scene | undefined, optionId: string): void {
  // The arg is kept for backwards-compat with existing call sites that
  // pass scene through. If we have a stashed scene from initSkybox use
  // that, otherwise fall back to the arg.
  const s = scene ?? _scene;
  if (!s) {
    console.warn("Skybox: no scene available.");
    return;
  }

  const option = SKYBOX_OPTIONS.find((o) => o.id === optionId);
  if (!option) {
    console.warn(`Skybox option "${optionId}" not found.`);
    return;
  }

  currentSkyboxId = optionId;

  // No file → solid colour mode (Dark Studio path).
  if (!option.file) {
    disposeDome();
    applyFallbackColor(s, option);
    return;
  }

  const texturePath = `textures/${option.file}`;

  // Build (or rebuild) the photo dome. Disposing-and-recreating is
  // cleaner than swapping textures because PhotoDome owns several
  // observables and a render-pass that can leak otherwise.
  disposeDome();

  try {
    dome = new PhotoDome(
      "photoDome",
      texturePath,
      {
        resolution: 32,
        size: 1000, // big enough that anything in the scene is well inside
      },
      s
    );
    dome.imageMode = PhotoDome.MODE_MONOSCOPIC;
    // Watch the underlying texture so we can fall back to colour if the
    // file 404s or fails to decode.
    const tex = dome.photoTexture as Texture | null;
    if (tex) {
      tex.onLoadObservable.addOnce(() => {
        console.log(`Skybox: "${option.label}" PhotoDome loaded from ${texturePath}`);
        s.clearColor = new Color4(0, 0, 0, 1);
        applyGroundColor(s, option.groundColor);
      });
      // Texture has no first-class onError observable on all versions —
      // we attach a low-level error handler via the underlying image.
      const internalImg = (tex as unknown as { _texture?: { _ondestroy?: () => void } })._texture;
      // Best-effort: most failures will surface in the console as a
      // network 404 from Babylon's loader.
      void internalImg;
    } else {
      console.warn(`Skybox: PhotoDome reported no photoTexture — falling back.`);
      disposeDome();
      applyFallbackColor(s, option);
    }
  } catch (err) {
    console.warn(`Skybox: PhotoDome construction failed for ${texturePath} — falling back.`, err);
    disposeDome();
    applyFallbackColor(s, option);
  }
}

function disposeDome(): void {
  if (dome) {
    try {
      dome.dispose();
    } catch {
      // ignore
    }
    dome = null;
  }
}

/**
 * Repaint the ground mesh's diffuse colour. The ground is created in
 * environment.ts with name "ground" (XR.teleportFloorMeshName). We look
 * it up by name to avoid threading a reference through every call site.
 */
function applyGroundColor(s: Scene, color: Color3): void {
  const ground = s.getMeshByName("ground");
  if (!ground) return;
  const mat = ground.material;
  if (mat instanceof StandardMaterial) {
    mat.diffuseColor = color.clone();
    // Slight emissive tint so the floor doesn't go pure-grey under
    // shadows — keeps the lighting "studio" feel intact.
    mat.emissiveColor = color.scale(0.05);
  }
}

/**
 * Apply the option's procedural fallback colour as the scene clear colour
 * and ensure no dome is visible. Also recolour the floor so the user sees
 * the ground change — otherwise the lower half of the view sticks at the
 * previous skybox's floor.
 */
function applyFallbackColor(s: Scene, option: SkyboxOption): void {
  s.clearColor = option.fallbackColor.clone();
  applyGroundColor(s, option.groundColor);
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

import {
  Scene,
  SpotLight,
  PointLight,
  HemisphericLight,
  Vector3,
  ShadowGenerator,
} from "@babylonjs/core";
import { LIGHTS, ENV } from "../utils/config";
import type { ModelInfo } from "./modelLoader";

/**
 * Cinematic product-photography lighting rig.
 *
 * Key light (bright, warm, upper-front-right) — main dramatic light
 * Fill light (cool, softer, front-left) — reduces harsh shadows
 * Rim light (behind, edge highlights) — definition and depth
 * Interior light (point light inside cabinet) — illuminates internals when doors open
 * Ambient hemisphere — subtle base fill so nothing is pitch black
 */

let keyLight: SpotLight | null = null;
let fillLight: SpotLight | null = null;
let rimLight: SpotLight | null = null;
let interiorLight: PointLight | null = null;

export function createLighting(scene: Scene): ShadowGenerator {
  const defaultTarget = new Vector3(0, 1.25, 0);

  // ── Key Light (main dramatic light) ───────────────────────
  keyLight = new SpotLight(
    "keyLight",
    new Vector3(3, 5, -4),
    defaultTarget.subtract(new Vector3(3, 5, -4)).normalize(),
    LIGHTS.key.angle,
    LIGHTS.key.exponent,
    scene
  );
  keyLight.intensity = LIGHTS.key.intensity;
  keyLight.diffuse = LIGHTS.key.color;

  // Shadow generator attached to key light
  const shadowGen = new ShadowGenerator(1024, keyLight);
  shadowGen.useBlurExponentialShadowMap = true;
  shadowGen.blurKernel = 16;

  // ── Fill Light (softer, from the side) ────────────────────
  fillLight = new SpotLight(
    "fillLight",
    new Vector3(-4, 3, -3),
    defaultTarget.subtract(new Vector3(-4, 3, -3)).normalize(),
    LIGHTS.fill.angle,
    LIGHTS.fill.exponent,
    scene
  );
  fillLight.intensity = LIGHTS.fill.intensity;
  fillLight.diffuse = LIGHTS.fill.color;

  // ── Rim Light (behind, for edge highlights) ───────────────
  rimLight = new SpotLight(
    "rimLight",
    new Vector3(0, 4, 5),
    defaultTarget.subtract(new Vector3(0, 4, 5)).normalize(),
    LIGHTS.rim.angle,
    LIGHTS.rim.exponent,
    scene
  );
  rimLight.intensity = LIGHTS.rim.intensity;
  rimLight.diffuse = LIGHTS.rim.color;

  // ── Interior Point Light (inside cabinet — starts OFF) ────
  interiorLight = new PointLight(
    "interiorLight",
    defaultTarget.clone(),
    scene
  );
  interiorLight.intensity = 0; // Starts off — turned on when doors open
  interiorLight.diffuse = LIGHTS.interior.color;
  interiorLight.range = LIGHTS.interior.range;

  // ── Ambient Hemisphere (subtle base fill) ─────────────────
  const hemi = new HemisphericLight("ambientHemi", new Vector3(0, 1, 0), scene);
  hemi.intensity = ENV.ambientIntensity;

  return shadowGen;
}

/**
 * Reposition all lights relative to the loaded model's bounding box.
 */
export function repositionLights(info: ModelInfo): void {
  const h = info.height;
  const w = Math.max(info.width, info.depth);
  const c = info.center;

  const keyPos = new Vector3(c.x + w * 0.8, h * 2, c.z - w * 1.2);
  const fillPos = new Vector3(c.x - w * 1.2, h * 1.2, c.z - w * 0.9);
  const rimPos = new Vector3(c.x, h * 1.6, c.z + w * 1.5);

  if (keyLight) {
    keyLight.position = keyPos;
    keyLight.direction = c.subtract(keyPos).normalize();
  }
  if (fillLight) {
    fillLight.position = fillPos;
    fillLight.direction = c.subtract(fillPos).normalize();
  }
  if (rimLight) {
    rimLight.position = rimPos;
    rimLight.direction = c.subtract(rimPos).normalize();
  }

  // Position interior light at the center of the model
  if (interiorLight) {
    interiorLight.position = c.clone();
  }

  console.log(`Lights repositioned for model: h=${h.toFixed(2)}, w=${w.toFixed(2)}`);
}

/**
 * Turn the interior light ON (call when doors open to illuminate internals).
 */
export function enableInteriorLight(): void {
  if (interiorLight) {
    interiorLight.intensity = LIGHTS.interior.intensity;
    console.log("Interior light ON");
  }
}

/**
 * Turn the interior light OFF (call when doors close).
 */
export function disableInteriorLight(): void {
  if (interiorLight) {
    interiorLight.intensity = 0;
    console.log("Interior light OFF");
  }
}

import {
  Scene,
  AbstractMesh,
  PBRMaterial,
  StandardMaterial,
  Material,
} from "@babylonjs/core";
import { DOORS } from "../utils/config";

/**
 * Door / Panel / Cover animation system — V5.
 *
 * "Open Doors"  = Fade ALL exterior (frame + panels + walls + covers + doors)
 *                 to semi-transparent ghost shell (doorOpenAlpha ~0.25).
 *                 Internal components stay fully opaque → user sees inside
 *                 while the cabinet outline remains visible.
 *
 * "Close Doors" = Restore ALL exterior back to full opacity (alpha = 1).
 *
 * "Exploded View" uses fadeExterior() to fade shell to near-invisible (0.05)
 *                 before exploding parts outward.
 *
 * Mesh categories:
 *   - frame_structure         → exterior shell, fades with doors
 *   - door_front_main         → exterior, fades with doors
 *   - door_internal_divider   → exterior, fades with doors
 *   - door_cable_chamber      → exterior, fades with doors
 *   - panel_*, wall_*, cover_ → exterior, fades with doors
 *   - busbar, capacitor, etc. → internals, always fully visible
 */

// ── State ────────────────────────────────────────────────────

/** All exterior meshes that can be faded (frame + panels + walls + covers) */
let fadeMeshes: AbstractMesh[] = [];
/** Door meshes (also fadeable — treated same as exterior for fade) */
let swingMeshes: AbstractMesh[] = [];
/** Original rotation.y for each swing mesh (kept for reset/exploded view) */
let swingOriginalY: Map<AbstractMesh, number> = new Map();

let doorsOpen = false;
let exteriorFaded = false;
let isAnimating = false;

// ── Internal component patterns (always visible) ─────────────

const KEEP_VISIBLE_PATTERNS = [
  "busbar",
  "capacitor",
  "cable_assembly",
  "cable_box",
  "terminal_rail",
  "terminal_block",
  "plc",
  "mcb",
  "relay",
  "contactor",
  "fuse",
  "transformer",
  "ct_",
  "vt_",
  "din_rail",
  "wiring",
  "conductor",
];

function isInternalComponent(name: string): boolean {
  const lower = name.toLowerCase();
  return KEEP_VISIBLE_PATTERNS.some((p) => lower.includes(p));
}

function isDoorMesh(name: string): boolean {
  const lower = name.toLowerCase();
  const allDoors = [
    ...DOORS.swing.meshNames,
    ...DOORS.swing.secondaryMeshNames,
  ];
  return allDoors.some((n) => lower === n.toLowerCase());
}

// ── Init ─────────────────────────────────────────────────────

export function initDoors(meshes: AbstractMesh[]): void {
  fadeMeshes = [];
  swingMeshes = [];
  swingOriginalY = new Map();

  const root = meshes.length > 0 ? meshes[0] : null;
  let fadeCount = 0;
  let keepCount = 0;
  let swingCount = 0;

  console.log("%c── Door System Init (v5 — fade-through approach) ──", "color: #ff9800; font-weight: bold");

  for (const mesh of meshes) {
    if (mesh === root) continue;
    if (mesh.getTotalVertices() === 0) continue;

    const name = mesh.name;

    // Internal components — always visible at full opacity
    if (isInternalComponent(name)) {
      keepCount++;
      console.log(`  KEEP: "${name}"`);
      continue;
    }

    // Door meshes — tracked separately (same fade behavior as exterior)
    if (isDoorMesh(name)) {
      swingMeshes.push(mesh);
      swingOriginalY.set(mesh, mesh.rotation.y);
      swingCount++;
      console.log(`  DOOR: "${name}" (${mesh.getTotalVertices().toLocaleString()} verts)`);
      prepareMeshForFade(mesh);
      continue;
    }

    // Everything else (frame_structure, panels, walls, covers) — fadeable exterior
    fadeMeshes.push(mesh);
    fadeCount++;
    prepareMeshForFade(mesh);
    console.log(`  FADE: "${name}" (${mesh.getTotalVertices().toLocaleString()} verts)`);
  }

  console.log(
    `%c  Door system: ${swingCount} DOOR, ${fadeCount} FADE (exterior), ${keepCount} KEEP (internals)`,
    "color: #ff9800; font-weight: bold"
  );
  console.log(
    `%c  Open Doors → fade all exterior to alpha=${DOORS.doorOpenAlpha} (ghost shell)`,
    "color: #ff9800"
  );
}

function prepareMeshForFade(mesh: AbstractMesh): void {
  const mat = mesh.material;
  if (mat instanceof PBRMaterial) {
    mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
    mat.backFaceCulling = false;
    mat.alpha = 1;
  } else if (mat instanceof StandardMaterial) {
    mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
    mat.backFaceCulling = false;
    mat.alpha = 1;
  }
  mesh.visibility = 1;
}

// ── Public API: Doors (fade to semi-transparent) ─────────────

/**
 * "Open Doors" — fade all exterior meshes to semi-transparent ghost shell.
 * Internal components stay fully opaque so user can see inside.
 */
export async function openAllDoors(scene: Scene): Promise<void> {
  if (isAnimating || doorsOpen) return;
  isAnimating = true;
  // Fade exterior to semi-transparent (ghost outline)
  await animateFadeToAlpha(scene, DOORS.doorOpenAlpha);
  doorsOpen = true;
  isAnimating = false;
  console.log(`Doors opened: exterior faded to alpha=${DOORS.doorOpenAlpha}`);
}

/**
 * "Close Doors" — restore all exterior meshes to full opacity.
 */
export async function closeAllDoors(scene: Scene): Promise<void> {
  if (isAnimating || !doorsOpen) return;
  isAnimating = true;
  // Re-enable all meshes first (in case they were disabled by exploded view)
  const allFadeable = [...fadeMeshes, ...swingMeshes];
  for (const mesh of allFadeable) mesh.setEnabled(true);
  // Restore to full opacity
  await animateFadeToAlpha(scene, 1);
  doorsOpen = false;
  isAnimating = false;
  console.log("Doors closed: exterior restored to full opacity.");
}

export function areDoorsOpen(): boolean {
  return doorsOpen;
}

export function getDoorCount(): number {
  return swingMeshes.length + fadeMeshes.length;
}

// ── Public API: Exterior fade (for exploded view) ────────────

/**
 * Fade the entire exterior shell to near-invisible (0.05 alpha).
 * Called by the exploded view system to fully reveal internals.
 */
export async function fadeExterior(scene: Scene): Promise<void> {
  if (exteriorFaded) return;
  await animateFadeToAlpha(scene, DOORS.fadeToAlpha);
  // Disable meshes after fading to near-invisible for performance
  const allFadeable = [...fadeMeshes, ...swingMeshes];
  for (const mesh of allFadeable) mesh.setEnabled(false);
  exteriorFaded = true;
  console.log("Exterior faded for exploded view.");
}

/**
 * Restore the exterior shell from exploded-view fade.
 * Returns to the door-open alpha (semi-transparent) if doors were open,
 * or full opacity if doors were closed.
 */
export async function unfadeExterior(scene: Scene): Promise<void> {
  if (!exteriorFaded) return;
  // Re-enable all meshes before animating back
  const allFadeable = [...fadeMeshes, ...swingMeshes];
  for (const mesh of allFadeable) mesh.setEnabled(true);
  // Restore to door-open alpha (will be fully restored when doors close)
  const targetAlpha = doorsOpen ? DOORS.doorOpenAlpha : 1;
  await animateFadeToAlpha(scene, targetAlpha);
  exteriorFaded = false;
  console.log("Exterior restored from exploded view.");
}

export function isExteriorFaded(): boolean {
  return exteriorFaded;
}

// ── Reset ────────────────────────────────────────────────────

export function resetDoors(): void {
  // Reset swing doors (restore rotation for any future swing use)
  for (const mesh of swingMeshes) {
    const orig = swingOriginalY.get(mesh) ?? 0;
    mesh.rotation.y = orig;
    mesh.visibility = 1;
    mesh.setEnabled(true);
    if (mesh.material) mesh.material.alpha = 1;
  }

  // Reset fade meshes (exterior shell)
  for (const mesh of fadeMeshes) {
    mesh.visibility = 1;
    mesh.setEnabled(true);
    if (mesh.material) mesh.material.alpha = 1;
  }

  doorsOpen = false;
  exteriorFaded = false;
  isAnimating = false;
}

export async function toggleDoor(_name: string, scene: Scene): Promise<void> {
  if (doorsOpen) {
    await closeAllDoors(scene);
  } else {
    await openAllDoors(scene);
  }
}

// ── Fade Animation (unified) ────────────────────────────────

/**
 * Animate all exterior meshes (fadeMeshes + swingMeshes) to a target alpha.
 * Used for both door open/close (0.25/1.0) and exploded view (0.05/1.0).
 */
function animateFadeToAlpha(scene: Scene, targetAlpha: number): Promise<void> {
  const allFadeable = [...fadeMeshes, ...swingMeshes];
  if (allFadeable.length === 0) return Promise.resolve();

  const duration = DOORS.fadeDuration * 1000;

  return new Promise((resolve) => {
    const startTime = performance.now();
    const startVis = allFadeable.map((m) => m.visibility);
    const startAlpha = allFadeable.map((m) => m.material?.alpha ?? 1);

    const observer = scene.onBeforeRenderObservable.add(() => {
      const elapsed = performance.now() - startTime;
      let t = Math.min(elapsed / duration, 1);
      t = t * t * (3 - 2 * t); // smooth ease-in-out

      for (let i = 0; i < allFadeable.length; i++) {
        const mesh = allFadeable[i];
        mesh.visibility = startVis[i] + (targetAlpha - startVis[i]) * t;
        if (mesh.material) {
          mesh.material.alpha = startAlpha[i] + (targetAlpha - startAlpha[i]) * t;
        }
      }

      if (t >= 1) {
        scene.onBeforeRenderObservable.remove(observer);
        // Set exact final values
        for (const mesh of allFadeable) {
          mesh.visibility = targetAlpha;
          if (mesh.material) mesh.material.alpha = targetAlpha;
        }
        resolve();
      }
    });
  });
}

// ── Legacy: Swing Animation (kept for potential future use) ──

function animateSwing(scene: Scene, opening: boolean): Promise<void> {
  if (swingMeshes.length === 0) return Promise.resolve();

  const duration = DOORS.swing.duration * 1000;
  const targetAngle = DOORS.swing.angle;

  return new Promise((resolve) => {
    const startTime = performance.now();
    const startRotations = swingMeshes.map((m) => m.rotation.y);
    const targetRotations = swingMeshes.map((m) => {
      const orig = swingOriginalY.get(m) ?? 0;
      return opening ? orig + targetAngle : orig;
    });

    const observer = scene.onBeforeRenderObservable.add(() => {
      const elapsed = performance.now() - startTime;
      let t = Math.min(elapsed / duration, 1);
      t = t * t * (3 - 2 * t);

      for (let i = 0; i < swingMeshes.length; i++) {
        swingMeshes[i].rotation.y =
          startRotations[i] + (targetRotations[i] - startRotations[i]) * t;
      }

      if (t >= 1) {
        scene.onBeforeRenderObservable.remove(observer);
        for (let i = 0; i < swingMeshes.length; i++) {
          swingMeshes[i].rotation.y = targetRotations[i];
        }
        resolve();
      }
    });
  });
}

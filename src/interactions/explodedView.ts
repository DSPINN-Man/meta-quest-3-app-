import {
  Scene,
  AbstractMesh,
  Vector3,
} from "@babylonjs/core";
import { EXPLODED, DOORS } from "../utils/config";

/**
 * Exploded view system with NAMED directional movement.
 *
 * Instead of auto-computing directions (which doesn't work well with
 * this model), each assembly has an explicit displacement vector defined
 * in config. Terminal rails get slight horizontal spacing between each.
 *
 * The main_enclosure_body (structural frame) stays in place as the anchor.
 * All animations use world-space setAbsolutePosition with per-frame lerp.
 */

interface ExplodePart {
  mesh: AbstractMesh;
  /** Original world-space position */
  originalWorldPos: Vector3;
  /** Target world-space position when exploded */
  explodedWorldPos: Vector3;
}

let parts: ExplodePart[] = [];
let exploded = false;
let isAnimating = false;

/**
 * Initialize the exploded view system.
 * Call AFTER the model is fully loaded, scaled, and positioned.
 *
 * Matches meshes to explosion rules by name/prefix.
 * Meshes not matching any rule are left in place.
 */
export function initExplodedView(meshes: AbstractMesh[]): void {
  parts = [];

  if (meshes.length === 0) return;

  const root = meshes[0];

  // Force fresh world matrices
  root.computeWorldMatrix(true);
  for (const m of meshes) {
    m.computeWorldMatrix(true);
  }

  // Skip the frame mesh — it stays in place as the anchor
  const frameName = DOORS.frameName.toLowerCase();

  // Track how many terminal_rail matches we've seen for spacing
  let terminalIndex = 0;

  for (const rule of EXPLODED.rules) {
    // Find all matching meshes
    const matches = meshes.filter((m) => {
      if (m === root) return false;
      if (m.getTotalVertices() === 0) return false;
      if (m.name.toLowerCase() === frameName) return false;

      const name = m.name.toLowerCase();
      const match = rule.nameMatch.toLowerCase();

      if (rule.isPrefix) {
        return name.startsWith(match);
      } else {
        return name === match;
      }
    });

    for (const mesh of matches) {
      mesh.computeWorldMatrix(true);
      const worldPos = mesh.getAbsolutePosition().clone();

      // For prefix-matched groups (like terminal_rail_01..05), add slight spacing
      let displacement = rule.displacement.clone();
      if (rule.isPrefix && matches.length > 1) {
        const spacing = 0.3;
        const offset = (terminalIndex - (matches.length - 1) / 2) * spacing;
        // Add horizontal offset perpendicular to main displacement
        if (Math.abs(displacement.z) > 0.01) {
          // Moving in Z — spread along X
          displacement.x += offset;
        } else if (Math.abs(displacement.x) > 0.01) {
          // Moving in X — spread along Z
          displacement.z += offset;
        }
        terminalIndex++;
      }

      const explodedPos = worldPos.add(displacement);

      parts.push({
        mesh,
        originalWorldPos: worldPos,
        explodedWorldPos: explodedPos,
      });

      console.log(
        `  Explode: "${mesh.name}" → displacement (${displacement.x.toFixed(2)}, ${displacement.y.toFixed(2)}, ${displacement.z.toFixed(2)})`
      );
    }

    // Reset terminal index between rules
    if (!rule.isPrefix) terminalIndex = 0;
  }

  console.log(`Exploded view: ${parts.length} parts registered.`);
}

/**
 * Toggle the exploded view.
 */
export async function toggleExplodedView(scene: Scene): Promise<void> {
  if (isAnimating || parts.length === 0) return;
  isAnimating = true;

  if (exploded) {
    await animateToOriginal(scene);
    exploded = false;
    console.log("Exploded view collapsed.");
  } else {
    await animateToExploded(scene);
    exploded = true;
    console.log("Exploded view activated.");
  }

  isAnimating = false;
}

/**
 * Explode outward (no-op if already exploded).
 */
export async function explode(scene: Scene): Promise<void> {
  if (isAnimating || exploded || parts.length === 0) return;
  isAnimating = true;
  await animateToExploded(scene);
  exploded = true;
  isAnimating = false;
}

/**
 * Collapse back (no-op if already collapsed).
 */
export async function collapse(scene: Scene): Promise<void> {
  if (isAnimating || !exploded || parts.length === 0) return;
  isAnimating = true;
  await animateToOriginal(scene);
  exploded = false;
  isAnimating = false;
}

/**
 * Returns true if currently exploded.
 */
export function isExploded(): boolean {
  return exploded;
}

/**
 * Instantly reset all parts to original positions (no animation).
 */
export function resetExplodedView(): void {
  for (const part of parts) {
    part.mesh.setAbsolutePosition(part.originalWorldPos.clone());
  }
  exploded = false;
  isAnimating = false;
}

// ── Animation ───────────────────────────────────────────────────

function animateToExploded(scene: Scene): Promise<void> {
  const starts = parts.map((p) => p.mesh.getAbsolutePosition().clone());
  const targets = parts.map((p) => p.explodedWorldPos.clone());
  return lerpAnimation(scene, starts, targets);
}

function animateToOriginal(scene: Scene): Promise<void> {
  const starts = parts.map((p) => p.mesh.getAbsolutePosition().clone());
  const targets = parts.map((p) => p.originalWorldPos.clone());
  return lerpAnimation(scene, starts, targets);
}

/**
 * Frame-by-frame lerp animation using scene render loop.
 * Works in world space via setAbsolutePosition.
 */
function lerpAnimation(
  scene: Scene,
  starts: Vector3[],
  targets: Vector3[]
): Promise<void> {
  return new Promise((resolve) => {
    const duration = EXPLODED.animDuration * 1000;
    const startTime = performance.now();

    const observer = scene.onBeforeRenderObservable.add(() => {
      const elapsed = performance.now() - startTime;
      let t = Math.min(elapsed / duration, 1);
      t = smoothstep(t);

      for (let i = 0; i < parts.length; i++) {
        const pos = Vector3.Lerp(starts[i], targets[i], t);
        parts[i].mesh.setAbsolutePosition(pos);
      }

      if (t >= 1) {
        scene.onBeforeRenderObservable.remove(observer);
        resolve();
      }
    });
  });
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

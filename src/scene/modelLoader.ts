import {
  Scene,
  SceneLoader,
  ShadowGenerator,
  AbstractMesh,
  Vector3,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { MODEL } from "../utils/config";

/**
 * Information about the loaded & scaled model, returned so other systems
 * (lights, camera, hotspots) can position relative to the model.
 */
export interface ModelInfo {
  meshes: AbstractMesh[];
  /** World-space center of the model after scaling */
  center: Vector3;
  /** Model height after scaling (should be ~targetHeight) */
  height: number;
  /** Model width after scaling */
  width: number;
  /** Model depth after scaling */
  depth: number;
  /** The scale factor that was applied */
  scale: number;
}

/**
 * Compute bounding box of meshes that have actual geometry.
 * Skips root nodes / empty transform nodes that sit at origin
 * and would corrupt the bounding box.
 */
function computeGeometryBounds(meshes: AbstractMesh[]): { min: Vector3; max: Vector3 } {
  let min = new Vector3(Infinity, Infinity, Infinity);
  let max = new Vector3(-Infinity, -Infinity, -Infinity);
  let count = 0;
  for (const mesh of meshes) {
    if (mesh.getTotalVertices() === 0) continue;
    mesh.computeWorldMatrix(true);
    const bb = mesh.getBoundingInfo().boundingBox;
    min = Vector3.Minimize(min, bb.minimumWorld);
    max = Vector3.Maximize(max, bb.maximumWorld);
    count++;
  }
  console.log(`  computeGeometryBounds: ${count} geometry meshes included`);
  return { min, max };
}

/**
 * Loads the panel GLB model with progress tracking.
 * Auto-scales the model so its tallest dimension = MODEL.targetHeight.
 * Centers horizontally at origin, BOTTOM sits exactly at Y=0.
 * Logs full diagnostics including ALL mesh names.
 */
export async function loadModel(
  scene: Scene,
  shadowGen: ShadowGenerator,
  onProgress?: (pct: number) => void
): Promise<ModelInfo> {
  console.log(`Loading model: ${MODEL.path}${MODEL.fileName}`);
  const t0 = performance.now();

  const result = await SceneLoader.ImportMeshAsync(
    "",
    MODEL.path,
    MODEL.fileName,
    scene,
    (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress((evt.loaded / evt.total) * 100);
      }
    }
  );

  const loadTime = ((performance.now() - t0) / 1000).toFixed(1);
  const meshes = result.meshes;

  if (meshes.length === 0) {
    console.warn("Model loaded but contains no meshes.");
    return { meshes, center: Vector3.Zero(), height: 0, width: 0, depth: 0, scale: 1 };
  }

  // ── Log ALL mesh names (critical for debugging) ─────────────
  let totalVerts = 0;
  console.log(`%c╔══ MODEL LOADED in ${loadTime}s ══╗`, "color: #4fc3f7; font-weight: bold");
  console.log(`%c  ${meshes.length} meshes total:`, "color: #ffb74d; font-weight: bold");
  for (const m of meshes) {
    const verts = m.getTotalVertices();
    totalVerts += verts;
    const tag = verts === 0 ? " [EMPTY/ROOT]" : "";
    console.log(`    "${m.name}" — ${verts.toLocaleString()} verts${tag}`);
  }
  console.log(`  Total vertices: ${totalVerts.toLocaleString()}`);

  // ── Compute raw bounding box (GEOMETRY ONLY) ───────────────
  const raw = computeGeometryBounds(meshes);
  const rawDims = raw.max.subtract(raw.min);
  console.log(`  Raw bounds: ${rawDims.x.toFixed(2)} × ${rawDims.y.toFixed(2)} × ${rawDims.z.toFixed(2)} (W×H×D)`);
  console.log(`  Raw Y range: ${raw.min.y.toFixed(4)} to ${raw.max.y.toFixed(4)}`);

  // ── Auto-scale to target height ─────────────────────────────
  const root = meshes[0];
  const maxDim = Math.max(rawDims.x, rawDims.y, rawDims.z);

  let scaleFactor = 1;
  if (maxDim > 0) {
    scaleFactor = MODEL.targetHeight / maxDim;
    root.scaling.setAll(scaleFactor);
  }

  // Force world matrix update
  root.computeWorldMatrix(true);
  for (const m of meshes) {
    m.computeWorldMatrix(true);
  }

  // Recompute after scaling (GEOMETRY ONLY)
  const scaled = computeGeometryBounds(meshes);

  // ── Center horizontally, BOTTOM at Y=0 ──────────────────────
  const scaledCenter = Vector3.Center(scaled.min, scaled.max);
  root.position.x = -scaledCenter.x;
  root.position.z = -scaledCenter.z;
  root.position.y = -scaled.min.y; // lowest geometry point → ground

  console.log(`  Scale factor: ${scaleFactor.toFixed(6)}x`);
  console.log(`  Root position offset: (${root.position.x.toFixed(4)}, ${root.position.y.toFixed(4)}, ${root.position.z.toFixed(4)})`);
  console.log(`  Scaled min Y = ${scaled.min.y.toFixed(4)}, offset = ${root.position.y.toFixed(4)} → bottom at ground`);

  // Final world matrix update after repositioning
  root.computeWorldMatrix(true);
  for (const m of meshes) {
    m.computeWorldMatrix(true);
  }

  // Final bounding box
  const final = computeGeometryBounds(meshes);
  const finalDims = final.max.subtract(final.min);
  const finalCenter = Vector3.Center(final.min, final.max);

  console.log(`  Final size: ${finalDims.x.toFixed(2)} × ${finalDims.y.toFixed(2)} × ${finalDims.z.toFixed(2)} m`);
  console.log(`  Final center: (${finalCenter.x.toFixed(3)}, ${finalCenter.y.toFixed(3)}, ${finalCenter.z.toFixed(3)})`);
  console.log(`  Final Y range: ${final.min.y.toFixed(4)} to ${final.max.y.toFixed(4)} (should start at ~0)`);

  // ── Shadows ─────────────────────────────────────────────────
  let shadowCasters = 0;
  for (const mesh of meshes) {
    const verts = mesh.getTotalVertices();
    if (verts > 0 && verts < 50000) {
      shadowGen.addShadowCaster(mesh);
      shadowCasters++;
    }
    mesh.receiveShadows = true;
  }
  console.log(`  Shadow casters: ${shadowCasters}/${meshes.length}`);
  console.log(`%c╚══════════════════════════════╝`, "color: #4fc3f7; font-weight: bold");

  return {
    meshes,
    center: finalCenter,
    height: finalDims.y,
    width: finalDims.x,
    depth: finalDims.z,
    scale: scaleFactor,
  };
}

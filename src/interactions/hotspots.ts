import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  AbstractMesh,
  ActionManager,
  ExecuteCodeAction,
  Animation,
  Observer,
} from "@babylonjs/core";
import { HOTSPOTS, HOTSPOT_STYLE, HotspotData } from "../utils/config";
import type { ModelInfo } from "../scene/modelLoader";

/**
 * Hotspot marker system — hotspots FOLLOW their parent meshes.
 *
 * Each hotspot is anchored to a named mesh. A per-frame observer
 * continuously repositions each hotspot at its parent mesh's
 * bounding box center, so hotspots move with exploded view.
 */

interface HotspotMarker {
  data: HotspotData;
  sphere: Mesh;
  stem: Mesh;
  /** The mesh this hotspot is anchored to */
  targetMesh: AbstractMesh;
  /** Offset above the mesh center */
  yOffset: number;
  /** Stem length for positioning below sphere */
  stemLength: number;
}

let markers: HotspotMarker[] = [];
let visible = false;
let trackingObserver: Observer<Scene> | null = null;

let onActivateCallback: ((data: HotspotData, worldPos: Vector3) => void) | null = null;

export function onHotspotActivated(
  cb: (data: HotspotData, worldPos: Vector3) => void
): void {
  onActivateCallback = cb;
}

/**
 * Create hotspot markers in the scene.
 * Only creates markers for meshes that actually exist in the model.
 * All markers start DISABLED (hidden) — call showHotspots() after doors open.
 */
export function createHotspots(scene: Scene, modelInfo?: ModelInfo): void {
  const modelHeight = modelInfo?.height ?? 2.5;
  const loadedMeshes = modelInfo?.meshes ?? [];

  const sphereRadius = modelHeight * HOTSPOT_STYLE.radiusRatio;
  const stemLength = modelHeight * HOTSPOT_STYLE.stemLengthRatio;
  const yOffset = sphereRadius * 2;

  // Shared materials
  const mat = new StandardMaterial("hotspotMat", scene);
  mat.emissiveColor = HOTSPOT_STYLE.color;
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.alpha = HOTSPOT_STYLE.alpha;
  mat.backFaceCulling = false;

  const stemMat = new StandardMaterial("stemMat", scene);
  stemMat.emissiveColor = HOTSPOT_STYLE.stemColor;
  stemMat.diffuseColor = Color3.Black();
  stemMat.specularColor = Color3.Black();
  stemMat.disableLighting = true;

  console.log("Creating hotspots...");

  for (const hotspot of HOTSPOTS) {
    const targetMesh = loadedMeshes.find(
      (m) => m.name.toLowerCase() === hotspot.meshName.toLowerCase()
    );

    if (!targetMesh) {
      console.warn(`  Hotspot "${hotspot.id}": mesh "${hotspot.meshName}" NOT FOUND — skipping`);
      continue;
    }

    targetMesh.computeWorldMatrix(true);
    const bb = targetMesh.getBoundingInfo().boundingBox;
    const center = bb.centerWorld.clone();
    const pos = center.clone();
    pos.y += yOffset;

    console.log(
      `  Hotspot "${hotspot.id}" → mesh "${targetMesh.name}" at (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)})`
    );

    // ── Glowing sphere ────────────────────────────────────────
    const sphere = MeshBuilder.CreateSphere(
      `hotspot_${hotspot.id}`,
      { diameter: sphereRadius * 2, segments: 12 },
      scene
    );
    sphere.position = pos;
    sphere.material = mat;
    sphere.receiveShadows = false;
    sphere.isPickable = true;

    // ── Pulsing animation ─────────────────────────────────────
    createPulseAnimation(sphere, scene);

    // ── Click interaction ─────────────────────────────────────
    sphere.actionManager = new ActionManager(scene);
    sphere.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        if (onActivateCallback) {
          onActivateCallback(hotspot, sphere.absolutePosition.clone());
        }
      })
    );

    // ── Thin vertical stem below the sphere ───────────────────
    const stem = MeshBuilder.CreateCylinder(
      `stem_${hotspot.id}`,
      {
        height: stemLength,
        diameter: Math.max(0.002, sphereRadius * 0.1),
        tessellation: 6,
      },
      scene
    );
    stem.position = pos.clone().subtract(new Vector3(0, sphereRadius + stemLength / 2, 0));
    stem.material = stemMat;
    stem.isPickable = false;
    stem.receiveShadows = false;

    markers.push({ data: hotspot, sphere, stem, targetMesh, yOffset, stemLength });

    // Start HIDDEN
    sphere.setEnabled(false);
    stem.setEnabled(false);
  }

  visible = false;
  console.log(`Hotspots created: ${markers.length} (started hidden — shown when doors open)`);

  // ── Per-frame tracking observer ──────────────────────────────
  // Continuously repositions hotspots at their parent mesh's current center.
  // This makes hotspots follow meshes during exploded view animation.
  trackingObserver = scene.onBeforeRenderObservable.add(() => {
    if (!visible) return;

    for (const m of markers) {
      m.targetMesh.computeWorldMatrix(true);
      const bb = m.targetMesh.getBoundingInfo().boundingBox;
      const center = bb.centerWorld;

      // Sphere above center
      m.sphere.position.x = center.x;
      m.sphere.position.y = center.y + m.yOffset;
      m.sphere.position.z = center.z;

      // Stem below sphere
      const sphereRadius = m.sphere.getBoundingInfo().boundingBox.extendSizeWorld.y;
      m.stem.position.x = center.x;
      m.stem.position.y = center.y + m.yOffset - sphereRadius - m.stemLength / 2;
      m.stem.position.z = center.z;
    }
  });
}

function createPulseAnimation(sphere: Mesh, scene: Scene): void {
  const fps = 30;
  const totalFrames = Math.round(HOTSPOT_STYLE.pulsePeriod * fps);

  const scaleAnim = new Animation(
    `pulse_scale_${sphere.name}`,
    "scaling",
    fps,
    Animation.ANIMATIONTYPE_VECTOR3,
    Animation.ANIMATIONLOOPMODE_CYCLE
  );

  const sMin = HOTSPOT_STYLE.scaleMin;
  const sMax = HOTSPOT_STYLE.scaleMax;
  const sMid = (sMin + sMax) / 2;

  scaleAnim.setKeys([
    { frame: 0, value: new Vector3(sMid, sMid, sMid) },
    { frame: Math.round(totalFrames * 0.25), value: new Vector3(sMax, sMax, sMax) },
    { frame: Math.round(totalFrames * 0.5), value: new Vector3(sMid, sMid, sMid) },
    { frame: Math.round(totalFrames * 0.75), value: new Vector3(sMin, sMin, sMin) },
    { frame: totalFrames, value: new Vector3(sMid, sMid, sMid) },
  ]);
  sphere.animations.push(scaleAnim);

  const vMin = HOTSPOT_STYLE.visMin;
  const vMax = HOTSPOT_STYLE.visMax;
  const vMid = (vMin + vMax) / 2;

  const visAnim = new Animation(
    `pulse_vis_${sphere.name}`,
    "visibility",
    fps,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE
  );
  visAnim.setKeys([
    { frame: 0, value: vMid },
    { frame: Math.round(totalFrames * 0.25), value: vMax },
    { frame: Math.round(totalFrames * 0.5), value: vMid },
    { frame: Math.round(totalFrames * 0.75), value: vMin },
    { frame: totalFrames, value: vMid },
  ]);
  sphere.animations.push(visAnim);

  scene.beginAnimation(sphere, 0, totalFrames, true);
}

/** Show all hotspot markers. */
export function showHotspots(): void {
  for (const m of markers) {
    m.sphere.setEnabled(true);
    m.stem.setEnabled(true);
  }
  visible = true;
}

/** Hide all hotspot markers. */
export function hideHotspots(): void {
  for (const m of markers) {
    m.sphere.setEnabled(false);
    m.stem.setEnabled(false);
  }
  visible = false;
}

/** Toggle hotspot marker visibility. */
export function toggleHotspots(): void {
  if (visible) {
    hideHotspots();
  } else {
    showHotspots();
  }
}

/** Returns true if hotspot markers are currently visible. */
export function areHotspotsVisible(): boolean {
  return visible;
}

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
  ring: Mesh;
  /** Faint wide halo behind the inner ring — pulls the eye in busy scenes */
  halo: Mesh;
  /** Dark disc behind the sphere so cyan reads against bright skyboxes */
  backing: Mesh;
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
    // The v4 GLB splits each Blender object into per-material primitives:
    // capacitor_bank → capacitor_bank_primitive0 / _primitive1, etc.
    // Match by *prefix* and anchor the marker to whichever primitive has
    // the most vertices (i.e. the "main" body of that subsystem).
    const wanted = hotspot.meshName.toLowerCase();
    const candidates = loadedMeshes.filter((m) => {
      const n = m.name.toLowerCase();
      return n === wanted || n.startsWith(wanted + "_") || n.startsWith(wanted + ".");
    });

    let targetMesh = candidates[0] ?? null;
    if (candidates.length > 1) {
      // Pick the largest — usually the dominant-geometry primitive.
      let bestVerts = -1;
      for (const c of candidates) {
        const verts = c.getTotalVertices();
        if (verts > bestVerts) {
          bestVerts = verts;
          targetMesh = c;
        }
      }
    }

    if (!targetMesh) {
      console.warn(`  Hotspot "${hotspot.id}": mesh "${hotspot.meshName}" NOT FOUND — skipping`);
      continue;
    }
    if (candidates.length > 1) {
      console.log(
        `  Hotspot "${hotspot.id}": "${hotspot.meshName}" → ${candidates.length} primitives, anchored to "${targetMesh.name}" (${targetMesh.getTotalVertices().toLocaleString()} verts)`
      );
    }

    targetMesh.computeWorldMatrix(true);
    const bb = targetMesh.getBoundingInfo().boundingBox;
    const center = bb.centerWorld.clone();
    const pos = center.clone();
    const boost = hotspot.yBoost ?? 0;
    pos.y += yOffset + boost;

    console.log(
      `  Hotspot "${hotspot.id}" → mesh "${targetMesh.name}" at (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)})${boost ? ` (yBoost: ${boost})` : ""}`
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

    // ── Dark backing disc — kills bright skybox bleed-through ──
    // A flat near-black disc placed BEHIND the sphere (slight offset)
    // so the cyan sphere doesn't get washed out against the
    // industrial / site / concrete photo skyboxes.
    const backing = MeshBuilder.CreateDisc(
      `hotspot_backing_${hotspot.id}`,
      { radius: sphereRadius * 1.6, tessellation: 24 },
      scene
    );
    backing.position = pos.clone();
    backing.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const backingMat = new StandardMaterial(`backingMat_${hotspot.id}`, scene);
    backingMat.diffuseColor = Color3.Black();
    backingMat.emissiveColor = new Color3(0.04, 0.06, 0.09);
    backingMat.specularColor = Color3.Black();
    backingMat.alpha = 0.78;
    backingMat.disableLighting = true;
    backing.material = backingMat;
    backing.isPickable = false;
    backing.receiveShadows = false;
    backing.renderingGroupId = 0;

    // ── Border ring — bright cyan outline for visibility ──────
    // Thicker (0.45 → 0.65) and brighter so markers read at distance.
    const ring = MeshBuilder.CreateTorus(
      `ring_${hotspot.id}`,
      {
        diameter: sphereRadius * 2.8,
        thickness: sphereRadius * 0.65,
        tessellation: 24,
      },
      scene
    );
    ring.position = pos.clone();
    ring.rotation.x = Math.PI / 2; // lay flat around sphere
    const ringMat = new StandardMaterial(`ringMat_${hotspot.id}`, scene);
    ringMat.emissiveColor = new Color3(0.4, 0.95, 1.0);
    ringMat.diffuseColor = Color3.Black();
    ringMat.specularColor = Color3.Black();
    ringMat.alpha = 0.85;
    ringMat.disableLighting = true;
    ring.material = ringMat;
    ring.isPickable = false;
    ring.receiveShadows = false;

    // ── Outer halo ring — soft 4× wide glow that pulls the eye ─
    const halo = MeshBuilder.CreateTorus(
      `halo_${hotspot.id}`,
      {
        diameter: sphereRadius * 4.0,
        thickness: sphereRadius * 0.18,
        tessellation: 28,
      },
      scene
    );
    halo.position = pos.clone();
    halo.rotation.x = Math.PI / 2;
    const haloMat = new StandardMaterial(`haloMat_${hotspot.id}`, scene);
    haloMat.emissiveColor = new Color3(0.4, 0.95, 1.0);
    haloMat.diffuseColor = Color3.Black();
    haloMat.specularColor = Color3.Black();
    haloMat.alpha = 0.22;
    haloMat.disableLighting = true;
    halo.material = haloMat;
    halo.isPickable = false;
    halo.receiveShadows = false;

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

    markers.push({
      data: hotspot,
      sphere,
      ring,
      halo,
      backing,
      stem,
      targetMesh,
      yOffset: yOffset + boost,
      stemLength,
    });

    // Start HIDDEN
    sphere.setEnabled(false);
    ring.setEnabled(false);
    halo.setEnabled(false);
    backing.setEnabled(false);
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

      const py = center.y + m.yOffset;

      // Sphere above center
      m.sphere.position.x = center.x;
      m.sphere.position.y = py;
      m.sphere.position.z = center.z;

      // Ring around sphere
      m.ring.position.x = center.x;
      m.ring.position.y = py;
      m.ring.position.z = center.z;

      // Halo (wider concentric ring) — same plane as the inner ring
      m.halo.position.x = center.x;
      m.halo.position.y = py;
      m.halo.position.z = center.z;

      // Backing disc — billboards toward viewer; sit it AT the sphere
      // (slight depth bias handled by isPickable=false + render order).
      m.backing.position.x = center.x;
      m.backing.position.y = py;
      m.backing.position.z = center.z;

      // Stem below sphere
      const sphereRadius = m.sphere.getBoundingInfo().boundingBox.extendSizeWorld.y;
      m.stem.position.x = center.x;
      m.stem.position.y = py - sphereRadius - m.stemLength / 2;
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
    m.backing.setEnabled(true);
    m.sphere.setEnabled(true);
    m.ring.setEnabled(true);
    m.halo.setEnabled(true);
    m.stem.setEnabled(true);
  }
  visible = true;
}

/** Hide all hotspot markers. */
export function hideHotspots(): void {
  for (const m of markers) {
    m.backing.setEnabled(false);
    m.sphere.setEnabled(false);
    m.ring.setEnabled(false);
    m.halo.setEnabled(false);
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

/**
 * One-shot attention pulse on every visible hotspot ring.
 *
 * Briefly scales the ring up and back down over ~700ms so the user sees
 * "look, these glowing things are interactive". Used when the tutorial
 * finishes — we want to draw the eye to the hotspots before the user
 * starts free-exploring. Optionally restrict to specific hotspot ids
 * (e.g. only the ones the user hasn't inspected yet).
 */
export function pulseHotspotsOnce(idsToPulse?: string[]): void {
  if (markers.length === 0) return;
  const filterSet = idsToPulse ? new Set(idsToPulse) : null;
  const targets = filterSet
    ? markers.filter((m) => filterSet.has(m.data.id))
    : markers.slice();
  if (targets.length === 0) return;

  // Make sure rings are visible first — in case the caller forgot.
  for (const m of targets) m.ring.setEnabled(true);

  const duration = 700;
  const peakScale = 1.6;
  const startTime = performance.now();

  // Capture base scales so we restore exactly to where they were.
  const bases = targets.map((m) => m.ring.scaling.clone());

  const tick = () => {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    // bell curve: 0 → 1 → 0
    const bell = Math.sin(Math.PI * t);
    const factor = 1 + (peakScale - 1) * bell;

    for (let i = 0; i < targets.length; i++) {
      const ring = targets[i].ring;
      ring.scaling.x = bases[i].x * factor;
      ring.scaling.y = bases[i].y * factor;
      ring.scaling.z = bases[i].z * factor;
    }

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      // Restore base scales precisely.
      for (let i = 0; i < targets.length; i++) {
        targets[i].ring.scaling.copyFrom(bases[i]);
      }
    }
  };
  requestAnimationFrame(tick);
}

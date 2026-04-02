import { Color3, Color4, Vector3 } from "@babylonjs/core";

// ── Environment ──────────────────────────────────────────────
export const ENV = {
  /** Scene clear color — very dark blue-black for product studio feel */
  clearColor: new Color4(0.02, 0.02, 0.06, 1),
  /** Ground plane size in meters */
  groundSize: 40,
  /** Ground color — dark reflective surface */
  groundColor: new Color3(0.04, 0.04, 0.06),
  /** Ground reflectivity (0 = matte, 1 = mirror) */
  groundReflectivity: 0.35,
  /** Ambient light intensity — just enough so nothing is pitch black */
  ambientIntensity: 0.15,
};

// ── Lighting ─────────────────────────────────────────────────
/** Light colors and intensities. Positions are computed relative to model bounds. */
export const LIGHTS = {
  key: {
    intensity: 3.5,
    color: new Color3(1, 0.95, 0.88),
    angle: Math.PI / 3,
    exponent: 2,
  },
  fill: {
    intensity: 1.8,
    color: new Color3(0.85, 0.9, 1.0),
    angle: Math.PI / 2.5,
    exponent: 1.5,
  },
  rim: {
    intensity: 2.2,
    color: new Color3(0.8, 0.85, 1.0),
    angle: Math.PI / 3,
    exponent: 2,
  },
  /** Interior point light — turns on when doors open to illuminate internals */
  interior: {
    intensity: 3.0,
    color: new Color3(1, 0.97, 0.92),
    range: 5,
  },
};

// ── Model ────────────────────────────────────────────────────
export const MODEL = {
  /** Path to the GLB model file (relative to public/) */
  path: "models/",
  /** Optimized v3 model — 6.18 MB, split meshes with door hinges */
  fileName: "panel_optimized_v3.glb",
  /** Target height of the panel in meters (auto-scaled to fit) */
  targetHeight: 2.5,
  /** Position the model center-base sits on the ground */
  position: new Vector3(0, 0, 0),
};

// ── Door / Panel / Cover System ──────────────────────────────
/**
 * Uses EXCLUSION approach: the door system fades everything that is NOT
 * a known internal component or the structural frame.
 * This catches all doors, panels, covers regardless of naming convention.
 *
 * The keep-visible list is defined in doorAnimations.ts.
 */
export const DOORS = {
  /** The structural frame mesh name — STAYS visible at full opacity */
  frameName: "frame_structure",
  /** Fade target opacity for exploded view (nearly invisible) */
  fadeToAlpha: 0.05,
  /** Fade target opacity for "Open Doors" (semi-transparent ghost shell) */
  doorOpenAlpha: 0.25,
  /** Animation duration in seconds */
  fadeDuration: 0.8,
  /** Door swing configuration */
  swing: {
    /** Mesh names that swing open (rotate around local Y-axis) */
    meshNames: ["door_front_main"],
    /** Swing angle in radians (-110° = doors open outward) */
    angle: -(110 * Math.PI) / 180,
    /** Swing animation duration in seconds */
    duration: 1.0,
    /** Secondary doors that swing or fade if pivots aren't set */
    secondaryMeshNames: ["door_internal_divider", "door_cable_chamber"],
  },
};

// ── Exploded View ────────────────────────────────────────────
/**
 * Named assemblies with explicit movement directions.
 * Meshes are matched by prefix (startsWith) so terminal_rail_01..05 all match "terminal_rail".
 */
export interface ExplodeRule {
  /** Mesh name or prefix to match */
  nameMatch: string;
  /** Whether to match as prefix (true) or exact name (false) */
  isPrefix: boolean;
  /** World-space displacement when exploded */
  displacement: Vector3;
}

export const EXPLODED = {
  /** Animation duration in seconds */
  animDuration: 1.5,
  /** Named explosion rules — each assembly moves in a logical direction */
  rules: [
    { nameMatch: "busbar_assembly", isPrefix: false, displacement: new Vector3(0, 1.0, 0) },
    { nameMatch: "capacitor_bank", isPrefix: false, displacement: new Vector3(1.5, 0, 0) },
    { nameMatch: "cable_assembly", isPrefix: false, displacement: new Vector3(-1.5, 0, 0) },
    { nameMatch: "terminal_rail", isPrefix: true, displacement: new Vector3(0, 0, -1.0) },
    { nameMatch: "cable_box", isPrefix: true, displacement: new Vector3(0, 0, 1.0) },
  ] as ExplodeRule[],
};

// ── Hotspots ─────────────────────────────────────────────────
export interface HotspotData {
  id: string;
  /** Mesh name to position this hotspot at (bounding box center). If not found, hotspot is skipped. */
  meshName: string;
  title: string;
  description: string;
}

/**
 * Hotspot definitions — positioned at real named component meshes.
 * If a mesh isn't found by name, the hotspot is NOT created (no random placement).
 */
export const HOTSPOTS: HotspotData[] = [
  {
    id: "busbar",
    meshName: "busbar_assembly",
    title: "Busbar System",
    description:
      "Copper conductors rated for 3150A continuous current. Distributes power across all circuits with minimal resistance loss.",
  },
  {
    id: "capacitor",
    meshName: "capacitor_bank",
    title: "HV Capacitor Bank",
    description:
      "Power factor correction and harmonic filtering. High-voltage capacitor bank for reactive power compensation.",
  },
  {
    id: "cable",
    meshName: "cable_assembly",
    title: "Cable Management",
    description:
      "Segregated power and control cable routing. Structured pathways ensure safety compliance and serviceability.",
  },
  {
    id: "terminal",
    meshName: "terminal_rail_01",
    title: "Terminal Rails",
    description:
      "PLC, MCB, and relay mounting with DIN rail. Terminal blocks and control modules for circuit monitoring.",
  },
  {
    id: "cablebox",
    meshName: "cable_box_main",
    title: "Cable Entry Boxes",
    description:
      "Sealed cable entry points with gland plates. Provides IP-rated cable management for incoming and outgoing power feeds.",
  },
];

/** Visual config for hotspot markers */
export const HOTSPOT_STYLE = {
  /** Sphere radius as a fraction of model height (~2.5% of height) */
  radiusRatio: 0.025,
  /** Stem length as a fraction of model height */
  stemLengthRatio: 0.06,
  /** Glow color — bright cyan */
  color: new Color3(0, 0.85, 1),
  /** Material alpha (slight transparency for soft glow) */
  alpha: 0.6,
  /** Pulse scale range — subtle breathing, not bouncing */
  scaleMin: 0.92,
  scaleMax: 1.08,
  /** Pulse speed — slow, gentle cycle in seconds */
  pulsePeriod: 2.4,
  /** Pulse visibility range — subtle fade, not blink */
  visMin: 0.55,
  visMax: 0.8,
  /** Stem color — dimmer version of hotspot color */
  stemColor: new Color3(0, 0.4, 0.5),
};

// ── Timing (seconds) ────────────────────────────────────────
export const TIMING = {
  introFade: 3,
  tutorialDuration: 6,
  orbitDuration: 10,
  idleResetTimeout: 30,
};

// ── Auto-Rotate (idle turntable in explore mode) ────────────
export const AUTO_ROTATE = {
  /** Rotation speed in radians/sec (very slow — showcase turntable) */
  speed: 0.04,
  /** Wait this many ms after last input before starting rotation */
  waitTime: 4000,
  /** Time in ms to ramp up to full speed */
  spinupTime: 3000,
};

// ── XR ───────────────────────────────────────────────────────
export const XR = {
  /** Floor height offset */
  floorHeight: 0,
  /** Teleportation ground meshes will be registered by name */
  teleportFloorMeshName: "ground",
};

import { Color3, Color4, Vector3 } from "@babylonjs/core";

// Environment
export const ENV = {
  /** ENSPEC Light Blue base background (#59c2d7) */
  clearColor: new Color4(0.349, 0.761, 0.843, 1),
  /** Ground plane size in meters */
  groundSize: 40,
  /** Keep the whole stage in the same ENSPEC family to avoid a mixed backdrop */
  groundColor: new Color3(0.349, 0.761, 0.843),
  /** Ground reflectivity (0 = matte, 1 = mirror) */
  groundReflectivity: 0.08,
  /** Light ambient fill so the white spotlight still reads as the hero light */
  ambientIntensity: 0.24,
};

// Lighting
export const LIGHTS = {
  key: {
    intensity: 4.2,
    color: new Color3(1, 1, 1),
    angle: Math.PI / 3.6,
    exponent: 2,
  },
  fill: {
    intensity: 1.25,
    color: new Color3(0.92, 0.97, 1.0),
    angle: Math.PI / 2.5,
    exponent: 1.5,
  },
  rim: {
    intensity: 1.5,
    color: new Color3(0.85, 0.95, 0.98),
    angle: Math.PI / 3,
    exponent: 2,
  },
  interior: {
    intensity: 2.8,
    color: new Color3(1, 0.97, 0.92),
    range: 5,
  },
};

// Model
export const MODEL = {
  path: "models/",
  fileName: "panel_optimized_v4.glb",
  targetHeight: 2.5,
  position: new Vector3(0, 0, 0),
};

// Door / shell fade system
export const DOORS = {
  frameName: "frame_structure",
  fadeToAlpha: 0.05,
  doorOpenAlpha: 0.25,
  fadeDuration: 0.8,
  swing: {
    meshNames: ["door_front_main"],
    angle: -(110 * Math.PI) / 180,
    duration: 1.0,
    secondaryMeshNames: ["door_internal_divider", "door_cable_chamber"],
  },
};

// Exploded view
export interface ExplodeRule {
  nameMatch: string;
  isPrefix: boolean;
  displacement: Vector3;
}

// Cabinet world-space size is roughly 6.7m × 2.8m × 2.6m (W×H×D).
// Earlier 1.0–1.5m offsets left parts overlapping the ghosted frame —
// boosted so each subsystem clears the enclosure boundary cleanly.
export const EXPLODED = {
  animDuration: 2.0,
  rules: [
    { nameMatch: "busbar_assembly", isPrefix: false, displacement: new Vector3(0, 2.5, 0) },   // up
    { nameMatch: "capacitor_bank", isPrefix: false, displacement: new Vector3(4.0, 0, 0) },    // right
    { nameMatch: "cable_assembly", isPrefix: false, displacement: new Vector3(-4.0, 0, 0) },   // left
    // terminal_rail (prefix) matches terminal_rail_01 in the rebuilt model
    { nameMatch: "terminal_rail", isPrefix: true, displacement: new Vector3(0, 0, -3.5) },     // back
  ] as ExplodeRule[],
};

// Hotspots
export interface HotspotData {
  id: string;
  meshName: string;
  title: string;
  description: string;
  /** Extra Y offset in meters (use for hotspots on hidden/underground meshes) */
  yBoost?: number;
}

export const HOTSPOTS: HotspotData[] = [
  {
    id: "busbar",
    meshName: "busbar_assembly",
    title: "Busbar System — 3150A",
    description:
      "3150A of live grid current flows through these copper bars at Indian Queens right now. That's enough for ~1,500 homes. Tin plating prevents oxidation and maintains conductivity over decades. Low impedance distribution backbone — every outgoing circuit draws from here.",
  },
  {
    id: "capacitor",
    meshName: "capacitor_bank",
    title: "HV Capacitor Bank",
    description:
      "The grid charges penalty fees for poor power factor. This bank corrects it automatically, saving the site operator thousands per year. Staged capacitor switching responds to live load conditions. Without it, the site would export reactive power it doesn't get paid for.",
  },
  {
    id: "cable",
    meshName: "cable_assembly",
    title: "Cable Management System",
    description:
      "11kV and 33kV power feeds share this cabinet safely — fire barriers and segregated routing enforce BS 7671 compliance. Structured pathways mean maintenance teams can work on one circuit without exposing adjacent live conductors. Every route is documented — nothing improvised.",
  },
  {
    id: "terminal",
    meshName: "terminal_rail_01",
    title: "Protection & Control Rails",
    description:
      "This DIN rail decides who gets power and who doesn't. Protection relays detect faults in microseconds and trip circuits before damage occurs. PLC I/O modules link to NGET's SCADA system for remote monitoring from the National Grid control room. Every connected load is individually measured and protected.",
  },
  {
    // The original cable_box_main mesh was fused into frame_structure during the
    // Blender rebuild. We anchor this hotspot to frame_structure with a high
    // yBoost so it floats clearly above the cabinet rather than disappearing.
    id: "cablebox",
    meshName: "frame_structure",
    title: "Cable Entry System",
    description:
      "This panel can grow without major works. IP65 gland plates accept new cable entries on-site — no modifications to the main chamber. EMC screening keeps interference out of control circuits. Future circuits are planned for; the infrastructure is already there.",
    yBoost: 1.2,
  },
];

export const HOTSPOT_STYLE = {
  radiusRatio: 0.045,
  stemLengthRatio: 0.08,
  /** ENSPEC Teal accent (#50c0af) */
  color: new Color3(0.314, 0.753, 0.686),
  alpha: 0.6,
  scaleMin: 0.92,
  scaleMax: 1.08,
  pulsePeriod: 2.4,
  visMin: 0.55,
  visMax: 0.8,
  stemColor: new Color3(0.18, 0.47, 0.43),
};

// Timing
export const TIMING = {
  introFade: 3,
  tutorialDuration: 6,
  orbitDuration: 10,
  idleResetTimeout: 30,
};

// Auto-rotate
export const AUTO_ROTATE = {
  speed: 0.04,
  waitTime: 4000,
  spinupTime: 3000,
};

// XR
export const XR = {
  floorHeight: 0,
  teleportFloorMeshName: "ground",
};

// Meshes to hide on load — base frame, cable trays, underground parts.
// Matched by substring (case-insensitive). Add more patterns after
// checking the console mesh name log.
export const HIDE_MESH_PATTERNS = [
  "base_frame",
  "plinth",
  "foundation",
  "cable_tray",
  "cable_ladder",
  "floor_plate",
  "mounting_rail",
];

/** Also hide any mesh whose bounding box center is below this Y (meters, after scaling) */
export const HIDE_BELOW_Y = -0.15;

// Skybox / environment backgrounds
export interface SkyboxOption {
  id: string;
  label: string;
  /** Path to equirectangular image in public/textures/. null = solid color only. */
  file: string | null;
  /**
   * Procedural fallback colour. Used when `file` is null OR when the image
   * fails to load. All options have a fallback so missing texture files never
   * crash the scene.
   */
  fallbackColor: Color4;
}

// TODO: drop real equirectangular photos at the paths below to upgrade these
// scenes from procedural colour to true 360° backgrounds. Until then, each
// option uses its `fallbackColor` as a flat scene clear colour.
export const SKYBOX_OPTIONS: SkyboxOption[] = [
  // Existing default — keep ENSPEC light blue clear colour
  { id: "dark_studio", label: "Dark Studio", file: null, fallbackColor: new Color4(0.349, 0.761, 0.843, 1) },
  // TODO: replace with public/textures/skybox_industrial.jpg
  { id: "industrial", label: "Industrial Facility", file: "skybox_industrial.jpg", fallbackColor: new Color4(0.102, 0.082, 0.071, 1) }, // #1a1512 dark warm grey
  // TODO: replace with public/textures/skybox_showroom.jpg
  { id: "showroom", label: "Exhibition Hall", file: "skybox_showroom.jpg", fallbackColor: new Color4(0.133, 0.141, 0.149, 1) }, // #222426 medium neutral grey
  // TODO: replace with public/textures/skybox_site.jpg
  { id: "site", label: "Indian Queens Site", file: "skybox_site.jpg", fallbackColor: new Color4(0.067, 0.094, 0.125, 1) }, // #111820 deep blue-grey
];

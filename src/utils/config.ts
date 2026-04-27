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
  fileName: "panel_optimized_v3.glb",
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

export const EXPLODED = {
  animDuration: 1.5,
  rules: [
    { nameMatch: "busbar_assembly", isPrefix: false, displacement: new Vector3(0, 1.0, 0) },
    { nameMatch: "capacitor_bank", isPrefix: false, displacement: new Vector3(1.5, 0, 0) },
    { nameMatch: "cable_assembly", isPrefix: false, displacement: new Vector3(-1.5, 0, 0) },
    { nameMatch: "terminal_rail", isPrefix: true, displacement: new Vector3(0, 0, -1.0) },
    { nameMatch: "cable_box", isPrefix: true, displacement: new Vector3(0, 0, 1.0) },
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
      "Tin-plated copper busbars rated for 3150A continuous current. Low-impedance distribution backbone connecting all outgoing circuits. Designed to BS EN 61439 with verified temperature rise limits.",
  },
  {
    id: "capacitor",
    meshName: "capacitor_bank",
    title: "HV Capacitor Bank",
    description:
      "Reactive power compensation unit for power factor correction. Reduces kVAr demand charges and harmonics. Automatic staged switching responds to real-time load conditions at the Indian Queens site.",
  },
  {
    id: "cable",
    meshName: "cable_assembly",
    title: "Cable Management System",
    description:
      "Fully segregated power and control cable routing. Structured pathways with fire barriers between compartments ensure BS 7671 compliance and safe, tool-free access for maintenance teams.",
  },
  {
    id: "terminal",
    meshName: "terminal_rail_01",
    title: "Protection & Control Rails",
    description:
      "DIN-rail mounted protection relays, MCBs, and PLC I/O modules. Each circuit is individually monitored — fault detection, load measurement, and remote trip capability for NGET SCADA integration.",
  },
  {
    id: "cablebox",
    meshName: "cable_box_main",
    title: "Cable Entry System",
    description:
      "IP65-rated cable entry boxes with compression glands. Accommodates 11kV and 33kV power feeds with EMC screening. Gland plates allow future cable additions without panel modification.",
    yBoost: 0.4,
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
  /** Path to equirectangular image in public/textures/. null = solid color (current default) */
  file: string | null;
}

export const SKYBOX_OPTIONS: SkyboxOption[] = [
  { id: "dark_studio", label: "Dark Studio", file: null },
  { id: "industrial", label: "Industrial Facility", file: "skybox_industrial.jpg" },
  { id: "showroom", label: "Exhibition Hall", file: "skybox_showroom.jpg" },
  { id: "site", label: "Indian Queens Site", file: "skybox_site.jpg" },
];

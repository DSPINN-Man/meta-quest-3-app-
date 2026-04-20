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
}

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

export const HOTSPOT_STYLE = {
  radiusRatio: 0.025,
  stemLengthRatio: 0.06,
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

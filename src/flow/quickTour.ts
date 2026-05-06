import { Scene } from "@babylonjs/core";
import { showGuidedPrompt, hideGuidedPrompt } from "../ui/guidedPrompt";
import { setSpectatorStatus } from "../ui/spectatorOverlay";

export interface QuickTourActions {
  moveCloser: () => Promise<void> | void;
  revealInterior: () => Promise<void> | void;
  explode: () => Promise<void> | void;
  reset: () => Promise<void> | void;
}

interface ScheduleEntry {
  at: number;
  run: () => Promise<void> | void;
}

let activeTourSkipFlag = false;
let tourActive = false;

export function isQuickTourActive(): boolean {
  return tourActive;
}

export function skipQuickTourAct(): void {
  if (tourActive) activeTourSkipFlag = true;
}

export async function runQuickTour(
  _scene: Scene,
  actions: QuickTourActions
): Promise<void> {
  if (tourActive) return;

  tourActive = true;
  activeTourSkipFlag = false;

  showGuidedPrompt(
    "Why this cabinet exists",
    "A 33 kV feed supports around 1,500 homes from Indian Queens.\n\n" +
    "This cabinet keeps that supply stable when faults, surges, or weather hit the network.",
    "Starting tour"
  );
  setSpectatorStatus("Quick Tour", "Why this cabinet exists");

  const schedule: ScheduleEntry[] = [
    {
      at: 8,
      run: async () => {
        showGuidedPrompt(
          "Rated for real load",
          "The assembly is built for 3150 A continuous current.\n\n" +
          "It carries the feed, watches each circuit, and trips fast when something moves out of range.",
          "Moving closer"
        );
        setSpectatorStatus("Quick Tour", "Rated for real load");
        await actions.moveCloser();
      },
    },
    {
      at: 18,
      run: async () => {
        showGuidedPrompt(
          "Inside the cabinet",
          "The outer shell fades so the working layout is visible:\n\n" +
          "busbars, capacitor bank, cable routes, and protection rail.",
          "Opening view"
        );
        setSpectatorStatus("Quick Tour", "Inside the cabinet");
        await actions.revealInterior();
      },
    },
    {
      at: 35,
      run: async () => {
        showGuidedPrompt(
          "Subsystems",
          "Busbars carry the main current.\n" +
          "Capacitors correct power factor.\n" +
          "Cable routes keep circuits separated.\n" +
          "Protection gear links the cabinet to SCADA.",
          "Exploded view"
        );
        setSpectatorStatus("Quick Tour", "Subsystems");
        await actions.explode();
      },
    },
    {
      at: 65,
      run: () => {
        showGuidedPrompt(
          "Built to stay online",
          "Tin-plated copper resists oxidation.\n" +
          "IP65 entries protect the cable chamber.\n" +
          "Modular rails make service faster.\n" +
          "SCADA visibility helps teams react early.",
          "Final note"
        );
        setSpectatorStatus("Quick Tour", "Built to stay online");
      },
    },
    {
      at: 90,
      run: async () => {
        await actions.reset();
        showGuidedPrompt(
          "Explore",
          "Right stick walks around.\n" +
          "Left stick spins the model.\n" +
          "Click the glowing dots to inspect each subsystem.",
          "You have control"
        );
      },
    },
  ];

  const startTime = performance.now();
  for (const entry of schedule) {
    const targetMs = entry.at * 1000;
    while (performance.now() - startTime < targetMs) {
      if (activeTourSkipFlag) break;
      await sleep(200);
    }
    activeTourSkipFlag = false;
    try {
      await entry.run();
    } catch (err) {
      console.warn(`Quick Tour: step at t=${entry.at}s failed`, err);
    }
  }

  const finalHoldMs = 6000;
  const finalStart = performance.now();
  while (performance.now() - finalStart < finalHoldMs) {
    if (activeTourSkipFlag) break;
    await sleep(200);
  }
  activeTourSkipFlag = false;
  hideGuidedPrompt();
  tourActive = false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

import { Scene } from "@babylonjs/core";
import { showGuidedPrompt, hideGuidedPrompt } from "../ui/guidedPrompt";

/**
 * Quick Tour — a 2-minute auto-guided experience.
 * The system performs each action automatically with narration cards.
 * The user just watches (no button presses needed).
 *
 * Actions are injected from main.ts since they depend on scene state.
 */

export interface QuickTourActions {
  moveCloser: () => Promise<void> | void;
  revealInterior: () => Promise<void> | void;
  explode: () => Promise<void> | void;
  reset: () => Promise<void> | void;
}

const TOUR_STEPS = [
  {
    title: "33kV Indian Queens Switchgear",
    body: "This is the Panos control panel — a 33kV switchgear assembly engineered for the Indian Queens substation (NGET).\n\nLet's take a closer look...",
    delay: 5000,
    action: "moveCloser" as const,
  },
  {
    title: "Inside The Panel",
    body: "The outer shell fades away to reveal the internal engineering.\n\nBusbars, capacitor banks, terminal rails, and cable management — all precisely arranged for safe, reliable power distribution.",
    delay: 6000,
    action: "revealInterior" as const,
  },
  {
    title: "Exploded View",
    body: "Each subsystem separates to show how the components relate.\n\nThe glowing markers highlight key assemblies — busbars rated for 3150A, HV capacitor banks for power factor correction, and DIN-rail mounted protection devices.",
    delay: 8000,
    action: "explode" as const,
  },
  {
    title: "Engineered For Performance",
    body: "Every detail is designed for reliability:\n\n• Segregated cable routing for safety compliance\n• IP-rated cable entry for environmental protection\n• Modular terminal rails for efficient maintenance\n• Copper busbars minimising resistance loss",
    delay: 7000,
    action: null,
  },
  {
    title: "Ready To Explore",
    body: "The guided tour is complete.\n\nYou can now explore freely — use the right joystick to move around and the left joystick to spin the model. Point at glowing dots to inspect individual components.",
    delay: 5000,
    action: "reset" as const,
  },
];

export async function runQuickTour(
  scene: Scene,
  actions: QuickTourActions
): Promise<void> {
  for (const step of TOUR_STEPS) {
    showGuidedPrompt(step.title, step.body, "");

    // Execute the action after a brief reading pause
    if (step.action) {
      await sleep(2000);
      await actions[step.action]();
    }

    // Wait for the full step duration
    await sleep(step.delay);
  }

  hideGuidedPrompt();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

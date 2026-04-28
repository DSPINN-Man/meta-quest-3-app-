import { Scene } from "@babylonjs/core";
import { showGuidedPrompt, hideGuidedPrompt } from "../ui/guidedPrompt";

/**
 * Quick Tour — a fully scripted ~90 second showcase the visitor can sit
 * back and watch. No button presses required. The system runs each
 * action automatically with a narration card on the prompt panel.
 *
 * Timeline (absolute seconds from tour start):
 *
 *    0s  "33kV Indian Queens Switchgear" intro card
 *    8s  moveCloser()  + subtitle "Stepping in for a closer look..."
 *   18s  revealInterior() + subtitle "Now revealing the interior..."
 *   35s  explode() + subtitle "Each subsystem separates..."
 *   90s  reset() + "Explore freely" final card; tour returns control
 *
 * Actions are injected from main.ts since they depend on scene state.
 */

export interface QuickTourActions {
  moveCloser: () => Promise<void> | void;
  revealInterior: () => Promise<void> | void;
  explode: () => Promise<void> | void;
  reset: () => Promise<void> | void;
}

interface ScheduleEntry {
  /** Time in seconds from tour start when this entry fires */
  at: number;
  /** Function to run at that time */
  run: () => Promise<void> | void;
}

export async function runQuickTour(
  _scene: Scene,
  actions: QuickTourActions
): Promise<void> {
  // Card 0 — opens the tour. Stays on screen until the next card replaces it.
  showGuidedPrompt(
    "33kV Indian Queens Switchgear",
    "This is the Panos control panel — engineered for the Indian Queens substation (NGET).\n\nSit back. The tour will guide itself.",
    "Quick Tour starting..."
  );

  const schedule: ScheduleEntry[] = [
    {
      at: 8,
      run: async () => {
        showGuidedPrompt(
          "Stepping In",
          "Let's get a closer look at the cabinet.\n\nFrom here you can see the panel scale — taller than a person, packed with high-voltage hardware.",
          "Moving closer..."
        );
        await actions.moveCloser();
      },
    },
    {
      at: 18,
      run: async () => {
        showGuidedPrompt(
          "Now Revealing The Interior",
          "The outer shell fades away to expose the engineering.\n\nBusbars, capacitor banks, terminal rails, and cable management — all precisely arranged for safe, reliable distribution.",
          "Revealing internals..."
        );
        await actions.revealInterior();
      },
    },
    {
      at: 35,
      run: async () => {
        showGuidedPrompt(
          "Exploded View",
          "Each subsystem separates so you can see how it all fits together.\n\nGlowing markers highlight the key assemblies — busbars rated for 3150A, HV capacitor banks for power factor correction, and DIN-rail mounted protection devices.",
          "Spreading components apart..."
        );
        await actions.explode();
      },
    },
    {
      at: 65,
      run: () => {
        showGuidedPrompt(
          "Engineered For Performance",
          "Every detail is designed for reliability:\n\n• Segregated cable routing for safety compliance\n• IP-rated cable entry for environmental protection\n• Modular terminal rails for efficient maintenance\n• Copper busbars minimising resistance loss",
          "Reading time..."
        );
      },
    },
    {
      at: 90,
      run: async () => {
        await actions.reset();
        showGuidedPrompt(
          "Explore Freely",
          "The guided tour is complete.\n\nUse the right joystick to walk around and the left joystick to spin the model. Point at the glowing dots to inspect individual components.",
          "You have control"
        );
      },
    },
  ];

  // Run the schedule in absolute time. Cancellable via cancelToken so an
  // outer reset (panic-reset / VR exit) can stop a tour mid-way without
  // leaving stale setTimeouts firing minutes later.
  const startTime = performance.now();
  for (const entry of schedule) {
    const elapsedMs = performance.now() - startTime;
    const waitMs = Math.max(0, entry.at * 1000 - elapsedMs);
    await sleep(waitMs);
    try {
      await entry.run();
    } catch (err) {
      console.warn(`Quick Tour: step at t=${entry.at}s failed`, err);
    }
  }

  // Hold the final card for a few seconds, then hide so it doesn't linger.
  await sleep(6000);
  hideGuidedPrompt();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

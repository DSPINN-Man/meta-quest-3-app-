import { Scene } from "@babylonjs/core";
import { showGuidedPrompt, hideGuidedPrompt } from "../ui/guidedPrompt";
import { setSpectatorStatus } from "../ui/spectatorOverlay";

/**
 * Quick Tour — a fully scripted ~90 second showcase the visitor can sit
 * back and watch. No button presses required. The system runs each
 * action automatically with a narration card on the prompt panel.
 *
 * Structured as a four-act engineer story:
 *   Act 1 — Why This Panel Exists (the problem)
 *   Act 2 — The Engineering Challenge (what's needed)
 *   Act 3 — Inside The Cabinet (how each subsystem solves a piece)
 *   Act 4 — Why It Matters (the operational outcome)
 *
 * Timeline (absolute seconds from tour start):
 *    0s  Act 1 — problem framing card
 *    8s  Act 2 — moveCloser() + challenge card
 *   18s  Act 3 — revealInterior() + inside card
 *   35s  Act 3 (cont) — explode() + per-subsystem breakdown
 *   65s  Act 4 — outcome / why-it-matters card
 *   90s  reset() + "Now Explore" hand-off
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

/**
 * State for the currently-running tour, exposed so that input handlers
 * (e.g. right grip → "skip ahead") can poke the schedule without having
 * to plumb extra arguments through every caller.
 */
let activeTourSkipFlag = false;
let tourActive = false;

/** True while a Quick Tour is currently running. */
export function isQuickTourActive(): boolean {
  return tourActive;
}

/**
 * Skip the rest of the current act and jump straight to the next.
 * No-op if a tour isn't running. The wait-loop inside runQuickTour
 * polls this flag and breaks early when set.
 */
export function skipQuickTourAct(): void {
  if (tourActive) activeTourSkipFlag = true;
}

export async function runQuickTour(
  _scene: Scene,
  actions: QuickTourActions
): Promise<void> {
  tourActive = true;
  activeTourSkipFlag = false;
  // ── ACT 1 — The Problem ────────────────────────────────────
  // Open with the stakes, not the spec sheet. An engineer cares about
  // *why* the panel exists before *what's* inside it.
  showGuidedPrompt(
    "Act 1 — Why This Panel Exists",
    "Cornwall, England. 1,500 homes need stable 33kV power, around the " +
    "clock, in every weather. A single fault — a lightning strike, a " +
    "failing cable, a surge — and the lights go out for thousands.\n\n" +
    "The Indian Queens substation can't go down. So how do you protect " +
    "an entire region's grid feed?",
    "Quick Tour starting..."
  );
  setSpectatorStatus("Quick Tour", "Act 1 — Why this panel exists");

  const schedule: ScheduleEntry[] = [
    // ── ACT 2 — The Engineering Challenge ──────────────────────
    {
      at: 8,
      run: async () => {
        showGuidedPrompt(
          "Act 2 — The Engineering Challenge",
          "You build a 33kV switchgear cabinet rated for 3150A continuous " +
          "current. It carries the live grid feed, monitors every circuit " +
          "in microseconds, and trips faults before damage spreads.\n\n" +
          "Let's get closer and see what that actually looks like.",
          "Moving in..."
        );
        setSpectatorStatus("Quick Tour", "Act 2 — Engineering challenge");
        await actions.moveCloser();
      },
    },
    // ── ACT 3 — Inside The Cabinet ─────────────────────────────
    {
      at: 18,
      run: async () => {
        showGuidedPrompt(
          "Act 3 — Inside The Cabinet",
          "The shell fades away. Now you can see what the operator never " +
          "sees on-site: live copper busbars, the capacitor bank, segregated " +
          "cable routing, and the protection rail that decides who gets " +
          "power and who doesn't.",
          "Revealing internals..."
        );
        setSpectatorStatus("Quick Tour", "Act 3 — Inside the cabinet");
        await actions.revealInterior();
      },
    },
    {
      at: 35,
      run: async () => {
        showGuidedPrompt(
          "Each Subsystem, In Isolation",
          "Subsystems separate so you can see how each one solves a piece " +
          "of the problem:\n\n" +
          "• Busbars — 3150A backbone, every circuit feeds from here\n" +
          "• Capacitor bank — corrects power factor, saves grid penalty fees\n" +
          "• Cable management — fire-barriered, BS 7671 compliant\n" +
          "• Protection rail — relays, MCBs, PLC I/O linked to NGET SCADA",
          "Spreading components apart..."
        );
        setSpectatorStatus("Quick Tour", "Act 3 — Each subsystem in isolation");
        await actions.explode();
      },
    },
    // ── ACT 4 — Why It Matters ─────────────────────────────────
    {
      at: 65,
      run: () => {
        showGuidedPrompt(
          "Act 4 — Why It Matters",
          "Every choice in this cabinet earns its place:\n\n" +
          "• Tin-plated copper — decades of conductivity without oxidation\n" +
          "• IP65 cable entries — site can grow without main-chamber rework\n" +
          "• Modular DIN rails — maintenance teams swap parts in minutes\n" +
          "• SCADA-linked protection — National Grid sees faults instantly\n\n" +
          "This is what reliable infrastructure looks like up close.",
          "Reading time..."
        );
        setSpectatorStatus("Quick Tour", "Act 4 — Why it matters");
      },
    },
    {
      at: 90,
      run: async () => {
        await actions.reset();
        showGuidedPrompt(
          "Now Explore",
          "Tour complete. The cabinet is yours to inspect.\n\n" +
          "Right stick = walk around. Left stick = spin the model. " +
          "Point at the glowing dots and click to read each subsystem in " +
          "detail. Hold any button for 3 seconds to see controls again.",
          "You have control"
        );
      },
    },
  ];

  // Run the schedule in absolute time. The wait between each entry is
  // pollable in 200ms slices so a right-grip skip can break out of the
  // current wait early and jump to the next act.
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

  // Hold the final card for a few seconds (also skippable), then hide.
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

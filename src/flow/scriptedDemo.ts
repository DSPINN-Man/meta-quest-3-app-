import type { XRButtonAction } from "../interactions/xrSetup";
import { showGuidedPrompt, hideGuidedPrompt } from "../ui/guidedPrompt";

type ScriptStep = {
  expectedAction: XRButtonAction;
  title: string;
  body: string;
  footer: string;
};

const SCRIPT_STEPS: ScriptStep[] = [
  {
    expectedAction: "move_closer",
    title: "Step 1: Move Closer",
    body:
      "Press A to bring the panel closer.\n\nThis keeps the visitor focused on the hero view instead of roaming around the room.",
    footer: "Press A on the right controller",
  },
  {
    expectedAction: "toggle_interior",
    title: "Step 2: Reveal The Interior",
    body:
      "Press X to fade the shell and reveal the cabinet internals.\n\nThis is the first surprise moment and makes the engineering detail immediately visible.",
    footer: "Press X on the left controller",
  },
  {
    expectedAction: "toggle_explode",
    title: "Step 3: Exploded View",
    body:
      "Press Y to spread the internal assemblies apart.\n\nThis creates the strongest showcase moment for booth visitors and helps each subsystem read clearly.",
    footer: "Press Y on the left controller",
  },
  {
    expectedAction: "move_back",
    title: "Step 4: Step Back",
    body:
      "Press B to step back to the wider hero view.\n\nThis lets the visitor see the whole product again after the close-detail moment.",
    footer: "Press B on the right controller",
  },
  {
    expectedAction: "reset_view",
    title: "Step 5: Ready For The Next Visitor",
    body:
      "Squeeze the right grip to reset the demo view.\n\nAfter that, the experience is back in a clean state for the next person at the booth.",
    footer: "Squeeze the right grip button",
  },
];

let active = false;
let currentStepIndex = 0;

export function startScriptedDemo(): void {
  active = true;
  currentStepIndex = 0;
  renderCurrentStep();
}

export function stopScriptedDemo(): void {
  active = false;
  currentStepIndex = 0;
  hideGuidedPrompt();
}

export function isScriptedDemoActive(): boolean {
  return active;
}

/**
 * Returns true if the action should be allowed to execute.
 * While the scripted demo is active, only the expected action advances.
 */
export function shouldAllowScriptedAction(action: XRButtonAction): boolean {
  if (!active) return true;
  return action === SCRIPT_STEPS[currentStepIndex]?.expectedAction;
}

/**
 * Notify the scripted demo that an action happened.
 * Returns true if the action advanced or completed the script.
 */
export function handleScriptedAction(action: XRButtonAction): boolean {
  if (!active) return false;

  const step = SCRIPT_STEPS[currentStepIndex];
  if (!step || action !== step.expectedAction) {
    renderCurrentStep();
    return false;
  }

  currentStepIndex += 1;

  if (currentStepIndex >= SCRIPT_STEPS.length) {
    active = false;
    showGuidedPrompt(
      "Demo Complete",
      "The guided showcase is complete.\n\nThe visitor can keep looking around, or the booth guide can hand the headset to the next person.",
      "The kiosk reset will restart the experience automatically"
    );
    setTimeout(() => {
      if (!active) {
        hideGuidedPrompt();
      }
    }, 5000);
    return true;
  }

  renderCurrentStep();
  return true;
}

function renderCurrentStep(): void {
  if (!active) {
    hideGuidedPrompt();
    return;
  }

  const step = SCRIPT_STEPS[currentStepIndex];
  showGuidedPrompt(step.title, step.body, step.footer);
}

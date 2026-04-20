import { TIMING } from "../utils/config";

/**
 * Kiosk mode: tracks user activity and fires a callback after
 * TIMING.idleResetTimeout seconds of inactivity.
 *
 * Listens for mouse, keyboard, touch, pointer, and gamepad events.
 * When the idle threshold is reached it calls the onReset callback
 * once, then stops watching until re-armed.
 */

let lastActivity = 0;
let checkInterval: ReturnType<typeof setInterval> | null = null;
let onResetCallback: (() => void) | null = null;
let armed = false;
let listenersAttached = false;

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "pointerdown",
  "pointermove",
  "touchstart",
  "wheel",
  "gamepadconnected",
] as const;

/** Called on any user input — resets the idle timer */
function recordActivity(): void {
  lastActivity = performance.now();
}

/**
 * Start watching for idle timeout.
 * @param onReset - called once when idle threshold is reached
 */
export function startKioskWatch(onReset: () => void): void {
  onResetCallback = onReset;
  lastActivity = performance.now();
  armed = true;

  if (!listenersAttached) {
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, recordActivity, { passive: true });
    }
    listenersAttached = true;
  }

  // Check every second
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(() => {
    if (!armed) return;

    const idle = (performance.now() - lastActivity) / 1000;
    if (idle >= TIMING.idleResetTimeout) {
      console.log(
        `Kiosk: idle for ${TIMING.idleResetTimeout}s — triggering reset.`
      );
      armed = false;
      onResetCallback?.();
    }
  }, 1000);
}

/**
 * Re-arm the kiosk watcher after a reset cycle completes
 * (i.e. after the onboarding flow restarts and reaches explore mode).
 */
export function rearmKiosk(): void {
  lastActivity = performance.now();
  armed = true;
}

/**
 * Stop watching entirely. Used during onboarding phases where we
 * don't want an idle reset (intro, tutorial, orbit).
 */
export function pauseKiosk(): void {
  armed = false;
}

/**
 * Completely tear down the kiosk watcher.
 */
export function stopKioskWatch(): void {
  armed = false;
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  if (listenersAttached) {
    for (const evt of ACTIVITY_EVENTS) {
      window.removeEventListener(evt, recordActivity);
    }
    listenersAttached = false;
  }
}

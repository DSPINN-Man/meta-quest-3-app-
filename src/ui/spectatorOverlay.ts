/**
 * Spectator overlay for the booth laptop / TV mirror.
 *
 * The Quest 3 user can see everything in their headset, but the person
 * watching the laptop screen (or HDMI TV mirror) only sees the 3D
 * canvas. This DOM overlay surfaces what the headset user is currently
 * doing — "In tutorial", "Exploded view", "Inspecting: Busbar" etc. —
 * so the booth attendant can narrate live without needing to ask.
 *
 * Visible only while a VR session is active. Hidden in desktop mode
 * to avoid cluttering the regular browser experience.
 */

let rootEl: HTMLElement | null = null;
let statusEl: HTMLElement | null = null;
let detailEl: HTMLElement | null = null;

function ensureRefs(): boolean {
  if (rootEl && statusEl && detailEl) return true;
  rootEl = document.getElementById("spectatorOverlay");
  statusEl = document.getElementById("spectatorStatus");
  detailEl = document.getElementById("spectatorDetail");
  return !!(rootEl && statusEl && detailEl);
}

/** Show the overlay (call when entering VR). */
export function showSpectatorOverlay(): void {
  if (!ensureRefs()) return;
  if (rootEl) rootEl.style.display = "block";
}

/** Hide the overlay (call when leaving VR). */
export function hideSpectatorOverlay(): void {
  if (!ensureRefs()) return;
  if (rootEl) rootEl.style.display = "none";
}

/**
 * Update the headline status + optional sub-detail line.
 * Examples:
 *   setSpectatorStatus("Quick Tour", "Act 2 — Engineering Challenge")
 *   setSpectatorStatus("Inspecting", "Busbar System — 3150A")
 *   setSpectatorStatus("Free Exploration")
 */
export function setSpectatorStatus(headline: string, detail = ""): void {
  if (!ensureRefs()) return;
  if (statusEl) statusEl.textContent = headline;
  if (detailEl) detailEl.textContent = detail;
}

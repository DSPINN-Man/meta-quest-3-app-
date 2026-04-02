import {
  Scene,
  WebXRDefaultExperience,
  WebXRState,
  Mesh,
} from "@babylonjs/core";

/**
 * WebXR setup for Meta Quest 3.
 *
 * - Session mode: immersive-vr (dark environment, no passthrough)
 * - Left thumbstick: teleportation with parabolic ray
 * - Right controller: pointer ray + trigger for interaction
 * - Babylon's default pointer selection fires OnPickTrigger on
 *   ActionManagers, so existing hotspot/menu click handlers work in VR.
 */

let xrExperience: WebXRDefaultExperience | null = null;
let vrActive = false;

/** Returns true when the user is inside a VR session. */
export function isInVR(): boolean {
  return vrActive;
}

/** Returns the XR experience, or null if unavailable. */
export function getXR(): WebXRDefaultExperience | null {
  return xrExperience;
}

/**
 * Initialize WebXR with immersive-vr mode, teleportation, and pointer input.
 * Gracefully returns null on browsers/devices that don't support WebXR.
 *
 * @param scene  - The Babylon.js scene
 * @param ground - The ground mesh for teleportation
 * @returns The XR experience, or null if WebXR is unavailable
 */
export async function setupXR(
  scene: Scene,
  ground: Mesh
): Promise<WebXRDefaultExperience | null> {
  const nav = navigator as Navigator & {
    xr?: { isSessionSupported: (mode: string) => Promise<boolean> };
  };

  if (!nav.xr) {
    console.log("WebXR not available — desktop mode.");
    return null;
  }

  try {
    const supported = await nav.xr.isSessionSupported("immersive-vr");
    if (!supported) {
      console.log("immersive-vr not supported — desktop fallback.");
      return null;
    }

    // Create the full XR experience:
    //  - Teleportation (left thumbstick by default)
    //  - Pointer selection (right controller ray by default)
    //  - Enter/Exit UI button (Babylon's built-in, bottom-right)
    const xr = await scene.createDefaultXRExperienceAsync({
      uiOptions: {
        sessionMode: "immersive-vr",
        referenceSpaceType: "local-floor",
      },
      floorMeshes: [ground],
    });

    xrExperience = xr;

    // ── Track VR session state ─────────────────────────────
    xr.baseExperience.onStateChangedObservable.add((state) => {
      vrActive = state === WebXRState.IN_XR;
      console.log(`WebXR state: ${WebXRState[state]}, inVR=${vrActive}`);
    });

    // ── Teleportation ──────────────────────────────────────
    if (xr.teleportation) {
      xr.teleportation.addFloorMesh(ground);
    }

    // ── Pointer selection ──────────────────────────────────
    // Babylon's default XR experience includes WebXRControllerPointerSelection.
    // This fires OnPickTrigger on ActionManagers — so our existing hotspot
    // click handlers and menu button handlers work in VR automatically.

    console.log(
      "WebXR immersive-vr ready. Teleportation + pointer selection active."
    );
    return xr;
  } catch (err) {
    console.warn("WebXR setup failed — desktop fallback:", err);
    return null;
  }
}

/**
 * Enter VR mode programmatically.
 * Call from a custom HTML button or in response to user action.
 */
export async function enterVR(): Promise<void> {
  if (!xrExperience) {
    console.warn("Cannot enter VR — XR not initialized.");
    return;
  }
  try {
    await xrExperience.baseExperience.enterXRAsync(
      "immersive-vr",
      "local-floor"
    );
  } catch (err) {
    console.warn("Failed to enter VR:", err);
  }
}

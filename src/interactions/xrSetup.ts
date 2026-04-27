import {
  Scene,
  WebXRDefaultExperience,
  WebXRState,
  WebXRInputSource,
  Mesh,
  Vector3,
  Observable,
  Observer,
} from "@babylonjs/core";
import "@babylonjs/core/XR/motionController/webXROculusTouchMotionController";
import "@babylonjs/core/XR/motionController/webXRGenericMotionController";

export type XRButtonAction =
  | "move_closer"
  | "move_back"
  | "toggle_interior"
  | "toggle_explode"
  | "reset_view";

let xrExperience: WebXRDefaultExperience | null = null;
let vrActive = false;
let pollObserver: Observer<Scene> | null = null;

let startingPosition = new Vector3(0, 1.6, -3);
let guidedViewpoints: Vector3[] = [];
let defaultGuidedViewIndex = 1;
let currentGuidedViewIndex = 1;

type TrackedController = {
  source: WebXRInputSource;
  pressedButtons: Set<number>;
  hasMotionProfile: boolean;
};

const trackedControllers = new Map<string, TrackedController>();

export const onXRInput = new Observable<void>();
export const onVRStateChanged = new Observable<boolean>();
export const onXRButtonAction = new Observable<XRButtonAction>();

/** Per-frame joystick axes: { leftX, leftY, rightX, rightY } all -1 to 1 */
export interface JoystickAxes {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
}

/** Fires every frame with current joystick positions */
export const onJoystickAxes = new Observable<JoystickAxes>();

export function isInVR(): boolean {
  return vrActive;
}

export function getXR(): WebXRDefaultExperience | null {
  return xrExperience;
}

export function configureGuidedViewpoints(
  viewpoints: Vector3[],
  defaultIndex = 1
): void {
  guidedViewpoints = viewpoints.map((p) => p.clone());
  defaultGuidedViewIndex = clamp(defaultIndex, 0, Math.max(guidedViewpoints.length - 1, 0));
  currentGuidedViewIndex = defaultGuidedViewIndex;

  if (guidedViewpoints.length > 0) {
    startingPosition = guidedViewpoints[currentGuidedViewIndex].clone();
  }
}

export function resetGuidedView(): void {
  currentGuidedViewIndex = defaultGuidedViewIndex;
  if (guidedViewpoints.length > 0) {
    startingPosition = guidedViewpoints[currentGuidedViewIndex].clone();
  }
  applyCurrentGuidedView();
}

export function stepGuidedView(step: number): void {
  if (guidedViewpoints.length === 0) return;
  const nextIndex = clamp(
    currentGuidedViewIndex + step,
    0,
    guidedViewpoints.length - 1
  );
  if (nextIndex === currentGuidedViewIndex) return;

  currentGuidedViewIndex = nextIndex;
  applyCurrentGuidedView();
}

export function recenterUser(): void {
  applyCurrentGuidedView();
}

/**
 * Teleport the user to an arbitrary world-space position.
 * Used by hotspot inspect and other free-form interactions.
 *
 * Important: does NOT mutate the guided-viewpoint state. The guided
 * viewpoints are the "home" positions the Reset button snaps to — free
 * teleports must not pollute those.
 */
export function moveUserTo(position: Vector3): void {
  if (!xrExperience || !vrActive) {
    console.log(
      `moveUserTo: XR not active, caching target (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`
    );
    return;
  }

  const xrCamera = xrExperience.baseExperience.camera;
  xrCamera.position.copyFrom(position);
  console.log(
    `moveUserTo: teleported to (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`
  );
}

export function getUserPosition(): Vector3 {
  if (xrExperience && vrActive) {
    return xrExperience.baseExperience.camera.position.clone();
  }

  return startingPosition.clone();
}

export async function setupXR(
  scene: Scene,
  _ground: Mesh,
  _modelInfo?: { center: Vector3; height: number; width: number; depth: number }
): Promise<WebXRDefaultExperience | null> {
  const nav = navigator as Navigator & {
    xr?: { isSessionSupported: (mode: string) => Promise<boolean> };
  };

  if (!nav.xr) {
    console.log("WebXR not available - desktop mode.");
    return null;
  }

  try {
    const supported = await nav.xr.isSessionSupported("immersive-vr");
    if (!supported) {
      console.log("immersive-vr not supported - desktop fallback.");
      return null;
    }

    const xr = await scene.createDefaultXRExperienceAsync({
      disableTeleportation: true,
      uiOptions: {
        sessionMode: "immersive-vr",
        referenceSpaceType: "local-floor",
      },
    });

    xrExperience = xr;

    // Verify pointer selection is active — this is what makes
    // trigger clicks fire OnPickTrigger on menu buttons / hotspots.
    if (xr.pointerSelection) {
      console.log("WebXR pointer selection: ACTIVE — trigger clicks will fire pick events.");
    } else {
      console.error("WebXR pointer selection: NOT AVAILABLE — buttons won't work!");
    }

    xr.baseExperience.onStateChangedObservable.add((state) => {
      vrActive = state === WebXRState.IN_XR;
      onVRStateChanged.notifyObservers(vrActive);

      if (vrActive) {
        applyCurrentGuidedView();
        console.log("VR session active. Pointer selection enabled:", !!xr.pointerSelection);
      }
    });

    // NOTE: Removed xr-controller-movement feature — it was conflicting
    // with pointer selection on some Quest firmware versions.

    setupTrackedControllers(xr.input, scene);

    console.log(
      "WebXR immersive-vr ready. Pointer selection + button mapping active."
    );
    return xr;
  } catch (err) {
    console.warn("WebXR setup failed - desktop fallback:", err);
    return null;
  }
}

function setupTrackedControllers(
  input: WebXRDefaultExperience["input"],
  scene: Scene
): void {
  input.onControllerAddedObservable.add((controller) => {
    trackedControllers.set(controller.uniqueId, {
      source: controller,
      pressedButtons: new Set<number>(),
      hasMotionProfile: false,
    });

    controller.onMotionControllerInitObservable.add((motionController) => {
      const tracked = trackedControllers.get(controller.uniqueId);
      if (tracked) {
        tracked.hasMotionProfile = true;
      }

      motionController.getComponentIds().forEach((componentId) => {
        const component = motionController.getComponent(componentId);
        if (!component) return;

        component.onButtonStateChangedObservable.add(() => {
          const becamePressed = component.changes.pressed?.current === true;
          if (!becamePressed) return;

          onXRInput.notifyObservers();

          const action = mapMotionComponent(componentId);
          if (action) {
            console.log(
              `XR motion action: ${controller.inputSource.handedness} ${componentId} -> ${action}`
            );
            onXRButtonAction.notifyObservers(action);
          } else {
            console.log(
              `XR motion input: ${controller.inputSource.handedness} ${componentId}`
            );
          }
        });
      });
    });

    controller.onDisposeObservable.add(() => {
      trackedControllers.delete(controller.uniqueId);
    });
  });

  if (!pollObserver) {
    pollObserver = scene.onBeforeRenderObservable.add(() => {
      pollQuestButtons();
      pollJoystickAxes();
    });
  }
}

function pollQuestButtons(): void {
  for (const tracked of trackedControllers.values()) {
    if (tracked.hasMotionProfile) continue;

    const gamepad = tracked.source.inputSource.gamepad;
    if (!gamepad?.buttons) continue;

    const handedness = tracked.source.inputSource.handedness;

    for (let index = 0; index < gamepad.buttons.length; index++) {
      const button = gamepad.buttons[index];
      const isPressed = !!button?.pressed;
      const wasPressed = tracked.pressedButtons.has(index);

      if (isPressed && !wasPressed) {
        tracked.pressedButtons.add(index);
        onXRInput.notifyObservers();

        const action = mapGamepadButton(handedness, index);
        if (action) {
          console.log(`XR button action: ${handedness} button ${index} -> ${action}`);
          onXRButtonAction.notifyObservers(action);
        }
      } else if (!isPressed && wasPressed) {
        tracked.pressedButtons.delete(index);
      }
    }
  }
}

/**
 * Read joystick axes every frame and fire the observable.
 * Quest Touch controllers: axes[2] = thumbstick X, axes[3] = thumbstick Y.
 */
function pollJoystickAxes(): void {
  if (!vrActive) return;

  const axes: JoystickAxes = { leftX: 0, leftY: 0, rightX: 0, rightY: 0 };
  const DEADZONE = 0.12;

  for (const tracked of trackedControllers.values()) {
    const gamepad = tracked.source.inputSource.gamepad;
    if (!gamepad?.axes) continue;

    const hand = tracked.source.inputSource.handedness;
    // Quest thumbstick axes: index 2 = X, index 3 = Y
    const x = gamepad.axes.length > 2 ? gamepad.axes[2] : 0;
    const y = gamepad.axes.length > 3 ? gamepad.axes[3] : 0;

    const ax = Math.abs(x) > DEADZONE ? x : 0;
    const ay = Math.abs(y) > DEADZONE ? y : 0;

    if (hand === "left") {
      axes.leftX = ax;
      axes.leftY = ay;
    } else if (hand === "right") {
      axes.rightX = ax;
      axes.rightY = ay;
    }
  }

  // Only fire if any stick is active (saves overhead when idle)
  if (axes.leftX || axes.leftY || axes.rightX || axes.rightY) {
    onJoystickAxes.notifyObservers(axes);
  }
}

function mapGamepadButton(
  handedness: XRHandedness,
  buttonIndex: number
): XRButtonAction | null {
  // Thumbstick click (left:3) was previously mapped to "reset_view" but it
  // fires too easily — any accidental stick click sent the user back to the
  // home viewpoint, which broke hotspot-to-hotspot exploration. Reset is
  // still available from the floating menu. Grip squeeze (right:1) is the
  // new explicit reset so it has to be a deliberate, firm press.
  switch (`${handedness}:${buttonIndex}`) {
    case "right:4":
      return "move_closer";
    case "right:5":
      return "move_back";
    case "left:4":
      return "toggle_interior";
    case "left:5":
      return "toggle_explode";
    case "right:1":
      return "reset_view";
    default:
      return null;
  }
}

function mapMotionComponent(componentId: string): XRButtonAction | null {
  // Same reasoning as above: thumbstick removed from the reset path.
  switch (componentId) {
    case "a-button":
      return "move_closer";
    case "b-button":
      return "move_back";
    case "x-button":
      return "toggle_interior";
    case "y-button":
      return "toggle_explode";
    default:
      return null;
  }
}

function applyCurrentGuidedView(): void {
  const target =
    guidedViewpoints[currentGuidedViewIndex]?.clone() ?? startingPosition.clone();

  startingPosition = target.clone();

  if (!xrExperience || !vrActive) return;

  const xrCamera = xrExperience.baseExperience.camera;
  xrCamera.position.copyFrom(target);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function enterVR(): Promise<void> {
  if (!xrExperience) {
    console.warn("Cannot enter VR - XR not initialized.");
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

import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
} from "@babylonjs/core";
import { ENV, XR } from "../utils/config";

/**
 * Creates the dark-room studio environment:
 * - Sets the background color
 * - Adds a large, dark, slightly reflective ground plane
 */
export function createEnvironment(scene: Scene): Mesh {
  // Dark background
  scene.clearColor = ENV.clearColor;

  // Subtle ambient so nothing is completely black
  scene.ambientColor = new Color3(
    ENV.ambientIntensity,
    ENV.ambientIntensity,
    ENV.ambientIntensity
  );

  // Ground plane — dark reflective surface for studio look
  const ground = MeshBuilder.CreateGround(
    XR.teleportFloorMeshName,
    { width: ENV.groundSize, height: ENV.groundSize },
    scene
  );

  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = ENV.groundColor;
  groundMat.specularColor = new Color3(
    ENV.groundReflectivity,
    ENV.groundReflectivity,
    ENV.groundReflectivity
  );
  // High specular power = tight, focused highlights (product studio look)
  groundMat.specularPower = 128;
  // Faint emissive so the floor edge reads in the dark
  groundMat.emissiveColor = new Color3(0.01, 0.01, 0.015);
  groundMat.alpha = 1;

  ground.material = groundMat;
  ground.receiveShadows = true;

  return ground;
}

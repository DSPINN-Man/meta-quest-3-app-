import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
} from "@babylonjs/core";
import { ENV, XR } from "../utils/config";

/**
 * Creates a clean ENSPEC-branded stage:
 * one dominant light-blue environment with a subtle premium floor,
 * leaving the white lighting to hero the model instead of the room.
 */
export function createEnvironment(scene: Scene): Mesh {
  scene.clearColor = ENV.clearColor;
  scene.ambientColor = new Color3(
    ENV.ambientIntensity,
    ENV.ambientIntensity,
    ENV.ambientIntensity
  );

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
  groundMat.specularPower = 64;
  groundMat.emissiveColor = new Color3(0.02, 0.05, 0.06);
  groundMat.alpha = 1;

  ground.material = groundMat;
  ground.receiveShadows = true;

  return ground;
}

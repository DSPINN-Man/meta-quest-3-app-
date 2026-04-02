import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  ShadowGenerator,
  Vector3,
} from "@babylonjs/core";

/**
 * Creates a placeholder panel model: a main box body (~2m tall) with
 * 4 separate door meshes named according to the project convention.
 * This lets us build all interaction systems before the real GLB arrives.
 */
export function createPlaceholderModel(
  scene: Scene,
  shadowGen: ShadowGenerator
): Mesh {
  // ── Main body (panel cabinet) ─────────────────────────────
  const body = MeshBuilder.CreateBox(
    "panelBody",
    { width: 1.2, height: 2, depth: 0.8 },
    scene
  );
  body.position = new Vector3(0, 1, 0); // bottom sits on ground

  const bodyMat = new StandardMaterial("bodyMat", scene);
  bodyMat.diffuseColor = new Color3(0.25, 0.27, 0.3);
  bodyMat.specularColor = new Color3(0.3, 0.3, 0.3);
  bodyMat.specularPower = 32;
  body.material = bodyMat;

  // Shared door material
  const doorMat = new StandardMaterial("doorMat", scene);
  doorMat.diffuseColor = new Color3(0.35, 0.38, 0.42);
  doorMat.specularColor = new Color3(0.4, 0.4, 0.4);
  doorMat.specularPower = 24;

  // ── Door helper ───────────────────────────────────────────
  function makeDoor(
    name: string,
    width: number,
    height: number,
    pos: Vector3
  ): Mesh {
    const door = MeshBuilder.CreateBox(
      name,
      { width, height, depth: 0.03 },
      scene
    );
    door.position = pos;
    door.material = doorMat;
    door.parent = body;
    return door;
  }

  // Front doors (split into left and right halves)
  makeDoor(
    "door_front_1",
    0.55,
    1.8,
    new Vector3(-0.3, 0, -0.42) // left half, front face
  );
  makeDoor(
    "door_front_2",
    0.55,
    1.8,
    new Vector3(0.3, 0, -0.42) // right half, front face
  );

  // Side doors
  makeDoor(
    "door_side_left",
    0.03,
    1.8,
    new Vector3(-0.62, 0, 0) // left side (rotated width/depth)
  );
  // Make left side door thinner on X, wider on Z
  const leftDoor = scene.getMeshByName("door_side_left") as Mesh;
  if (leftDoor) {
    leftDoor.dispose();
  }
  const doorSideLeft = MeshBuilder.CreateBox(
    "door_side_left",
    { width: 0.03, height: 1.8, depth: 0.7 },
    scene
  );
  doorSideLeft.position = new Vector3(-0.62, 0, 0);
  doorSideLeft.material = doorMat;
  doorSideLeft.parent = body;

  const doorSideRight = MeshBuilder.CreateBox(
    "door_side_right",
    { width: 0.03, height: 1.8, depth: 0.7 },
    scene
  );
  doorSideRight.position = new Vector3(0.62, 0, 0);
  doorSideRight.material = doorMat;
  doorSideRight.parent = body;

  // ── Internal detail (visible through gaps) ────────────────
  const internals = MeshBuilder.CreateBox(
    "internals",
    { width: 1.0, height: 1.6, depth: 0.6 },
    scene
  );
  internals.position = new Vector3(0, 0, 0);
  internals.parent = body;

  const internalMat = new StandardMaterial("internalMat", scene);
  internalMat.diffuseColor = new Color3(0.12, 0.14, 0.16);
  internalMat.specularColor = new Color3(0.1, 0.1, 0.1);
  internals.material = internalMat;

  // Register all for shadows
  const allMeshes = body.getChildMeshes(false);
  allMeshes.push(body);
  for (const m of allMeshes) {
    shadowGen.addShadowCaster(m);
    m.receiveShadows = true;
  }

  return body;
}

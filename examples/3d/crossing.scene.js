// A blockout for a five-second shot: a walker crosses behind a table while the camera slides, and comes out from
// behind a wall flat on a beat of the edit. The scene is a media source: crossing.tsx plays it as a clip.
//
// `stage` is the part a person or the editor's viewport changes: where things stand and how they move, as plain data.
// `build` makes the three.js objects once; `sample` computes the walk from where the stage puts the walker.

/** The scene's own length, in seconds. */
export const length = 5;

export const stage = {
  camera: {
    position: [
      { at: 0, value: [-1.5, 1.4, 5.5], easing: "easeInOut" },
      { at: 5, value: [1.5, 1.4, 5.5] },
    ],
    lookAt: [0, 1.1, 0],
    lens: 38,
  },
  table: { position: [0, 0, 0.6] },
  flat: { position: [-2.2, 0, -0.3] },
  walker: {
    // `reveal` is a time the edit hands in (`times` on the clip): the walker clears the flat on that beat.
    position: [
      { at: 0.5, value: [-2.5, 0, -0.8] },
      { at: "reveal", value: [-1, 0, -0.8] },
      { at: 3.2, value: [1.5, 0, -0.8] },
    ],
    // Metres covered in one full step cycle, and how far arms and legs swing, in degrees.
    stride: 1.4,
    swing: 28,
  },
};

export function build({ THREE, scene }) {
  const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const box = (w, h, d, material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    return mesh;
  };

  scene.background = new THREE.Color(0x1d1b18);
  scene.add(new THREE.HemisphereLight(0xf2efe8, 0x3a3631, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(3, 5, 4);
  scene.add(sun);
  scene.add(box(14, 0.02, 10, mat(0x8d877c), 0, -0.01, -1));
  scene.add(box(14, 4, 0.1, mat(0xb9b2a6), 0, 2, -3));

  // A table, 1.6 m by 0.8 m and 0.75 m high, with an apron that hides the walker's legs as they pass behind it.
  const wood = mat(0x6b4f3a);
  const table = new THREE.Group();
  table.add(box(1.6, 0.05, 0.8, wood, 0, 0.725, 0));
  table.add(box(1.5, 0.3, 0.03, wood, 0, 0.55, 0.36));
  for (const [x, z] of [
    [-0.72, -0.32],
    [0.72, -0.32],
    [-0.72, 0.32],
    [0.72, 0.32],
  ])
    table.add(box(0.06, 0.7, 0.06, wood, x, 0.35, z));
  scene.add(table);

  // A wall flat, 1.4 m wide and 3 m high, its origin at the middle of its foot.
  const flat = new THREE.Group();
  flat.add(box(1.4, 3, 0.12, mat(0x9e978b), 0, 1.5, 0));
  scene.add(flat);

  // The walker: a group the stage moves through the set, and inside it a proxy rig facing +x, in one flat colour so
  // a video model can be told which figure is which.
  const walker = new THREE.Group();
  const rig = new THREE.Group();
  rig.rotation.y = Math.PI / 2;
  walker.add(rig);
  const body = mat(0xd9713a);
  const limb = (name, x, y, size) => {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.set(x, y, 0);
    pivot.add(box(0.12, size, 0.12, body, 0, -size / 2, 0));
    rig.add(pivot);
  };
  rig.add(box(0.36, 0.6, 0.2, body, 0, 1.2, 0));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), body);
  head.position.set(0, 1.66, 0);
  rig.add(head);
  limb("legL", -0.1, 0.9, 0.88);
  limb("legR", 0.1, 0.9, 0.88);
  limb("armL", -0.25, 1.48, 0.62);
  limb("armR", 0.25, 1.48, 0.62);
  scene.add(walker);
  walker.userData.mixer = new THREE.AnimationMixer(rig);

  return { table, flat, walker };
}

/** The in-place walk: one cycle as an AnimationClip, played by setting the mixer's time, never by adding up steps. */
export function sample(_seconds, { THREE, objects, stage: now }) {
  const walker = objects.walker;
  const { stride, swing } = now.walker;
  const mixer = walker.userData.mixer;
  if (walker.userData.swing !== swing) {
    walker.userData.action?.stop();
    const a = THREE.MathUtils.degToRad(swing);
    const q = (angle) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle).toArray();
    const track = (name, sign) =>
      new THREE.QuaternionKeyframeTrack(
        `${name}.quaternion`,
        [0, 0.5, 1],
        [...q(sign * a), ...q(-sign * a), ...q(sign * a)],
      );
    const clip = new THREE.AnimationClip("walk", 1, [
      track("legL", 1),
      track("legR", -1),
      track("armL", -1),
      track("armR", 1),
    ]);
    walker.userData.action = mixer.clipAction(clip);
    walker.userData.action.play();
    walker.userData.swing = swing;
  }
  // The step follows the distance walked, so the feet do not slide however the path is timed, and the walker stands
  // still where the path holds.
  const cycle = walker.position.x / stride;
  mixer.setTime(cycle - Math.floor(cycle));
}

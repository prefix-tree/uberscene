// A blockout for a five-second shot: a walker crosses behind a table while the camera slides. This module builds
// things and computes the walk cycle. Used two ways:
// - On a <Three shot> tag (crossing.tsx): the tag stages it, so the editor's viewport can change the staging there.
// - As media (crossing-clip.tsx): the manifest lists this file as a `scene` asset, a <Clip> plays it like footage,
//   and the `stage` below says where things stand, since no tag does.
import { defineShot } from "@uberscene/kit";

export default defineShot({
  objects: {
    table: {},
    // A wall flat the walker comes out from behind.
    flat: {},
    // The walker's path through the set is the file's (keys on its position). Its rig walks in place, computed below.
    walker: {},
  },
  inputs: {
    // Metres the walker covers in one full step cycle (two steps).
    stride: 1.4,
    // How far arms and legs swing, in degrees.
    swing: 28,
  },
  length: 5,
  // The staging when the file plays as a scene asset: the same data as crossing.tsx's tag, in shot time. The reveal
  // is at 2 s, where the tag ties it to the "reveal" marker (4 s in the edit, the shot starting at 2 s).
  stage: {
    background: "#1d1b18",
    camera: {
      fov: 35,
      position: [
        { at: 0, value: [-1.5, 1.4, 5.5], easing: "easeInOut" },
        { at: 5, value: [1.5, 1.4, 5.5] },
      ],
      lookAt: [0, 1.1, 0],
    },
    objects: {
      table: { position: [0, 0, 0.6] },
      flat: { position: [-2.2, 0, -0.3] },
      walker: {
        position: [
          { at: 0.5, value: [-2.5, 0, -0.8] },
          { at: 2, value: [-1, 0, -0.8] },
          { at: 3.2, value: [1.5, 0, -0.8] },
        ],
      },
    },
    inputs: { stride: 1.4 },
  },
  build({ THREE, scene }) {
    const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const box = (w, h, d, material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      return mesh;
    };

    scene.add(new THREE.HemisphereLight(0xf2efe8, 0x3a3631, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    scene.add(box(14, 0.02, 10, mat(0x8d877c), 0, -0.01, -1));
    scene.add(box(14, 4, 0.1, mat(0xb9b2a6), 0, 2, -3));

    // A table, 1.6 m by 0.8 m and 0.75 m high, from five boxes.
    const wood = mat(0x6b4f3a);
    const table = new THREE.Group();
    table.add(box(1.6, 0.05, 0.8, wood, 0, 0.725, 0));
    // An apron under the top, so the table hides the walker's legs as they pass behind it.
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

    // The walker: a group the file moves through the set, and inside it a proxy rig facing +x.
    const walker = new THREE.Group();
    const rig = new THREE.Group();
    rig.rotation.y = Math.PI / 2;
    walker.add(rig);
    const body = mat(0xd9713a);
    const limb = (name, x, y, length) => {
      const pivot = new THREE.Group();
      pivot.name = name;
      pivot.position.set(x, y, 0);
      pivot.add(box(0.12, length, 0.12, body, 0, -length / 2, 0));
      rig.add(pivot);
      return pivot;
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

    // The in-place walk: one cycle a second as an AnimationClip, played by setting the mixer's time, never by steps.
    const mixer = new THREE.AnimationMixer(rig);
    let swingMade = Number.NaN;
    let action = null;
    const makeClip = (degrees) => {
      const a = THREE.MathUtils.degToRad(degrees);
      const q = (angle) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle).toArray();
      const track = (name, sign) =>
        new THREE.QuaternionKeyframeTrack(
          `${name}.quaternion`,
          [0, 0.5, 1],
          [...q(sign * a), ...q(-sign * a), ...q(sign * a)],
        );
      return new THREE.AnimationClip("walk", 1, [
        track("legL", 1),
        track("legR", -1),
        track("armL", -1),
        track("armR", 1),
      ]);
    };

    return {
      objects: { table, flat, walker },
      // The walk needs no clock of its own: it follows where the file has put the walker at this moment.
      sample(_seconds, { inputs }) {
        if (inputs.swing !== swingMade) {
          action?.stop();
          action = mixer.clipAction(makeClip(inputs.swing));
          action.play();
          swingMade = inputs.swing;
        }
        // The step follows the distance walked, so the feet do not slide however the path is timed, and the walker
        // stands still where the path holds.
        const cycle = walker.position.x / inputs.stride;
        mixer.setTime(cycle - Math.floor(cycle));
      },
    };
  },
});

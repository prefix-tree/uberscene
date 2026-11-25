import * as fiber from "@react-three/fiber";
import * as motion from "motion";
import * as motionReact from "motion/react";
import * as three from "three";

import { installLayerEngine, installSceneSource, type LayerEngine } from "@uberscene/kit/schema";

import * as cutMotion from "./motion";
import { SceneFrameSource, type SceneUse } from "./scene3d";
import * as cutThree from "./three";

/**
 * The libraries free code in a `<Layer>` may import, by import name. A host passes them to `loadModule`:
 *
 * ```ts
 * loadModule(source, { imports: FREE_CODE_LIBRARIES });
 * ```
 *
 * three.js comes with React Three Fiber and `@uberscene/graphics/three`, whose `<ThreeScene>` puts a scene on the
 * video's clock; Motion with `@uberscene/graphics/motion`, whose `useTimeline` and `useLayerTime` do the same for
 * animations. A host that wants fewer builds its own map from these entries.
 */
export const FREE_CODE_LIBRARIES: Readonly<Record<string, unknown>> = {
  three,
  "@react-three/fiber": fiber,
  motion,
  "motion/react": motionReact,
  "@uberscene/graphics/three": cutThree,
  "@uberscene/graphics/motion": cutMotion,
};

/**
 * Make `<Three>`, `<Motion>` and clips that play a 3D scene draw (installs their engines) and return the imports a host passes to
 * `loadModule`. Call it once, before the Player mounts:
 *
 * ```ts
 * const imports = installFreeCodeLibraries();
 * const video = loadModule(source, { imports });
 * ```
 */
export function installFreeCodeLibraries(): Readonly<Record<string, unknown>> {
  installLayerEngine("three", cutThree.ThreeLayer as LayerEngine);
  installLayerEngine("motion", cutMotion.MotionLayer as LayerEngine);
  // A clip that plays a 3D scene (`<Clip src={crossing} />`) gets its frames drawn by three.js.
  installSceneSource((use) => new SceneFrameSource(use as SceneUse));
  return FREE_CODE_LIBRARIES;
}

export { MotionLayer, useLayerTime, useTimeline } from "./motion";
export { type BuiltScene, buildScene, poseScene, SceneFrameSource, type SceneUse } from "./scene3d";
export {
  type ThreeCamera,
  type ThreeFrame,
  ThreeLayer,
  ThreeScene,
  type ThreeSceneProps,
  type ThreeSetup,
  type ThreeSetupFn,
  type ThreeUpdate,
} from "./three";

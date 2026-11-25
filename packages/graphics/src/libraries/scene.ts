// Scene files as media: a standalone `.js` file whose default export is a shot (`defineShot`, or the same plain
// object) builds a three.js scene, and the player plays it as footage whose frames are computed here. The shot stages
// itself (`stage`: camera, objects and inputs, keys in shot time), since no `<Three>` tag stands for it.
import * as THREE from "three";

import { isShot, type ShotDefinition } from "@uberscene/kit";
import { installSceneEngine, type SceneEngine, type SceneRenderer } from "@uberscene/kit/schema";

import { applyShot, buildShot, type ShotProps } from "./shot";

/** Runs a scene file's source and returns its exports, as the host's `loadModule` does for a video file. */
export type SceneLoader = (source: string) => object;

/** A scene's default export: a shot, or an object of the same shape written without `defineShot`. */
function shotOf(exports: object): ShotDefinition {
  const d = (exports as { default?: unknown }).default as Partial<ShotDefinition> | undefined;
  if (isShot(d)) return d;
  if (d && typeof d === "object" && typeof d.build === "function")
    return { kind: "shot", objects: {}, inputs: {}, ...d } as ShotDefinition;
  throw new Error("a scene file's default export is a shot: export default defineShot({ build, ... })");
}

/** Builds a scene file once and draws it at any time asked, from the time alone. */
export function openScene(
  shot: ShotDefinition,
  size: { readonly width: number; readonly height: number },
  canvas: HTMLCanvasElement | OffscreenCanvas = new OffscreenCanvas(size.width, size.height),
): SceneRenderer {
  const stage: ShotProps = shot.stage ?? {};
  // As React Three Fiber sets up a <Three>, so a shot looks the same on a tag and as media.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(size.width, size.height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  if (shot.stage?.background) scene.background = new THREE.Color(shot.stage.background);
  const camera = new THREE.PerspectiveCamera(75, size.width / size.height, 0.1, 1000);
  camera.position.set(0, 0, 5);
  const built = buildShot(shot, scene, camera);
  return {
    ...(shot.length !== undefined ? { length: shot.length } : {}),
    draw(seconds) {
      const t = shot.length !== undefined ? Math.min(seconds, shot.length) : seconds;
      applyShot(shot, built, stage, camera, t);
      renderer.render(scene, camera);
      return canvas;
    },
    close() {
      built.dispose?.();
      renderer.dispose();
    },
  };
}

/** The scene engine for a host: `load` runs a scene file's source (the host's `loadModule`, with three.js offered). */
export function sceneEngine(load: SceneLoader): SceneEngine {
  return { open: async (source, size) => openScene(shotOf(load(source)), size) };
}

/**
 * Make scene assets (manifest kind `scene`) play: installs the engine that builds and draws them. Call it once,
 * before the Player mounts, with the loader the host uses for video files:
 *
 * ```ts
 * const imports = installFreeCodeLibraries();
 * installSceneFiles((source) => loadModule(source, { imports }));
 * ```
 */
export function installSceneFiles(load: SceneLoader): void {
  installSceneEngine(sceneEngine(load));
}

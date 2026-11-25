import type { ComponentType, ReactNode } from "react";

import type { Scene } from "./scene3d";

/**
 * What draws an engine Layer (`<Three>`, `<Motion>`): a component given the Layer's resolved props (functions
 * included) and its children. The kit draws nothing; a host installs engines, as `@uberscene/graphics/libraries` does.
 */
export type LayerEngine = ComponentType<Readonly<Record<string, unknown>> & { readonly children?: ReactNode }>;

/** On `globalThis`, like the layer clock: a file loaded with its own copy of the kit still finds the host's engines. */
const engines = ((globalThis as Record<symbol, Map<string, LayerEngine>>)[
  Symbol.for("@uberscene/kit/layer-engines")
] ??= new Map());

/** Install (or with `null`, remove) the engine that draws `<Layer engine={name}>` tags such as `<Three>`. */
export function installLayerEngine(name: string, engine: LayerEngine | null): void {
  if (engine) engines.set(name, engine);
  else engines.delete(name);
}

export function layerEngine(name: string): LayerEngine | null {
  return engines.get(name) ?? null;
}

/**
 * Frames an engine is still preparing (a three.js renderer being created, say). The browser export waits for none
 * before it captures a frame; the player ignores them. On `globalThis` for the same reason as the engines.
 */
const pending = ((globalThis as Record<symbol, { count: number }>)[
  Symbol.for("@uberscene/kit/layer-frames-pending")
] ??= { count: 0 });

/** Hold the frame until the returned release is called (once; later calls do nothing). */
export function holdLayerFrame(): () => void {
  pending.count++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    pending.count--;
  };
}

/** How many holds are open: 0 when every engine has drawn the frame it was given. */
export function layerFramesPending(): number {
  return pending.count;
}

/**
 * Makes the frames of a 3D scene a clip plays (`<Clip src={scene}>`), drawn at `width` by `height`: a frame source the
 * Player reads like footage. The kit does not draw; a host installs one (`installFreeCodeLibraries` from
 * `@uberscene/graphics/libraries` installs three.js's).
 */
export type SceneSourceFactory = (use: {
  readonly scene: Scene;
  readonly times: Readonly<Record<string, number>>;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
}) => unknown;

const sceneSlot = ((globalThis as Record<symbol, { factory: SceneSourceFactory | null }>)[
  Symbol.for("@uberscene/kit/scene-source")
] ??= { factory: null });

export function installSceneSource(factory: SceneSourceFactory | null): void {
  sceneSlot.factory = factory;
}

export function sceneSource(): SceneSourceFactory | null {
  return sceneSlot.factory;
}

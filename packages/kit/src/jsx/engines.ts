import type { ComponentType, ReactNode } from "react";

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
 * A scene file's pictures at given times: a 3D scene built once and drawn at each moment asked for. What `draw`
 * returns is a canvas (or anything `drawImage` takes) that holds the picture until the next `draw`.
 */
export interface SceneRenderer {
  /** Seconds of the scene's own time, as its file declares them (`length`), if it does. */
  readonly length?: number;
  draw(seconds: number):
    | { readonly width: number; readonly height: number }
    | Promise<{
        readonly width: number;
        readonly height: number;
      }>;
  close(): void;
}

/**
 * What turns a scene asset (manifest kind `scene`, a standalone `.js` file) into pictures. The player plays it as
 * footage whose frames are computed: it asks for the frame at a source time, as it asks a decoder. The kit draws
 * nothing; a host installs one, as `installSceneFiles` from `@uberscene/graphics/libraries` does.
 */
export interface SceneEngine {
  /** Runs a scene file's source and builds it for pictures `size` pixels big. */
  open(source: string, size: { readonly width: number; readonly height: number }): Promise<SceneRenderer>;
}

const scenes = ((globalThis as Record<symbol, { engine: SceneEngine | null }>)[
  Symbol.for("@uberscene/kit/scene-engine")
] ??= { engine: null });

/** Install (or with `null`, remove) the engine that draws scene assets. */
export function installSceneEngine(engine: SceneEngine | null): void {
  scenes.engine = engine;
}

/** The installed scene engine, or null when the host installed none. */
export function sceneEngine(): SceneEngine | null {
  return scenes.engine;
}

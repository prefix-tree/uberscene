import { Canvas, type CanvasProps, useFrame, useThree } from "@react-three/fiber";
import { type CSSProperties, type ReactNode, useCallback, useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import { holdLayerFrame, isShot, type ShotBuilt, type ShotDefinition, useLayer } from "@uberscene/kit";

import { applyCamera, applyShot, buildShot, type ShotProps, shotTime } from "./shot";

export type ThreeSceneProps = Omit<CanvasProps, "frameloop">;

const FILL: CSSProperties = { position: "absolute", inset: 0 };

/**
 * A React Three Fiber canvas on the video's clock. It never draws on its own: every frame the player shows (or the
 * export captures) advances the scene to the layer's time, so `state.clock.elapsedTime` in `useFrame` is seconds
 * since the layer started, scrubbing backwards works, and two renders of a frame are the same picture.
 *
 * It fills its Layer unless `style` says otherwise, and keeps its drawing buffer so the export can capture it.
 */
export function ThreeScene({ children, gl, style, ...rest }: ThreeSceneProps) {
  // A renderer or a factory is the caller's own; options get a kept drawing buffer unless they say otherwise.
  const options = (
    typeof gl === "function" || isRenderer(gl) ? gl : { preserveDrawingBuffer: true, ...(gl as object | undefined) }
  ) as NonNullable<CanvasProps["gl"]>;
  // The renderer is created after mount; until the clock has drawn the first frame, an export must not capture.
  const ready = useRef<(() => void) | null>(null);
  ready.current ??= holdLayerFrame();
  const drawn = useCallback(() => ready.current?.(), []);
  useLayoutEffect(() => drawn, [drawn]);
  return (
    <Canvas {...rest} frameloop="never" gl={options} style={{ ...FILL, ...style }}>
      {children}
      {/* Last, so the children's useFrame subscriptions exist before the first advance. */}
      <VideoClock onDrawn={drawn} />
    </Canvas>
  );
}

function VideoClock({ onDrawn }: { readonly onDrawn: () => void }) {
  const { elapsed } = useLayer();
  const advance = useThree((s) => s.advance);
  useLayoutEffect(() => {
    advance(elapsed, true);
    onDrawn();
  }, [advance, elapsed, onDrawn]);
  return null;
}

function isRenderer(gl: unknown): boolean {
  return (
    typeof gl === "object" && gl !== null && "render" in gl && typeof (gl as { render: unknown }).render === "function"
  );
}

/** What `setup` gets once, when the scene is created. */
export interface ThreeSetup {
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  readonly renderer: THREE.WebGLRenderer;
  /** The three.js namespace, so pasted code that writes `THREE.Mesh` runs as it is. */
  readonly THREE: typeof THREE;
  /** The canvas size in composition pixels. */
  readonly width: number;
  readonly height: number;
}

/** What `update` gets on every frame. */
export interface ThreeFrame extends ThreeSetup {
  /** Seconds since the layer started. */
  readonly time: number;
  /** 0..1 through the layer. */
  readonly t: number;
  /** The layer's length in seconds. */
  readonly duration: number;
  /** Seconds since the previous frame drawn; negative after a scrub back. Prefer `time`. */
  readonly delta: number;
}

export type ThreeUpdate = (frame: ThreeFrame) => void;
/** Return an update function, or `{ update, dispose }`; objects `setup` added to the scene are removed after it. */
// biome-ignore lint/suspicious/noConfusingVoidType: a setup may return nothing; `void` lets one without a return statement type-check.
export type ThreeSetupFn = (setup: ThreeSetup) => ThreeUpdate | { update?: ThreeUpdate; dispose?: () => void } | void;

type Vec3Keys = readonly { readonly at: number; readonly value: readonly [number, number, number] }[];

export interface ThreeCamera {
  /** `[x, y, z]`, or keys in shot time. */
  readonly position?: readonly [number, number, number] | Vec3Keys;
  readonly lookAt?: readonly [number, number, number] | Vec3Keys;
  readonly fov?: number | readonly { readonly at: number; readonly value: number }[];
  readonly near?: number;
  readonly far?: number;
  readonly zoom?: number;
  readonly orthographic?: boolean;
}

/** What draws `<Three>`: the tag's props, resolved, and its React Three Fiber children. */
export function ThreeLayer(props: {
  readonly setup?: unknown;
  readonly camera?: unknown;
  readonly background?: unknown;
  readonly shot?: unknown;
  readonly in?: unknown;
  readonly objects?: unknown;
  readonly inputs?: unknown;
  readonly children?: ReactNode;
}) {
  const camera = (props.camera ?? {}) as ThreeCamera;
  return (
    // The camera type is fixed when the canvas is made, so switching it makes a new one.
    <ThreeScene key={camera.orthographic ? "ortho" : "persp"} orthographic={camera.orthographic === true}>
      <CameraRig {...camera} start={typeof props.in === "number" ? props.in : 0} />
      {typeof props.background === "string" ? <color attach="background" args={[props.background]} /> : null}
      {typeof props.setup === "function" ? <Setup setup={props.setup as ThreeSetupFn} /> : null}
      {isShot(props.shot) ? <Shot shot={props.shot} props={props as ShotProps} /> : null}
      {props.children}
    </ThreeScene>
  );
}

/**
 * The camera props: lenses on every change, position, look-at and field of view at the shot's time on every frame,
 * since each may be keys.
 */
function CameraRig({ position, lookAt, fov, near, far, zoom, start }: ThreeCamera & { readonly start: number }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    if (near !== undefined) (camera as THREE.PerspectiveCamera).near = near;
    if (far !== undefined) (camera as THREE.PerspectiveCamera).far = far;
    if (zoom !== undefined) (camera as THREE.PerspectiveCamera).zoom = zoom;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera, near, far, zoom]);
  const spec = useRef({ position, lookAt, fov, start });
  spec.current = { position, lookAt, fov, start };
  // Before the shot's own frame callback, so a shot's sample sees this frame's camera.
  useFrame((state) => {
    const s = spec.current;
    applyCamera(state.camera, s, s.start + state.clock.elapsedTime);
  }, -1);
  return null;
}

/** A shot: built once per scene, then set at the shot's time on every frame the video shows. */
function Shot({ shot, props }: { readonly shot: ShotDefinition; readonly props: ShotProps }) {
  const { scene, camera } = useThree();
  const built = useRef<ShotBuilt | null>(null);
  const latest = useRef(props);
  latest.current = props;
  useLayoutEffect(() => {
    const before = new Set(scene.children);
    built.current = buildShot(shot, scene, camera);
    const made = built.current;
    return () => {
      built.current = null;
      made.dispose?.();
      for (const child of [...scene.children])
        if (!before.has(child)) {
          scene.remove(child);
          disposeTree(child);
        }
    };
  }, [shot, scene, camera]);
  useFrame((state) => {
    if (!built.current) return;
    const p = latest.current;
    // The camera rig has already set the camera; applyShot sets it again from the same props, a no-op.
    applyShot(shot, built.current, p, state.camera, shotTime(state.clock.elapsedTime, p, shot.length));
  });
  return null;
}

/** Runs plain three.js: `setup` once per scene, its `update` on every frame the video shows. */
function Setup({ setup }: { readonly setup: ThreeSetupFn }) {
  const { scene, camera, gl, size } = useThree();
  const clock = useLayer();
  const update = useRef<ThreeUpdate | null>(null);
  const layer = useRef(clock);
  layer.current = clock;
  // biome-ignore lint/correctness/useExhaustiveDependencies: setup runs once per scene; a resize must not rebuild what it added.
  useLayoutEffect(() => {
    const before = new Set(scene.children);
    const result = setup({ scene, camera, renderer: gl, THREE, width: size.width, height: size.height });
    update.current = typeof result === "function" ? result : (result?.update ?? null);
    const dispose = typeof result === "object" && result ? result.dispose : undefined;
    return () => {
      update.current = null;
      dispose?.();
      for (const child of [...scene.children])
        if (!before.has(child)) {
          scene.remove(child);
          disposeTree(child);
        }
    };
  }, [setup, scene, camera, gl]);
  useFrame((state, delta) => {
    const { t, duration } = layer.current;
    update.current?.({
      scene: state.scene,
      camera: state.camera,
      renderer: state.gl,
      THREE,
      width: state.size.width,
      height: state.size.height,
      time: state.clock.elapsedTime,
      t,
      duration,
      delta,
    });
  });
  return null;
}

function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    for (const m of Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []) m.dispose();
  });
}

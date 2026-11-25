// The frames of a 3D scene a clip plays (`<Clip src={crossing} />`), drawn with three.js. The Player reads them like
// footage: it asks for the frame at a source time, and gets one drawn from that time alone, so playing, scrubbing
// back and jumping give the same picture.
import * as THREE from "three";

import { lensFov, type Scene, stageAt } from "@uberscene/kit";

type Vec3 = readonly [number, number, number];

/** A scene as a clip plays it: the module, the times the clip hands in, and the frame it is drawn at. */
export interface SceneUse {
  readonly scene: Scene;
  readonly times: Readonly<Record<string, number>>;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
}

/** What `build` made: the named objects and the camera. */
export interface BuiltScene {
  readonly root: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly objects: Readonly<Record<string, THREE.Object3D>>;
}

const DEG = Math.PI / 180;

/** Builds a scene module into a fresh three.js scene, once. */
export function buildScene(use: SceneUse): BuiltScene {
  const root = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, use.width / use.height, 0.05, 500);
  const objects = use.scene.build({ THREE, scene: root, camera, width: use.width, height: use.height });
  for (const [name, object] of Object.entries(objects ?? {}))
    if (!(object instanceof THREE.Object3D))
      throw new Error(`the scene's build returned "${name}", which is not an Object3D`);
  return { root, camera, objects: objects as Record<string, THREE.Object3D> };
}

/**
 * Puts a built scene at scene time `t`: each staged object and the camera where `stage` has them, then what the
 * module computes (`sample`). A channel the stage does not write keeps what `build` gave it, which nothing changes
 * after, so every visit to `t` sets the same transforms.
 */
export function poseScene(use: SceneUse, built: BuiltScene, t: number): void {
  const stage = stageAt(use.scene.stage, t, use.times);
  for (const [name, channels] of Object.entries(stage)) {
    if (name === "camera") continue;
    const object = built.objects[name];
    if (!object) continue;
    const { position, rotation, scale, visible } = channels as Record<string, unknown>;
    if (Array.isArray(position)) object.position.set(...(position as unknown as Vec3));
    if (Array.isArray(rotation)) {
      const r = rotation as unknown as Vec3;
      object.rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG, "XYZ");
    }
    if (typeof scale === "number") object.scale.setScalar(scale);
    else if (Array.isArray(scale)) object.scale.set(...(scale as unknown as Vec3));
    if (typeof visible === "boolean") object.visible = visible;
  }
  const cam = (stage.camera ?? {}) as Record<string, unknown>;
  const fov = typeof cam.fov === "number" ? cam.fov : typeof cam.lens === "number" ? lensFov(cam.lens) : undefined;
  if (fov !== undefined && built.camera.fov !== fov) {
    built.camera.fov = fov;
    built.camera.updateProjectionMatrix();
  }
  if (Array.isArray(cam.position)) built.camera.position.set(...(cam.position as unknown as Vec3));
  if (Array.isArray(cam.lookAt)) built.camera.lookAt(...(cam.lookAt as unknown as Vec3));
  use.scene.sample?.(t, { THREE, camera: built.camera, objects: built.objects, stage, times: use.times });
  built.camera.updateMatrixWorld(true);
  built.root.updateMatrixWorld(true);
}

type AnyCanvas = OffscreenCanvas;

/** A canvas off the page: the preview and the export both run in a browser that has them. */
function canvasOf(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas === "undefined")
    throw new Error("a 3D scene is drawn on an OffscreenCanvas, which this environment does not have");
  return new OffscreenCanvas(width, height);
}

/** One drawn frame, kept in a 2D canvas of its own, so later frames do not change it. */
class SceneFrame {
  constructor(
    private readonly canvas: AnyCanvas,
    readonly timestamp: number,
    readonly duration: number,
  ) {}
  get width(): number {
    return this.canvas.width;
  }
  get height(): number {
    return this.canvas.height;
  }
  draw(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    crop?: { x: number; y: number; w: number; h: number },
  ): void {
    if (crop) ctx.drawImage(this.canvas, crop.x, crop.y, crop.w, crop.h, dx, dy, dw, dh);
    else ctx.drawImage(this.canvas, dx, dy, dw, dh);
  }
  retain(): SceneFrame {
    return this;
  }
  close(): void {}
}

/**
 * A frame source over a scene: `frameAt(t)` draws the frame that covers scene time `t` on the scene's frame grid.
 * The WebGL renderer is made on first use and given back on `close`.
 */
export class SceneFrameSource {
  private built: BuiltScene | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private last: { index: number; frame: SceneFrame } | null = null;

  constructor(private readonly use: SceneUse) {}

  async open(): Promise<{ width: number; height: number; duration: number; decodable: boolean }> {
    return { width: this.use.width, height: this.use.height, duration: this.use.scene.length, decodable: true };
  }

  async frameAt(sourceTime: number): Promise<SceneFrame | null> {
    const { fps } = this.use;
    const last = Math.max(0, Math.ceil(this.use.scene.length * fps) - 1);
    const index = Math.min(last, Math.max(0, Math.floor(sourceTime * fps + 1e-6)));
    if (this.last?.index === index) return this.last.frame;
    const frame = this.draw(index / fps, 1 / fps);
    this.last = { index, frame };
    return frame;
  }

  async *stream(from: number, to: number): AsyncGenerator<SceneFrame, void, unknown> {
    const { fps } = this.use;
    for (let i = Math.max(0, Math.floor(from * fps + 1e-6)); i / fps < Math.min(to, this.use.scene.length); i++) {
      const frame = await this.frameAt(i / fps);
      if (frame) yield frame;
    }
  }

  close(): void {
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer = null;
    this.built = null;
    this.last = null;
  }

  private draw(t: number, duration: number): SceneFrame {
    const { width, height } = this.use;
    if (!this.renderer) {
      const canvas = canvasOf(width, height);
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(width, height, false);
    }
    this.built ??= buildScene(this.use);
    poseScene(this.use, this.built, t);
    this.renderer.render(this.built.root, this.built.camera);
    const copy = canvasOf(width, height);
    (copy.getContext("2d") as OffscreenCanvasRenderingContext2D).drawImage(this.renderer.domElement, 0, 0);
    return new SceneFrame(copy, t, duration);
  }
}

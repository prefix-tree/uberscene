// A scene asset (manifest kind `scene`) as footage whose frames are computed. The file is a standalone 3D scene; an
// engine the host installed builds it once and draws it at the source time a clip asks for, as a decoder would hand
// back the frame at that time. Everything a clip does to footage (trims, speed, reverse, freezes, transitions,
// effects, crops, layout) then works on it unchanged.

import { type SceneRenderer, sceneEngine } from "@uberscene/kit/schema";
import type { AssetEntry } from "@uberscene/sdk/resolver";

import type { CreateCanvas, Ctx2D, Frame, FrameSource, FrameSourceInfo, MediaHandle } from "../types";
import { ImageFrame } from "./frame-source";

const DEFAULT_FPS = 30;

export class SceneFrameSource implements FrameSource {
  private renderer: Promise<SceneRenderer> | null = null;
  /** Draws run one at a time: the scene is one set of objects and one canvas. */
  private queue: Promise<unknown> = Promise.resolve();
  private last: { index: number; frame: ImageFrame } | null = null;
  private closed = false;
  private readonly fps: number;
  private readonly width: number;
  private readonly height: number;

  constructor(
    private readonly assetId: string,
    private readonly handle: MediaHandle,
    private readonly asset: AssetEntry | null,
    private readonly createCanvas: CreateCanvas,
  ) {
    this.fps = asset?.fps ?? DEFAULT_FPS;
    this.width = asset?.width ?? 1920;
    this.height = asset?.height ?? 1080;
  }

  async open(): Promise<FrameSourceInfo> {
    const r = await this.load();
    return {
      width: this.width,
      height: this.height,
      duration: this.asset?.duration ?? r.length ?? 0,
      fps: this.fps,
      decodable: true,
    };
  }

  /** The frame on the scene's frame grid at or before `sourceTime`, so a scene steps like footage at its fps. */
  frameAt(sourceTime: number): Promise<Frame | null> {
    return this.frameNumbered(this.indexAt(sourceTime));
  }

  async *stream(from: number, to: number): AsyncGenerator<Frame, void, unknown> {
    for (let i = this.indexAt(from); i / this.fps < to; i++) {
      if (this.closed) return;
      const f = await this.frameNumbered(i);
      if (!f) return;
      yield f;
    }
  }

  close(): void {
    this.closed = true;
    this.last?.frame.close();
    this.last = null;
    void this.renderer?.then((r) => r.close()).catch(() => undefined);
    this.renderer = null;
  }

  private indexAt(t: number): number {
    const duration = this.asset?.duration;
    const clamped = Math.max(0, duration !== undefined ? Math.min(t, duration) : t);
    // To the microsecond first, so 3.2 * 30 lands on frame 96 and not 95.99999.
    return Math.floor(Math.round(clamped * this.fps * 1e6) / 1e6);
  }

  private frameNumbered(index: number): Promise<Frame | null> {
    if (this.last?.index === index) return Promise.resolve(this.last.frame);
    const next = this.queue.then(async () => {
      if (this.last?.index === index) return this.last.frame;
      const r = await this.load();
      const seconds = index / this.fps;
      const image = (await r.draw(seconds)) as CanvasImageSource & { width: number; height: number };
      // The engine draws the next frame on the same canvas: the player gets a copy it may keep.
      const canvas = this.createCanvas(this.width, this.height);
      const ctx = canvas.getContext("2d") as Ctx2D | null;
      ctx?.drawImage(image, 0, 0, this.width, this.height);
      const frame = new ImageFrame(
        canvas as unknown as CanvasImageSource & { width: number; height: number },
        seconds,
        1 / this.fps,
        false,
      );
      this.last = { index, frame };
      return frame;
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  private load(): Promise<SceneRenderer> {
    this.renderer ??= (async () => {
      const engine = sceneEngine();
      if (!engine)
        throw new Error(
          `asset "${this.assetId}" is a scene, and no scene engine is installed (installSceneFiles from @uberscene/graphics/libraries)`,
        );
      return engine.open(await sourceOf(this.handle), { width: this.width, height: this.height });
    })();
    return this.renderer;
  }
}

async function sourceOf(handle: MediaHandle): Promise<string> {
  if (handle.kind === "blob") return handle.blob.text();
  if (handle.kind === "url") {
    const res = await fetch(handle.url);
    if (!res.ok) throw new Error(`${handle.url}: ${res.status}`);
    return res.text();
  }
  throw new Error(`a browser cannot read the path ${handle.path}; give it a URL`);
}

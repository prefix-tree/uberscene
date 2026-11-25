import type { AnyCanvas, CreateCanvas, Ctx2D, Frame, FrameSource, FrameSourceInfo } from "../types";

export function defaultCreateCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

type Crop = { x: number; y: number; w: number; h: number };

/** A frame backed by an image we own (canvas or bitmap); `retain` is free. */
export class ImageFrame implements Frame {
  constructor(
    private readonly image: CanvasImageSource & { width: number; height: number },
    readonly timestamp: number,
    readonly duration: number,
    private readonly owned: boolean,
  ) {}
  get width(): number {
    return this.image.width;
  }
  get height(): number {
    return this.image.height;
  }
  draw(ctx: Ctx2D, dx: number, dy: number, dw: number, dh: number, crop?: Crop): void {
    if (crop) ctx.drawImage(this.image, crop.x, crop.y, crop.w, crop.h, dx, dy, dw, dh);
    else ctx.drawImage(this.image, dx, dy, dw, dh);
  }
  retain(): Frame {
    return this;
  }
  close(): void {
    if (this.owned && "close" in this.image && typeof (this.image as ImageBitmap).close === "function")
      (this.image as ImageBitmap).close();
  }
}

/** Copies any frame into a canvas we own. */
export function copyFrame(frame: Frame, createCanvas: CreateCanvas): Frame {
  const canvas = createCanvas(Math.max(1, frame.width), Math.max(1, frame.height));
  const ctx = canvas.getContext("2d") as Ctx2D | null;
  if (ctx) frame.draw(ctx, 0, 0, frame.width, frame.height);
  return new ImageFrame(
    canvas as unknown as CanvasImageSource & { width: number; height: number },
    frame.timestamp,
    frame.duration,
    false,
  );
}

/**
 * Still images: one bitmap, drawn for every time. Each frame handed out is a view that does not own the bitmap, so a
 * clip that closes its frame (when it ends, or is replaced) leaves the picture open for the other clips of the same
 * image; the source closes it.
 */
export class ImageFrameSource implements FrameSource {
  private bitmap: Promise<ImageBitmap | HTMLImageElement> | null = null;
  constructor(private readonly load: () => Promise<ImageBitmap | HTMLImageElement>) {}

  async open(): Promise<FrameSourceInfo> {
    const f = await this.frame();
    return { width: f.width, height: f.height, duration: 0, decodable: true };
  }
  async frameAt(): Promise<Frame | null> {
    return this.frame();
  }
  async *stream(): AsyncGenerator<Frame, void, unknown> {
    yield await this.frame();
  }
  close(): void {
    void this.bitmap
      ?.then((img) => {
        if ("close" in img) img.close();
      })
      .catch(() => undefined);
    this.bitmap = null;
  }
  private async frame(): Promise<ImageFrame> {
    this.bitmap ??= this.load();
    const img = await this.bitmap;
    return new ImageFrame(
      img as CanvasImageSource & { width: number; height: number },
      0,
      Number.POSITIVE_INFINITY,
      false,
    );
  }
}

/** Draws a grey box with a label; used for missing or undecodable assets. */
export class ErrorFrame implements Frame {
  readonly timestamp = 0;
  readonly duration = Number.POSITIVE_INFINITY;
  constructor(
    readonly width: number,
    readonly height: number,
    private readonly label: string,
  ) {}
  draw(ctx: Ctx2D, dx: number, dy: number, dw: number, dh: number): void {
    ctx.fillStyle = "#444444";
    ctx.fillRect(dx, dy, dw, dh);
    ctx.fillStyle = "#cccccc";
    ctx.font = "24px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.label, dx + dw / 2, dy + dh / 2);
  }
  retain(): Frame {
    return this;
  }
  close(): void {}
}

export class ErrorFrameSource implements FrameSource {
  private readonly frame: ErrorFrame;
  constructor(label: string, width = 640, height = 360) {
    this.frame = new ErrorFrame(width, height, label);
  }
  open(): Promise<FrameSourceInfo> {
    return Promise.resolve({ width: this.frame.width, height: this.frame.height, duration: 0, decodable: false });
  }
  frameAt(): Promise<Frame | null> {
    return Promise.resolve(this.frame);
  }
  async *stream(): AsyncGenerator<Frame, void, unknown> {
    yield this.frame;
  }
  close(): void {}
}

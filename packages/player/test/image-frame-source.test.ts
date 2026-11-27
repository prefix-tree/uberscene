import { describe, expect, it } from "vitest";

import { ImageFrameSource } from "../src/media/frame-source";

/** A bitmap that records whether it was closed. */
const bitmap = () => {
  const b = { width: 4, height: 2, closed: 0, close: () => void b.closed++ };
  return b;
};

describe("ImageFrameSource", () => {
  it("keeps the picture open when one clip closes its frame: another clip of the same image still draws", async () => {
    const b = bitmap();
    const source = new ImageFrameSource(async () => b as unknown as ImageBitmap);
    const first = await source.frameAt();
    const second = await source.frameAt();
    // The first clip ends and closes what it held.
    first?.close();
    expect(b.closed).toBe(0);
    expect(second?.width).toBe(4);
    // The source owns the bitmap, and closes it once.
    source.close();
    await Promise.resolve();
    await Promise.resolve();
    expect(b.closed).toBe(1);
  });

  it("loads the image once however many frames are asked for", async () => {
    let loads = 0;
    const source = new ImageFrameSource(async () => {
      loads++;
      return bitmap() as unknown as ImageBitmap;
    });
    await source.open();
    await source.frameAt();
    for await (const _ of source.stream()) break;
    expect(loads).toBe(1);
  });
});

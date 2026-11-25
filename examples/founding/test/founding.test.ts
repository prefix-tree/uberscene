// The film loads the way the editor loads it, resolves without errors, lints clean, and its music is the bytes
// media/bed.ts writes.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { type AssetManifest, collectModule, lint, loadModule, resolve } from "@uberscene/sdk";

import { bed, wav } from "../media/bed";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "uberscene.json"), "utf8")) as AssetManifest;
const source = readFileSync(join(root, "video.tsx"), "utf8");

describe("video.tsx", () => {
  const mod = loadModule(source) as { defaults?: Record<string, unknown> };
  const state = resolve(collectModule(mod as never, mod.defaults ?? {}), manifest);

  it("resolves without errors and lints clean", () => {
    expect(state.errors).toEqual([]);
    expect(lint(source, { manifest })).toEqual([]);
  });

  it("is 55 seconds of 1080p, its scenes back to back", () => {
    expect([state.composition.width, state.composition.height, state.composition.duration]).toEqual([1920, 1080, 55]);
    const scenes = [...state.items.values()].filter((p) => p.kind === "layer").sort((a, b) => a.start - b.start);
    for (const [i, scene] of scenes.entries()) {
      const next = scenes[i + 1];
      expect(next ? next.start : 55).toBeCloseTo(scene.end, 6);
    }
  });
});

describe("media/bed.ts", () => {
  it("writes the committed bed.wav", () => {
    expect(wav(bed()).equals(readFileSync(join(root, "media", "bed.wav")))).toBe(true);
  }, 60_000);
});

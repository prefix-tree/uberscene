import { createElement as h } from "react";
import { describe, expect, it } from "vitest";

import { Audio, Clip, Composition, Track } from "@uberscene/kit";
import { type AssetManifest, collect, parseTimeRef, resolve, resolveTimeRef } from "@uberscene/sdk";

// A song at 120 BPM whose first beat is at 0.3 s, and a shot to cut on it.
const beats = Array.from({ length: 40 }, (_, i) => ({ i, start: 0.3 + i * 0.5, end: 0.8 + i * 0.5 }));
const manifest: AssetManifest = {
  assets: {
    song: { id: "song", kind: "audio", duration: 20.5, beats, tempo: 120 },
    pour: { id: "pour", kind: "video", duration: 30, fps: 30, width: 1920, height: 1080 },
  },
};

describe("beat references", () => {
  it("parse and look up like words: the beat, and with .end the next one", () => {
    expect(parseTimeRef("beat:4")).toEqual({ kind: "beat", index: 4, edge: "start" });
    const ctx = { id: "x", prop: "in" };
    const song = manifest.assets.song ?? null;
    expect(resolveTimeRef("beat:4", song, new Map(), ctx)).toBe(2.3);
    expect(resolveTimeRef("beat:4.end", song, new Map(), ctx)).toBe(2.8);
    expect(resolveTimeRef("beat:99", song, new Map(), ctx)).toMatchObject({ code: "UNKNOWN_REF" });
  });

  it("cut the music and start shots on beats, and follow the music when it is trimmed", () => {
    const edit = (songIn: string) =>
      h(
        Composition,
        { fps: 30, width: 1920, height: 1080 },
        h(
          Track,
          { id: "music", layout: "free" },
          h(Audio, { id: "s", src: "asset:song", start: 0, in: songIn, out: "beat:31.end" }),
        ),
        h(
          Track,
          { id: "shots", layout: "free" },
          h(Clip, { id: "a", src: "asset:pour", anchor: "s", at: "beat:8", in: 2, duration: 2 }),
        ),
      );
    const first = resolve(collect(edit("beat:0")), manifest);
    expect(first.errors).toEqual([]);
    expect(first.items.get("s")?.duration).toBeCloseTo(16, 6);
    expect(first.items.get("a")?.start).toBeCloseTo(4, 6);
    // Start the song four beats later: the shot still lands on beat 8, now 2 s in.
    const trimmed = resolve(collect(edit("beat:4")), manifest);
    expect(trimmed.items.get("a")?.start).toBeCloseTo(2, 6);
  });

  it("end a shot on a beat, which follows the music when it is trimmed", () => {
    const edit = (songIn: string) =>
      h(
        Composition,
        { fps: 30, width: 1920, height: 1080 },
        h(
          Track,
          { id: "music", layout: "free" },
          h(Audio, { id: "s", src: "asset:song", start: 0, in: songIn, out: "beat:31.end" }),
        ),
        h(
          Track,
          { id: "shots", layout: "free" },
          h(Clip, {
            id: "a",
            src: "asset:pour",
            anchor: "s",
            at: "beat:8",
            in: 2,
            duration: { until: "s", at: "beat:16" },
          }),
        ),
      );
    const first = resolve(collect(edit("beat:0")), manifest);
    expect(first.errors).toEqual([]);
    // Beats 8 to 16 at 120 BPM: 4 s, from 4 s to 8 s.
    expect(first.items.get("a")).toMatchObject({ start: 4, duration: 4 });
    const trimmed = resolve(collect(edit("beat:4")), manifest);
    expect(trimmed.items.get("a")).toMatchObject({ start: 2, duration: 4 });
  });
});

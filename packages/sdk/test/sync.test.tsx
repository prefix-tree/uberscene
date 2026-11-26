import { createElement as h } from "react";
import { describe, expect, it } from "vitest";

import { Audio, Clip, Composition, Marker, Title, Track } from "@uberscene/kit";
import {
  type AssetManifest,
  collect,
  resolve,
  syncReport,
  timelineBeats,
  timelineEvents,
  timelineRows,
} from "@uberscene/sdk";

// A song at 120 BPM whose first beat is at 0.3 s; the edit starts it on that beat, so beat N plays at N / 2 s.
const beats = Array.from({ length: 40 }, (_, i) => ({ i, start: 0.3 + i * 0.5, end: 0.8 + i * 0.5 }));
const manifest: AssetManifest = {
  assets: {
    song: { id: "song", kind: "audio", duration: 20.5, beats, tempo: 120 },
    pour: { id: "pour", kind: "video", duration: 30, fps: 30, width: 1920, height: 1080 },
  },
};

const edit = (shots: unknown[], song: Record<string, unknown> = {}) =>
  resolve(
    collect(
      h(
        Composition,
        { fps: 30, width: 1920, height: 1080 },
        h(Marker, { id: "drop", start: 4, label: "the drop" }),
        h(
          Track,
          { id: "music", layout: "free", role: "music" },
          h(Audio, { id: "s", src: "asset:song", start: 0, in: "beat:0", out: "beat:15.end", ...song }),
        ),
        h(Track, { id: "shots", layout: "free" }, ...(shots as never[])),
      ),
    ),
    manifest,
  );

const shot = (id: string, props: Record<string, unknown>) =>
  h(Clip, { id, src: "asset:pour", in: 2, duration: 1, ...props });

describe("beats on the timeline", () => {
  it("are the asset's beats at the times the clip plays them, without the ones trimmed out", () => {
    const state = edit([]);
    expect(state.errors).toEqual([]);
    const played = timelineBeats(state);
    expect(played).toHaveLength(16);
    expect(played[0]).toEqual({ asset: "song", play: "s", i: 0, time: 0, sourceTime: 0.3 });
    expect(played[15]).toMatchObject({ i: 15, time: 7.5 });
  });

  it("are rows of the timeline, with the music they belong to and the track's role", () => {
    const rows = timelineRows(edit([]));
    expect(rows.beats[2]).toEqual({ asset: "song", clip: "s", i: 2, time: 1, frame: 30, sourceTime: 1.3 });
    expect(rows.music).toEqual([
      {
        clip: "s",
        asset: "song",
        track: "music",
        role: "music",
        tempo: 120,
        beatSeconds: 0.5,
        beats: 16,
        first: 0,
        last: 15,
        from: 0,
        to: 8,
        grid: "grid",
      },
    ]);
    expect(rows.tracks.find((t) => t.id === "music")?.role).toBe("music");
  });
});

describe("timelineEvents", () => {
  const state = edit([shot("a", { anchor: "s", at: "beat:2" }), shot("b", { start: 3.15 })]);

  it("lists every moment in time order, and says which beat a start or an end is nearest", () => {
    const events = timelineEvents(state, { from: 0.9, to: 3.2 });
    expect(events.map((e) => `${e.time} ${e.kind} ${e.of}${e.i !== undefined ? ` ${e.i}` : ""}`)).toEqual([
      "1 beat s 2",
      "1 start a",
      "1.5 beat s 3",
      "2 beat s 4",
      "2 end a",
      "2.5 beat s 5",
      "3 beat s 6",
      "3.15 start b",
    ]);
    expect(events.find((e) => e.of === "b")?.nearestBeat).toEqual({
      clip: "s",
      i: 6,
      time: 3,
      offsetMs: 150,
      offsetFrames: 5,
    });
    expect(events.find((e) => e.of === "a" && e.kind === "start")?.nearestBeat?.offsetMs).toBe(0);
  });

  it("keeps only the kinds asked for, and has markers", () => {
    expect(timelineEvents(state, { kinds: ["marker"] })).toEqual([
      { time: 4, frame: 120, kind: "marker", of: "drop", label: "the drop" },
    ]);
    expect(timelineEvents(state, { kinds: ["beat"], from: 7 }).map((e) => e.i)).toEqual([14, 15]);
  });
});

describe("syncReport", () => {
  it("finds every start on its beat, and which ones the file ties to a beat", () => {
    const report = syncReport(edit([shot("a", { anchor: "s", at: "beat:2" }), shot("b", { start: 2 })]));
    expect(report.points.map((p) => [p.id, p.status, p.anchored, p.beat.i])).toEqual([
      ["a", "on", true, 2],
      ["b", "on", false, 4],
    ]);
    expect(report.summary).toEqual({ points: 2, on: 2, near: 0, off: 0, anchored: 1, outsideMusic: 0 });
    expect(report.issues).toEqual([]);
  });

  it("reports a start a little off a beat as a miss, with the beat to tie it to", () => {
    const report = syncReport(edit([shot("b", { start: 3.1 })]));
    expect(report.points[0]).toMatchObject({ id: "b", status: "near", beat: { i: 6, offsetMs: 100, offsetFrames: 3 } });
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toMatchObject({ rule: "near-beat", id: "b", time: 3.1 });
    expect(report.issues[0]?.message).toContain("100 ms after beat 6");
    expect(report.issues[0]?.fix).toBe('start it on the beat: anchor="s" at="beat:6"');
  });

  it("leaves a start far from any beat alone: half way between two is a choice", () => {
    const report = syncReport(edit([shot("b", { start: 3.25 })]));
    expect(report.points[0]?.status).toBe("off");
    expect(report.issues).toEqual([]);
  });

  it("reports a cut in a sequence against the clip that should end on the beat", () => {
    const state = resolve(
      collect(
        h(
          Composition,
          { fps: 30, width: 1920, height: 1080 },
          h(
            Track,
            { id: "music", layout: "free" },
            h(Audio, { id: "s", src: "asset:song", start: 0, in: "beat:0", out: "beat:15.end" }),
          ),
          h(
            Track,
            { id: "main" },
            h(Clip, { id: "a", src: "asset:pour", in: 0, duration: 2.08 }),
            h(Clip, { id: "b", src: "asset:pour", in: 5, duration: 2 }),
          ),
        ),
      ),
      manifest,
    );
    const report = syncReport(state);
    expect(report.points.map((p) => [p.kind, p.id, p.from, p.status])).toEqual([
      ["start", "a", undefined, "on"],
      ["cut", "b", "a", "near"],
    ]);
    expect(report.issues[0]?.fix).toBe('end "a" on the beat: duration={{ until: "s", at: "beat:4" }}');
  });

  it("reports music that stops between beats with no fade, and not music that fades or ends on a beat", () => {
    const cutOff = syncReport(edit([], { out: 4.5 }));
    expect(cutOff.issues.map((i) => i.rule)).toEqual(["music-cut-off"]);
    expect(cutOff.issues[0]?.fix).toContain('out="beat:7.end"');
    expect(syncReport(edit([], { out: 4.5, fade: { out: 0.5 } })).issues).toEqual([]);
    expect(syncReport(edit([])).issues).toEqual([]);
  });

  it("is empty for a video with no music that has beats, and counts what plays outside the music", () => {
    const silent = resolve(
      collect(h(Composition, { fps: 30, width: 1920, height: 1080 }, h(Track, { id: "main" }, shot("a", {})))),
      manifest,
    );
    expect(syncReport(silent)).toMatchObject({ music: [], points: [], issues: [] });
    const late = syncReport(edit([h(Title, { id: "t", start: 12, duration: 2 }, "After")]));
    expect(late.summary).toMatchObject({ points: 0, outsideMusic: 1 });
  });
});

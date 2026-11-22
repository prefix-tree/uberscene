import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  type ActionInput,
  applyEdits,
  buildSourceIndex,
  collectModule,
  Executor,
  foldToSource,
  gatherLocalFiles,
  loadModule,
  resolve,
} from "@uberscene/sdk";

const dir = join(import.meta.dirname, "..", "..", "..", "examples", "3d");
const original = readFileSync(join(dir, "crossing.tsx"), "utf8");
const files = gatherLocalFiles(original, (p) => {
  try {
    return readFileSync(join(dir, p), "utf8");
  } catch {
    return undefined;
  }
});
const manifest = { version: 1, assets: {} } as never;

function open(text: string) {
  const tree = collectModule(loadModule(text, { files }) as never, {}, { index: buildSourceIndex(text) });
  return new Executor({ tree, manifest, now: () => 0 });
}

/** Runs the actions, folds them into the file, and returns the new text and the lines that changed. */
function save(text: string, actions: readonly ActionInput[]) {
  const exec = open(text);
  for (const a of actions) {
    const r = exec.execute(a);
    if (!r.ok) throw new Error(`${a.type}: ${JSON.stringify(r)}`);
  }
  const folded = foldToSource(text, exec.log(), exec.state());
  expect(folded.skipped).toEqual([]);
  const after = applyEdits(text, folded.edits);
  const a = text.split("\n");
  const b = after.split("\n");
  const diff: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    if (a[i] !== b[i]) diff.push(`- ${a[i]?.trim()}`, `+ ${b[i]?.trim()}`);
  return { text: after, diff, exec };
}

const shot = (text: string) =>
  resolve(collectModule(loadModule(text, { files }) as never, {}), manifest).items.get("crossing-shot")!;

describe("a 3D shot on the timeline", () => {
  it("resolves, with the walker's beat key at the marker's time in the shot", () => {
    const item = shot(original);
    expect(item.errors).toEqual([]);
    const walker = (item.props.objects as Record<string, { position: { at: number }[] }>).walker!;
    expect(walker.position.map((k) => k.at)).toEqual([0.5, 2, 3.2]);
  });

  it("drag the table: one number in the table's line", () => {
    const { diff, text } = save(original, [
      { type: "shot/set", params: { id: "crossing-shot", path: "objects.table.position", value: [0.4, 0, 0.6] } },
    ]);
    expect(diff).toEqual(["- table: { position: [0, 0, 0.6] },", "+ table: { position: [0.4, 0, 0.6] },"]);
    expect((shot(text).props.objects as Record<string, { position: unknown }>).table!.position).toEqual([0.4, 0, 0.6]);
  });

  it("change the walker's key at 3.2 s: one value in that key's line", () => {
    const { diff, text } = save(original, [
      {
        type: "key/update",
        params: { id: "crossing-shot", path: "objects.walker.position", at: 3.2, value: [1.2, 0, -0.6] },
      },
    ]);
    expect(diff).toEqual(["- { at: 3.2, value: [1.5, 0, -0.8] },", "+ { at: 3.2, value: [1.2, 0, -0.6] },"]);
    expect(shot(text).errors).toEqual([]);
  });

  it("a key at the playhead in shot time: the layer starts at 2, the playhead is at 5.2, the key lands at 3.2", () => {
    // The viewport works out shot time from the playhead: in + (5.2 - start).
    const item = shot(original);
    const at = Math.round(((item.props.in as number | undefined) ?? 0) + (5.2 - item.start) * 1e6) / 1e6;
    const { diff } = save(original, [
      { type: "key/add", params: { id: "crossing-shot", path: "objects.table.position", at, value: [0.3, 0, 0.6] } },
    ]);
    // A constant gains keys: what it was at 0, and the new one.
    expect(diff).toEqual([
      "- table: { position: [0, 0, 0.6] },",
      "+ table: { position: [{ at: 0, value: [0, 0, 0.6] }, { at: 3.2, value: [0.3, 0, 0.6] }] },",
    ]);
  });

  it("move the beat earlier in the edit: the marker's line changes, the shot does not, and the walker comes out on it", () => {
    const { diff, text } = save(original, [{ type: "marker/update", params: { markerId: "reveal", start: 3.6 } }]);
    expect(diff).toEqual([
      '- <Marker id="reveal" start={4} label="reveal" />',
      '+ <Marker id="reveal" start={3.6} label="reveal" />',
    ]);
    const walker = (shot(text).props.objects as Record<string, { position: { at: number }[] }>).walker!;
    expect(walker.position.map((k) => k.at)).toEqual([0.5, 1.6, 3.2]);
  });

  it("move the shot later in the edit: its keys stay in shot time, and the beat key follows the marker", () => {
    const { diff, text } = save(original, [{ type: "layer/setTiming", params: { id: "crossing-shot", start: 3 } }]);
    expect(diff).toEqual(["- start={2}", "+ start={3}"]);
    const item = shot(text);
    expect(item.start).toBe(3);
    const walker = (item.props.objects as Record<string, { position: { at: number }[] }>).walker!;
    // The marker at 4 s in the edit is now 1 s into the shot.
    expect(walker.position.map((k) => k.at)).toEqual([0.5, 1, 3.2]);
  });

  it("trim the shot's head: start and in move together, so no pose moves in the edit", () => {
    const { diff, text } = save(original, [
      { type: "clip/trim", params: { id: "crossing-shot", edge: "in", value: 2.4 } },
    ]);
    expect(diff).toEqual([
      "- start={2}",
      "+ start={2.4}",
      "- duration={5}",
      "+ duration={4.6}",
      "- inputs={{ stride: 1.4 }}",
      "+ inputs={{ stride: 1.4 }} in={0.4}",
    ]);
    const item = shot(text);
    expect([item.start, item.props.in, item.duration]).toEqual([2.4, 0.4, 4.6]);
    // The beat key is still at shot time 2: the marker at 4 s is 1.6 s into the trimmed layer, plus its in of 0.4.
    const walker = (item.props.objects as Record<string, { position: { at: number }[] }>).walker!;
    expect(walker.position.map((k) => k.at)).toEqual([0.5, 2, 3.2]);
  });

  it("retime the crossing's end: the key moves, and nothing else", () => {
    const { diff } = save(original, [
      { type: "key/move", params: { id: "crossing-shot", path: "objects.walker.position", at: 3.2, to: 2.8 } },
    ]);
    expect(diff).toEqual(["- { at: 3.2, value: [1.5, 0, -0.8] },", "+ { at: 2.8, value: [1.5, 0, -0.8] },"]);
  });

  it("finds the beat key by the marker's time and keeps it tied when its value changes", () => {
    const { diff } = save(original, [
      {
        type: "key/update",
        params: { id: "crossing-shot", path: "objects.walker.position", at: 2, value: [-0.8, 0, -0.8] },
      },
    ]);
    expect(diff).toEqual([
      '- { at: "marker:reveal", value: [-1, 0, -0.8] },',
      '+ { at: "marker:reveal", value: [-0.8, 0, -0.8] },',
    ]);
  });

  it("undo puts the file back as it was", () => {
    const exec = open(original);
    exec.execute({
      type: "shot/set",
      params: { id: "crossing-shot", path: "objects.table.position", value: [0.4, 0, 0.6] },
    });
    exec.undo();
    const folded = foldToSource(original, exec.log(), exec.state());
    expect(applyEdits(original, folded.edits)).toBe(original);
  });

  it("refuses what the shot does not have, and a drag on a path with keys", () => {
    const exec = open(original);
    const refused = (a: ActionInput) => {
      const r = exec.execute(a);
      expect(r.ok).toBe(false);
      return (r as unknown as { errors: { message: string }[] }).errors[0]!.message;
    };
    expect(
      refused({ type: "shot/set", params: { id: "crossing-shot", path: "objects.lamp.position", value: [0, 0, 0] } }),
    ).toContain('no object "lamp"');
    expect(
      refused({ type: "shot/set", params: { id: "crossing-shot", path: "objects.walker.position", value: [0, 0, 0] } }),
    ).toContain("has keys");
    expect(refused({ type: "shot/set", params: { id: "crossing-shot", path: "inputs.speed", value: 2 } })).toContain(
      'no input "speed"',
    );
  });

  it("refuses a channel the shot computes, naming the inputs to change instead", () => {
    const computing = original.replace('import crossing from "./crossing.js";', 'import crossing from "./spin.js";');
    const spin = `import { defineShot } from "@uberscene/kit";
export default defineShot({ objects: { table: { computes: ["rotation"] }, flat: {}, walker: {} }, inputs: { stride: 1, turns: 1 }, build: () => ({ objects: {} }) });`;
    const tree = collectModule(
      loadModule(computing, { files: { ...files, "spin.js": spin } }) as never,
      {},
      { index: buildSourceIndex(computing) },
    );
    const exec = new Executor({ tree, manifest, now: () => 0 });
    const r = exec.execute({
      type: "shot/set",
      params: { id: "crossing-shot", path: "objects.table.rotation", value: [0, 45, 0] },
    });
    expect(r.ok).toBe(false);
    expect((r as unknown as { errors: { message: string }[] }).errors[0]!.message).toContain(
      "computes table's rotation",
    );
    expect((r as unknown as { errors: { message: string }[] }).errors[0]!.message).toContain("stride, turns");
  });

  it("reports an object the shot does not declare, and a marker the edit does not have", () => {
    const text = original.replace("flat: { position:", "lamp: { position:").replace('"marker:reveal"', '"marker:beat"');
    const messages = shot(text).errors.map((e) => e.message);
    expect(messages).toContain('the shot has no object "lamp"; it has table, flat, walker');
    expect(messages).toContain('no <Marker id="beat"> in the composition');
  });
});

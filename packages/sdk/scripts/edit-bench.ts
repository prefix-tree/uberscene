import { readFileSync } from "node:fs";
import { cpus } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { Time, TimeRange } from "@uberscene/kit/schema";

import { buildLarge } from "../fixtures/large";
import { type ActionInput, type AssetManifest, collectModule, Executor } from "../src/index";

/**
 * What one edit costs while dragging: an action through the Executor (validate, invert, patch, resolve) on the
 * 200-clip project the speed test uses. `pnpm bench:edit`, before and after a change to the resolver or to `Time`.
 *
 * Each kind of edit is timed in batches, the kinds taking turns, so a busy moment on the machine lands on all of
 * them alike. The fastest batch is the cost; the median says how steady the machine was. No test runner and no
 * coverage: this is the number a person dragging feels, not the one the test suite measures. (It runs under tsx,
 * which names every function when it is made; a built package does not, and is a little faster for it.)
 *
 * Beside the time: the `Time`s and ranges one edit makes, and how many of the timeline's placements it made anew
 * (the rest are the objects the state before had). `--clips 1000` shows how the cost grows with the project.
 *
 *   --clips <n>     clips in the project (200)
 *   --rounds <n>    batches per kind of edit (15)
 *   --steps <n>     edits per batch (100)
 */
const flag = (name: string, fallback: number): number => {
  const at = process.argv.indexOf(`--${name}`);
  const value = at >= 0 ? Number(process.argv[at + 1]) : fallback;
  if (!Number.isInteger(value) || value < 1) throw new Error(`--${name} wants a whole number above zero`);
  return value;
};
const CLIPS = flag("clips", 200);
const ROUNDS = flag("rounds", 15);
const STEPS = flag("steps", 100);

const fixtures = join(import.meta.dirname, "..", "fixtures");
const sample = JSON.parse(readFileSync(join(fixtures, "sample.manifest.json"), "utf8")) as AssetManifest;
// The project runs for minutes; its music bed has to be as long, or the resolver says the bed runs out.
const manifest = {
  assets: { ...sample.assets, bed: { ...sample.assets.bed, duration: 600 } },
} as AssetManifest;
const tree = collectModule(buildLarge(CLIPS));

interface Edit {
  readonly name: string;
  readonly exec: Executor;
  readonly action: (i: number) => ActionInput;
}

function edit(name: string, action: (exec: Executor) => (i: number) => ActionInput): Edit {
  const exec = new Executor({ tree, manifest, now: () => 0 });
  return { name, exec, action: action(exec) };
}

const EDITS: readonly Edit[] = [
  edit("trim a clip's end (clip/trim)", (exec) => {
    const from = exec.state().items.get("c3")!.source!.in;
    return (i) => ({ type: "clip/trim", params: { id: "c3", edge: "out", value: from + 0.5 + (i % 50) / 100 } });
  }),
  edit("move a title in time (clip/move)", () => (i) => ({
    type: "clip/move",
    params: { id: "t1", place: { anchor: "c4", offset: 0.2 + (i % 50) / 100 } },
  })),
  edit("move a clip on the frame (box/update)", () => (i) => ({
    type: "box/update",
    params: { id: "c3", box: { x: i % 50, y: 0 } },
  })),
  edit("set a prop (clip/setFit)", () => (i) => ({
    type: "clip/setFit",
    params: { id: "c3", value: i % 2 === 0 ? "contain" : "cover" },
  })),
];

function run(e: Edit, steps: number): void {
  for (let i = 0; i < steps; i++) {
    const result = e.exec.execute(e.action(i));
    if (!result.ok) throw new Error(`${e.name}: ${JSON.stringify(result.errors)}`);
  }
}

for (const e of EDITS) run(e, 300);

const batches = new Map<Edit, number[]>(EDITS.map((e) => [e, []]));
for (let round = 0; round < ROUNDS; round++)
  for (const e of EDITS) {
    const t0 = performance.now();
    run(e, STEPS);
    batches.get(e)!.push((performance.now() - t0) / STEPS);
  }

/**
 * How many `Time`s and `TimeRange`s one edit makes (every one is built through these four, so counting them counts
 * all), and how many placements of the state after are not the objects the state before had.
 */
function made(e: Edit): { times: number; ranges: number; placed: number } {
  const count = { times: 0, ranges: 0, placed: 0 };
  const T = Time as unknown as { ofTicks: (ticks: number) => Time };
  const R = TimeRange as unknown as Record<"of" | "clamped", (start: Time, duration: Time) => TimeRange>;
  const original = { ofTicks: T.ofTicks, of: R.of, clamped: R.clamped };
  T.ofTicks = (ticks) => {
    count.times++;
    return original.ofTicks.call(Time, ticks);
  };
  for (const name of ["of", "clamped"] as const)
    R[name] = (start, duration) => {
      count.ranges++;
      return original[name].call(TimeRange, start, duration);
    };
  try {
    for (let i = 0; i < STEPS; i++) {
      const before = e.exec.state().items;
      const result = e.exec.execute(e.action(i));
      if (!result.ok) throw new Error(`${e.name}: ${JSON.stringify(result.errors)}`);
      for (const [id, placement] of e.exec.state().items) if (before.get(id) !== placement) count.placed++;
    }
  } finally {
    T.ofTicks = original.ofTicks;
    R.of = original.of;
    R.clamped = original.clamped;
  }
  return {
    times: Math.round(count.times / STEPS),
    ranges: Math.round(count.ranges / STEPS),
    placed: Math.round(count.placed / STEPS),
  };
}

const items = EDITS[0]!.exec.state().items.size;
console.log(`${CLIPS} clips, ${items} items; ${ROUNDS} batches of ${STEPS} edits each, the kinds taking turns`);
console.log(`${cpus()[0]?.model ?? "?"}, ${cpus().length} cores, node ${process.version}\n`);
console.log(
  `${"edit".padEnd(40)} ${"fastest".padStart(9)} ${"median".padStart(9)} ${"Times".padStart(7)} ${"ranges".padStart(7)} ${"placed".padStart(7)}`,
);
for (const e of EDITS) {
  const sorted = [...batches.get(e)!].sort((a, b) => a - b);
  const fastest = sorted[0]!;
  const median = sorted[Math.floor(sorted.length / 2)]!;
  const { times, ranges, placed } = made(e);
  console.log(
    `${e.name.padEnd(40)} ${`${fastest.toFixed(3)} ms`.padStart(9)} ${`${median.toFixed(3)} ms`.padStart(9)} ${String(times).padStart(7)} ${String(ranges).padStart(7)} ${String(placed).padStart(7)}`,
  );
}

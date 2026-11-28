// The conformance suite: what every element kind must do, run for each kind that has a folder of its own from the
// sample it gives (`KitElement.sample`). A new kind is held to all of it by being listed in the kit's `KIT_ELEMENTS`:
//
// - its sample resolves and lints clean, and its placement holds what its schema parses to;
// - a key list at each of its key paths becomes keys, and writes back into the file;
// - it has a row for the tools;
// - every action it is offered runs, undoes, redoes and writes back into the file;
// - it has a reference page.
//
// The player draws each sample in `packages/player/test/conformance.test.tsx`, and the export a still of it in
// `packages/render/test/browser/conformance.test.ts`.
import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { type KeyPath, KIT_ELEMENTS, keyPathsOf, SCHEMAS_BY_KIND } from "@uberscene/kit/schema";
import { type ActionInput, affordances, foldToSource, lint, type ResolvedState, timelineRows } from "@uberscene/sdk";

import { executorFor, resolveText } from "../editing/corpus";
import { serialize } from "../helpers";
import { sampleActions } from "./params";
import { SAMPLE, SAMPLE_KINDS, sampleFile, tagOf } from "./sample";

const root = join(import.meta.dirname, "..", "..", "..", "..");
const PARAMS_FILE = "packages/sdk/test/conformance/params.ts";

const errorsOf = (state: ResolvedState): string[] =>
  [...state.errors].map((e) => `${e.code} ${e.id ?? ""} ${e.message}`).sort();

type File = ReturnType<typeof sampleFile>;

/** The effects the sample writes, in order, by type. */
const effectsOf = (state: ResolvedState): string[] =>
  [...state.items.values()]
    .filter((item) => item.parent === SAMPLE && item.kind === "effect")
    .map((item) => String(item.props.type));

/** What the editor holds, written into the file and read back, is the same timeline. */
function expectWrittenBack(file: File, exec: ReturnType<typeof executorFor>): void {
  const folded = foldToSource(file.text, exec.log(), exec.state());
  expect(folded.skipped).toEqual([]);
  const reloaded = resolveText(folded.text, file.manifest, file.files);
  expect(errorsOf(reloaded)).toEqual(errorsOf(exec.state()));
  expect(serialize(reloaded)).toEqual(serialize(exec.state()));
}

/** Two keys a path takes: the first of these values its own check accepts, and a number where it has no check. */
function keysFor(key: KeyPath): { at: number; value: unknown }[] {
  const candidates: unknown[][] = [
    [0.25, 0.75],
    [40, 80],
    ["#ff3b30", "#0a84ff"],
    [
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.5, y: 1 },
      ],
      [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 0.5, y: 0 },
      ],
    ],
  ];
  const pair = candidates.find((values) => values.every((value) => (key.check?.(value) ?? null) === null));
  if (!pair) throw new Error(`no sample value passes the check of the key path "${key.path}": add one to keysFor`);
  return [
    { at: 0, value: pair[0] },
    { at: 1, value: pair[1] },
  ];
}

describe.each(SAMPLE_KINDS.map((kind) => [kind, sampleFile(kind)] as const))("a %s", (kind, file) => {
  const start = resolveText(file.text, file.manifest, file.files);

  it("resolves and lints clean from its sample", () => {
    expect(start.errors).toEqual([]);
    expect(lint(file.text, { manifest: file.manifest })).toEqual([]);
  });

  it("is placed as its kind, with the props its schema parses to", () => {
    const placement = start.items.get(SAMPLE);
    expect(placement, `the sample must have the id "${SAMPLE}"`).toBeDefined();
    expect(placement?.kind).toBe(kind);
    expect(placement?.parsed).toBe(true);
    expect(SCHEMAS_BY_KIND[kind].safeParse(placement?.props).success).toBe(true);
    expect(KIT_ELEMENTS[kind].schema).toBe(SCHEMAS_BY_KIND[kind]);
  });

  it.each(keyPathsOf(kind).map((key) => [key.path, key] as const))("takes keys at %s", (path, key) => {
    const exec = executorFor(file);
    const before = serialize(exec.state());
    const keys = keysFor(key);
    const result = exec.execute({ type: "key/setAll", params: { id: SAMPLE, path, keys } } as ActionInput);
    expect(result.errors ?? []).toEqual([]);
    expect(exec.state().errors).toEqual([]);
    const made = [...exec.state().items.values()].filter(
      (item) => item.parent === SAMPLE && item.kind === "keyframe" && item.props.property === key.property,
    );
    expect(made.map((item) => item.props.value)).toEqual(keys.map((k) => k.value));
    expectWrittenBack(file, exec);
    expect(exec.undo()?.ok).toBe(true);
    expect(serialize(exec.state())).toEqual(before);
  });

  it("has a row for the tools", () => {
    const row = timelineRows(start).elements.find((element) => element.id === SAMPLE);
    expect(row).toMatchObject({ id: SAMPLE, kind, track: "samples", start: 0 });
    // What its placement holds from the file is in the row: a kind of words shows them.
    const text = start.items.get(SAMPLE)?.text;
    if (text !== undefined) expect(row?.text).toBe(text);
  });

  const offered = affordances(start, SAMPLE)?.actions ?? [];
  const actions = sampleActions({ kind, effects: effectsOf(start) });

  it("is offered actions", () => {
    expect(offered.length).toBeGreaterThan(0);
  });

  it.each(offered)("%s runs, undoes, redoes and writes back (or is refused, where the params say so)", (type) => {
    const sample = actions[type];
    expect(sample, `a ${kind} is offered ${type}: give it params in ${PARAMS_FILE}`).toBeDefined();
    if (!sample) return;
    const exec = executorFor(file);
    for (const edit of sample.setup ?? []) expect(exec.execute(edit).errors ?? [], `setup ${edit.type}`).toEqual([]);
    const before = serialize(exec.state());
    if (sample.refused !== undefined) {
      expect(exec.can(sample.input)).toMatchObject({ ok: false, errors: [{ code: sample.refused }] });
      expect(exec.execute(sample.input).ok).toBe(false);
      expect(serialize(exec.state())).toEqual(before);
      return;
    }
    expect(exec.can(sample.input)).toEqual({ ok: true });
    const result = exec.execute(sample.input);
    expect(result.errors ?? []).toEqual([]);
    expect(result.ok).toBe(true);
    const after = serialize(exec.state());
    expect(after).not.toEqual(before);
    expect(exec.state().errors).toEqual([]);
    expectWrittenBack(file, exec);
    expect(exec.undo()?.ok).toBe(true);
    expect(serialize(exec.state())).toEqual(before);
    expect(exec.redo()?.ok).toBe(true);
    expect(serialize(exec.state())).toEqual(after);
  });

  it("has a reference page", () => {
    const page = `docs/reference/elements/${tagOf(kind).toLowerCase()}.md`;
    expect(existsSync(join(root, page)), page).toBe(true);
  });
});

describe("the sample actions", () => {
  it("are each offered to some kind, so none is left behind when an action goes", () => {
    const left = SAMPLE_KINDS.flatMap((kind) => {
      const file = sampleFile(kind);
      const state = resolveText(file.text, file.manifest, file.files);
      const offered = new Set<string>(affordances(state, SAMPLE)?.actions ?? []);
      return Object.keys(sampleActions({ kind, effects: effectsOf(state) })).filter((type) => !offered.has(type));
    });
    // Params written for an action no kind is offered any more.
    const everywhere = [...new Set(left)].filter(
      (type) => left.filter((t) => t === type).length === SAMPLE_KINDS.length,
    );
    expect(everywhere).toEqual([]);
  });
});

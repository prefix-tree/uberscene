// What the editor's 3D viewport saves: a change to a scene file's `export const stage = { … }`. The stage is plain
// data, so a drag rewrites the one literal it changed and nothing around it: dragging the table changes the numbers in
// the table's position, keying the walker at the playhead adds one key to its list. The scene's code is never touched.
import type * as t from "@babel/types";

import type { Json } from "../patches/types";
import { parseSource } from "./parse";
import { printLiteral, printValue } from "./print";

export type StageEdit =
  /** Sets a channel to a constant (`"table.position"`), adding it, or the object, when the stage has none. */
  | { readonly kind: "set"; readonly path: string; readonly value: Json }
  /** Sets the key at `at` on a channel (a number, or a time the clip hands in), adding one when there is none. */
  | {
      readonly kind: "key";
      readonly path: string;
      readonly at: number | string;
      readonly value: Json;
      readonly easing?: string;
    }
  /** Moves the key at `at` to `to`; a key tied to a named time and moved by hand is written as the number. */
  | { readonly kind: "moveKey"; readonly path: string; readonly at: number | string; readonly to: number }
  /** Removes the key at `at`. */
  | { readonly kind: "removeKey"; readonly path: string; readonly at: number | string };

interface Change {
  readonly from: number;
  readonly to: number;
  readonly text: string;
}

/** The `stage` object literal a scene file exports. */
function stageNode(text: string): t.ObjectExpression {
  const { ast } = parseSource(text);
  for (const s of ast.program.body) {
    if (s.type !== "ExportNamedDeclaration" || s.declaration?.type !== "VariableDeclaration") continue;
    for (const d of s.declaration.declarations)
      if (d.id.type === "Identifier" && d.id.name === "stage" && d.init?.type === "ObjectExpression") return d.init;
  }
  throw new Error("the scene file has no `export const stage = { … }` to write to");
}

function keyName(p: t.ObjectProperty): string | null {
  if (p.computed) return null;
  if (p.key.type === "Identifier") return p.key.name;
  if (p.key.type === "StringLiteral") return p.key.value;
  return null;
}

function propertyOf(obj: t.ObjectExpression, name: string): t.ObjectProperty | undefined {
  return obj.properties.find((p): p is t.ObjectProperty => p.type === "ObjectProperty" && keyName(p) === name);
}

/** A literal as JSON; anything that is not a literal (a variable, a call) cannot be edited by a drag. */
function jsonOf(node: t.Node, path: string): Json {
  switch (node.type) {
    case "NumericLiteral":
    case "StringLiteral":
    case "BooleanLiteral":
      return node.value;
    case "NullLiteral":
      return null;
    case "UnaryExpression":
      if (node.operator === "-" && node.argument.type === "NumericLiteral") return -node.argument.value;
      break;
    case "ArrayExpression":
      return node.elements.map((e) => (e ? jsonOf(e, path) : null));
    case "ObjectExpression": {
      const out: Record<string, Json> = {};
      for (const p of node.properties) {
        if (p.type !== "ObjectProperty") break;
        const k = keyName(p);
        if (k === null) break;
        out[k] = jsonOf(p.value, `${path}.${k}`);
      }
      if (Object.keys(out).length === node.properties.length) return out;
      break;
    }
  }
  throw new Error(`stage.${path} is code, not a literal, so a drag cannot change it; edit the scene file`);
}

/** The scene file's stage, as data. */
export function stageOf(text: string): Record<string, Json> {
  return jsonOf(stageNode(text), "") as Record<string, Json>;
}

/** The indentation of the line `at` is on. */
function indentAt(text: string, at: number): string {
  const line = text.lastIndexOf("\n", at - 1) + 1;
  return /^[ \t]*/.exec(text.slice(line))?.[0] ?? "";
}

/** Where `at` is on its line. */
function columnAt(text: string, at: number): number {
  return at - (text.lastIndexOf("\n", at - 1) + 1);
}

/** A property written into an object literal: on a line of its own when the object is written one per line. */
function addProperty(text: string, obj: t.ObjectExpression, name: string, value: Json): Change {
  const end = (obj.end ?? 0) - 1;
  const last = obj.properties[obj.properties.length - 1];
  const multiline = text.slice(obj.start ?? 0, end).includes("\n");
  if (!last) return { from: obj.start ?? 0, to: obj.end ?? 0, text: printLiteral({ [name]: value }) };
  const after = last.end ?? 0;
  const comma = /^\s*,/.exec(text.slice(after));
  const at = comma ? after + comma[0].length : after;
  if (multiline) {
    const indent = indentAt(text, last.start ?? 0);
    const entry = `${name}: ${printValue(value, indent, indent.length + name.length + 2)},`;
    return { from: at, to: at, text: `${comma ? "" : ","}\n${indent}${entry}` };
  }
  return { from: at, to: at, text: `${comma ? "" : ","} ${name}: ${printLiteral(value)}` };
}

interface KeyNode {
  readonly node: t.ObjectExpression;
  readonly at: number | string;
}

function keyNodes(list: t.ArrayExpression): KeyNode[] | null {
  const out: KeyNode[] = [];
  for (const e of list.elements) {
    if (e?.type !== "ObjectExpression") return null;
    const at = propertyOf(e, "at");
    if (!at || !propertyOf(e, "value")) return null;
    const v = at.value;
    if (v.type === "NumericLiteral" || v.type === "StringLiteral") out.push({ node: e, at: v.value });
    else return null;
  }
  return out.length ? out : null;
}

/**
 * The text of a scene file with one change to its stage. `times` are the named times in scene seconds the clip
 * hands in, so a key tied to `reveal` is found by the time the editor's playhead shows. Throws, naming the path, when
 * the change cannot be made by writing a literal.
 */
export function editStage(text: string, edit: StageEdit, times: Readonly<Record<string, number>> = {}): string {
  const segments = edit.path.split(".");
  if (segments.length < 2) throw new Error(`a stage path names an object and a channel, as "table.position"`);
  let obj = stageNode(text);
  for (let i = 0; i < segments.length - 1; i++) {
    const p = propertyOf(obj, segments[i] as string);
    if (!p) {
      if (edit.kind !== "set") throw new Error(`stage.${segments.slice(0, i + 1).join(".")} does not exist`);
      // The rest of the path, as one new nested object.
      const rest = segments.slice(i + 1).reduceRight<Json>((v, k) => ({ [k]: v }), edit.value);
      return apply(text, addProperty(text, obj, segments[i] as string, rest));
    }
    if (p.value.type !== "ObjectExpression")
      throw new Error(`stage.${segments.slice(0, i + 1).join(".")} is not an object literal`);
    obj = p.value;
  }
  const name = segments[segments.length - 1] as string;
  const channel = propertyOf(obj, name);
  const time = (at: number | string) => (typeof at === "number" ? at : (times[at] ?? Number.NaN));
  const same = (a: number | string, b: number | string) => a === b || Math.abs(time(a) - time(b)) <= 1e-9;

  if (edit.kind === "set") {
    if (!channel) return apply(text, addProperty(text, obj, name, edit.value));
    const v = channel.value;
    if (v.type === "ArrayExpression" && keyNodes(v))
      throw new Error(`stage.${edit.path} has keys; change the one at the playhead (a "key" edit) instead`);
    const from = v.start ?? 0;
    return apply(text, {
      from,
      to: v.end ?? 0,
      text: printValue(edit.value, indentAt(text, from), columnAt(text, from)),
    });
  }

  if (!channel) {
    if (edit.kind !== "key") throw new Error(`stage.${edit.path} does not exist`);
    return apply(text, addProperty(text, obj, name, [keyJson(edit.at, edit.value, edit.easing)]));
  }
  const list = channel.value.type === "ArrayExpression" ? channel.value : null;
  const keys = list ? keyNodes(list) : null;

  if (edit.kind === "key") {
    if (!list || !keys) {
      // A constant becomes keys: what it was at 0, then the new one.
      const before = jsonOf(channel.value, edit.path);
      const next =
        time(edit.at) > 0
          ? [{ at: 0, value: before }, keyJson(edit.at, edit.value, edit.easing)]
          : [keyJson(edit.at, edit.value, edit.easing)];
      const from = channel.value.start ?? 0;
      return apply(text, {
        from,
        to: channel.value.end ?? 0,
        text: printValue(next, indentAt(text, from), columnAt(text, from)),
      });
    }
    const hit = keys.find((k) => same(k.at, edit.at));
    if (hit) {
      const changes: Change[] = [];
      const v = propertyOf(hit.node, "value")!.value;
      changes.push({ from: v.start ?? 0, to: v.end ?? 0, text: printLiteral(edit.value) });
      if (edit.easing !== undefined) {
        const e = propertyOf(hit.node, "easing");
        if (e) changes.push({ from: e.value.start ?? 0, to: e.value.end ?? 0, text: JSON.stringify(edit.easing) });
        else changes.push(addProperty(text, hit.node, "easing", edit.easing));
      }
      return applyAll(text, changes);
    }
    // A new key, in time order, written as its neighbours are.
    const index = keys.findIndex((k) => time(k.at) > time(edit.at));
    const entry = printLiteral(keyJson(edit.at, edit.value, edit.easing));
    const multiline = text.slice(list.start ?? 0, keys[0]!.node.start ?? 0).includes("\n");
    if (index === 0) {
      const at = keys[0]!.node.start ?? 0;
      const sep = multiline ? `,\n${indentAt(text, at)}` : ", ";
      return apply(text, { from: at, to: at, text: `${entry}${sep}` });
    }
    const prev = keys[index < 0 ? keys.length - 1 : index - 1]!.node;
    const after = prev.end ?? 0;
    const comma = /^\s*,/.exec(text.slice(after));
    const at = comma ? after + comma[0].length : after;
    const sep = multiline ? `\n${indentAt(text, prev.start ?? 0)}` : " ";
    // After the comma that follows the previous key: the new key, then a comma when keys or a trailing comma follow.
    const lead = comma ? "" : ",";
    const trail = index >= 0 || (comma && multiline) ? "," : "";
    return apply(text, { from: at, to: at, text: `${lead}${sep}${entry}${trail}` });
  }

  if (!keys) throw new Error(`stage.${edit.path} has no keys`);
  const hit = keys.find((k) => same(k.at, edit.at));
  if (!hit) throw new Error(`stage.${edit.path} has no key at ${edit.at}`);
  if (edit.kind === "moveKey") {
    const a = propertyOf(hit.node, "at")!.value;
    return apply(text, { from: a.start ?? 0, to: a.end ?? 0, text: printLiteral(edit.to) });
  }
  // removeKey: the key, its comma, and its line when it has one of its own.
  if (keys.length === 1) throw new Error(`stage.${edit.path} would have no keys left; set a constant instead`);
  let from = hit.node.start ?? 0;
  let to = hit.node.end ?? 0;
  const comma = /^\s*,/.exec(text.slice(to));
  if (comma) to += comma[0].length;
  else {
    const before = /,\s*$/.exec(text.slice(0, from));
    if (before) from -= before[0].length;
  }
  const lineStart = text.lastIndexOf("\n", from - 1) + 1;
  if (/^[ \t]*$/.test(text.slice(lineStart, from)) && text[to] === "\n") {
    from = lineStart;
    to += 1;
  }
  return apply(text, { from, to, text: "" });
}

function keyJson(at: number | string, value: Json, easing?: string): Json {
  return easing === undefined ? { at, value } : { at, value, easing };
}

function apply(text: string, c: Change): string {
  return text.slice(0, c.from) + c.text + text.slice(c.to);
}

function applyAll(text: string, changes: readonly Change[]): string {
  return [...changes].sort((a, b) => b.from - a.from).reduce(apply, text);
}

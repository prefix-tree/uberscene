import { describe, expect, it } from "vitest";

import { parseRef, refPattern } from "../src/jsx/ref";

describe("the reference grammar", () => {
  it("reads each form", () => {
    expect(parseRef("start", ["start", "element"])).toEqual({ type: "start" });
    expect(parseRef("hook", ["element"])).toEqual({
      type: "element",
      id: "hook",
    });
    expect(parseRef("hook.end", ["element"])).toEqual({
      type: "element",
      id: "hook",
      edge: "end",
    });
    expect(parseRef("word:14", ["moment"])).toEqual({
      type: "moment",
      unit: "word",
      index: 14,
      edge: "start",
    });
    expect(parseRef("shot:3.end", ["moment"])).toEqual({
      type: "moment",
      unit: "shot",
      index: 3,
      edge: "end",
    });
    expect(parseRef("hook@beat:16", ["moment", "element"])).toEqual({
      type: "moment",
      unit: "beat",
      index: 16,
      edge: "start",
      of: "hook",
    });
    expect(parseRef("marker:intro", ["marker"])).toEqual({
      type: "marker",
      id: "intro",
    });
    expect(parseRef("track:music", ["track"])).toEqual({
      type: "track",
      id: "music",
    });
    expect(parseRef("role:dialogue", ["role"])).toEqual({
      type: "role",
      role: "dialogue",
    });
    expect(parseRef("asset:talk.v2", ["asset"])).toEqual({
      type: "asset",
      id: "talk.v2",
    });
    expect(parseRef("tracked:talk.face", ["tracked"])).toEqual({
      type: "tracked",
      asset: "talk",
      name: "face",
    });
    expect(parseRef("logo.transform.rotation", ["prop"])).toEqual({
      type: "prop",
      id: "logo",
      path: "transform.rotation",
    });
  });

  it("reads only the forms asked for", () => {
    expect(parseRef("marker:intro", ["moment"]).type).toBe("invalid");
    expect(parseRef("hook@word:3", ["moment"]).type).toBe("invalid");
    expect(parseRef("hook.mid", ["element"], ["end"]).type).toBe("invalid");
    expect(parseRef("hook.end", ["element"], []).type).toBe("invalid");
    expect(parseRef("9lives", ["element"]).type).toBe("invalid");
  });

  it("reads an edge before a prop, and a prop where an element may not be named", () => {
    expect(parseRef("logo.end", ["element", "prop"])).toEqual({
      type: "element",
      id: "logo",
      edge: "end",
    });
    expect(parseRef("logo.end", ["prop"])).toEqual({
      type: "prop",
      id: "logo",
      path: "end",
    });
    expect(parseRef("logo.box.x", ["element", "prop"])).toEqual({
      type: "prop",
      id: "logo",
      path: "box.x",
    });
  });

  it("makes the patterns the schemas had", () => {
    const same = (made: RegExp, was: RegExp, texts: string[]): void => {
      for (const text of texts) expect([text, made.test(text)]).toEqual([text, was.test(text)]);
    };
    const texts = [
      "hook",
      "hook.end",
      "hook.mid",
      "start",
      "_a-1",
      "9x",
      "",
      "word:1",
      "word:1.end",
      "shot:02",
      "beat:x",
      "marker:a",
      "marker:9",
      "asset:a.b-c",
      "asset:",
      "a b",
      "hook@word:1",
      "silence:3.end",
      "word:1.start",
    ];
    same(refPattern(["element"], []), /^[A-Za-z_][A-Za-z0-9_-]*$/, texts);
    same(
      refPattern(["moment", "marker"]),
      /^(word|shot|silence|beat):\d+(\.end)?$|^marker:[A-Za-z_][A-Za-z0-9_-]*$/,
      texts,
    );
    same(refPattern(["moment"]), /^(word|shot|silence|beat):\d+(\.end)?$/, texts);
    same(refPattern(["element"], ["end"]), /^[A-Za-z_][A-Za-z0-9_-]*(\.end)?$/, texts);
    same(refPattern(["asset"]), /^asset:[A-Za-z0-9_.-]+$/, texts);
  });
});

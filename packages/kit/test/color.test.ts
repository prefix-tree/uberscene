import { describe, expect, it } from "vitest";

import { blendFor, curveAt, formatColor, fromOklab, mixColor, parseColor, toOklab } from "../src/schema";

describe("parseColor", () => {
  it("reads hex, rgb, hsl, names and transparent", () => {
    expect(parseColor("#f00")).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(parseColor("#ff000080")?.a).toBeCloseTo(128 / 255, 6);
    expect(parseColor("rgb(0, 255, 0)")).toEqual({ r: 0, g: 1, b: 0, a: 1 });
    expect(parseColor("rgba(0, 0, 255, 0.5)")).toEqual({ r: 0, g: 0, b: 1, a: 0.5 });
    expect(parseColor("rgb(0 0 255 / 25%)")).toEqual({ r: 0, g: 0, b: 1, a: 0.25 });
    expect(formatColor(parseColor("hsl(120, 100%, 50%)")!)).toBe("#00ff00");
    expect(formatColor(parseColor("Tomato")!)).toBe("#ff6347");
    expect(parseColor("transparent")).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("gives null for what it cannot read", () => {
    for (const s of ["$primary", "#12", "rgb(1, 2)", "linear-gradient(red, blue)", "nope"])
      expect(parseColor(s)).toBe(null);
  });
});

describe("OKLab", () => {
  it("round-trips sRGB", () => {
    for (const hex of ["#000000", "#ffffff", "#ff3b30", "#0d2cf5", "#7fff00"])
      expect(formatColor(fromOklab(toOklab(parseColor(hex)!)))).toBe(hex);
  });

  it("puts white at lightness 1 and black at 0", () => {
    expect(toOklab(parseColor("#fff")!).l).toBeCloseTo(1, 4);
    expect(toOklab(parseColor("#000")!).l).toBeCloseTo(0, 6);
  });
});

describe("mixColor", () => {
  it("gives the ends at 0 and 1", () => {
    expect(mixColor("#ff0000", "#0000ff", 0)).toBe("#ff0000");
    expect(mixColor("#ff0000", "#0000ff", 1)).toBe("#0000ff");
  });

  it("passes red to blue through a clear purple, brighter than the sRGB mid-point", () => {
    const mid = mixColor("#ff0000", "#0000ff", 0.5)!;
    expect(mid).toBe("#8c53a2");
    expect(toOklab(parseColor(mid)!).l).toBeGreaterThan(toOklab(parseColor("#800080")!).l);
  });

  it("fades to transparent keeping its hue, not through black", () => {
    const half = parseColor(mixColor("#ff0000", "transparent", 0.5)!)!;
    expect(half.a).toBeCloseTo(0.5, 3);
    expect(half.r).toBeCloseTo(1, 2);
    expect(half.g + half.b).toBeLessThan(0.01);
  });

  it("is null when either end cannot be read", () => {
    expect(mixColor("$primary", "#fff", 0.5)).toBe(null);
  });
});

describe("curveAt with a blend", () => {
  const keys = (a: unknown, b: unknown) => [
    { at: 0, value: a },
    { at: 2, value: b },
  ];

  it("moves colours as colours, and steps one it cannot read", () => {
    expect(curveAt(keys("#ff0000", "#0000ff"), 1, undefined, "color")).toBe("#8c53a2");
    expect(curveAt(keys("$nope", "#0000ff"), 1, undefined, "color")).toBe("$nope");
    // As numbers, two strings step: the default is unchanged.
    expect(curveAt(keys("#ff0000", "#0000ff"), 1)).toBe("#ff0000");
  });

  it("moves points of one count point by point, and steps when the counts differ", () => {
    const a = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const b = [
      { x: 2, y: 0 },
      { x: 1, y: 3 },
    ];
    expect(curveAt(keys(a, b), 1, undefined, "points")).toEqual([
      { x: 1, y: 0 },
      { x: 1, y: 2 },
    ]);
    expect(curveAt(keys(a, [{ x: 5, y: 5 }]), 1, undefined, "points")).toBe(a);
  });

  it("is chosen by property", () => {
    expect(blendFor("shape.fill")).toBe("color");
    expect(blendFor("shape.stroke.color")).toBe("color");
    expect(blendFor("shape.points")).toBe("points");
    expect(blendFor("shape.width")).toBe("number");
    expect(blendFor(undefined)).toBe("number");
  });
});

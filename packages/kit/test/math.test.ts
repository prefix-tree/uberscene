import { describe, expect, it } from "vitest";

import { clamp01, round3 } from "../src/schema";

describe("number helpers", () => {
  it("clamp01 holds a value to 0..1", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(7)).toBe(1);
  });

  it("round3 keeps three decimals and writes -0 as 0", () => {
    expect(round3(1.23456)).toBe(1.235);
    expect(Object.is(round3(-0.0001), 0)).toBe(true);
  });
});

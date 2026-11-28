// A blend mode as the canvas names it.
import type { BlendMode } from "@uberscene/kit/schema";

const BLEND_TO_CANVAS: Readonly<Record<BlendMode, GlobalCompositeOperation>> = {
  normal: "source-over",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  darken: "darken",
  lighten: "lighten",
  colorDodge: "color-dodge",
  colorBurn: "color-burn",
  hardLight: "hard-light",
  softLight: "soft-light",
  difference: "difference",
  exclusion: "exclusion",
  hue: "hue",
  saturation: "saturation",
  color: "color",
  luminosity: "luminosity",
  add: "lighter",
  linearDodge: "lighter",
};

export function blendOf(value: unknown): GlobalCompositeOperation {
  return BLEND_TO_CANVAS[value as BlendMode] ?? "source-over";
}

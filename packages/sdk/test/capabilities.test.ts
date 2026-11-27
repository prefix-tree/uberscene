import { describe, expect, it } from "vitest";

import {
  capabilitiesOf,
  isDomOverlay,
  isSequenceItem,
  KIND_CAPABILITIES,
  kindsWhere,
  kindsWithProp,
  MAIN_TRACK_KINDS,
  MASKED_KINDS,
  onOverlayPlane,
  STYLED_KINDS,
} from "@uberscene/kit/schema";

/** A list as a set: the lists these replace were only ever asked "is this kind in it". */
const set = (kinds: readonly string[]) => [...kinds].sort();
const kinds = Object.keys(KIND_CAPABILITIES);

// Each list the packages kept of their own, written out once as it stood, against what the kind table now answers.
describe("the kind table answers what the packages' own lists did", () => {
  it.each([
    ["sdk clip-props SOURCE_KINDS", kindsWhere((k) => k.trimSource), ["clip", "audio", "nested"]],
    [
      "sdk clip-props TRANSFORM_KINDS",
      kindsWhere((k) => k.transformable),
      ["clip", "title", "shape", "svg", "sticker", "nested", "layer"],
    ],
    ["sdk clip-props AUDIO_KINDS", kindsWhere((k) => k.audio), ["clip", "audio", "nested"]],
    ["sdk clip/setFit", kindsWhere((k) => k.plane === "canvas"), ["clip", "nested"]],
    [
      "sdk overlay ELEMENT_KINDS, editor UPDATABLE",
      kindsWhere((k) => k.elementActions),
      ["title", "shape", "svg", "sticker", "adjustment", "nested", "layer"],
    ],
    [
      "sdk sync SEEN",
      kindsWhere((k) => k.timed && (k.plane === "canvas" || k.plane === "dom")),
      ["clip", "title", "shape", "svg", "sticker", "layer", "nested"],
    ],
    ["sdk plays, moments, captions, lint: clip or audio", kindsWhere((k) => k.playsAsset), ["clip", "audio"]],
    ["kit MAIN_TRACK_KINDS", MAIN_TRACK_KINDS, ["clip", "transition", "gap"]],
    ["kit MASKED_KINDS", MASKED_KINDS, ["clip", "nested"]],
    ["kit theme MOTION_KINDS", kindsWhere((k) => k.themeMotion), ["title", "shape", "svg", "sticker"]],
    ["kit theme LOOK_KINDS", kindsWhere((k) => k.themeStyle === "look"), ["title", "captions"]],
    ["kit STYLED_KINDS", kindsWhere((k) => k.themeStyle !== "none"), [...STYLED_KINDS]],
    ["player FOOTAGE_KINDS", kindsWhere((k) => k.footage), ["clip", "nested", "multicam"]],
    ["render FREE", kindsWhere((k) => k.freeCode), ["layer", "nested", "multicam"]],
    ["render WHOLE", kindsWhere((k) => k.spansVideo), ["composition", "track", "captions"]],
    ["render read-check, inspect, editor Text group", kindsWhere((k) => k.hasText), ["title"]],
  ])("%s", (_name, asked, was) => {
    expect(set(asked)).toEqual(set(was));
  });

  // Six lists of "the overlays" stood in six files, in two meanings and with stray entries. Two named answers now.
  it("has one answer to which kinds are DOM overlays, and one to which stand on the overlay plane", () => {
    const dom = ["title", "shape", "svg", "sticker", "layer"];
    // kit rendering.ts OVERLAY_KINDS, sdk follow FOLLOW_KINDS
    expect(set(kinds.filter(isDomOverlay))).toEqual(set(dom));
    // player backdrop.ts OVERLAY_KINDS, sdk inspect/moments.ts OVERLAYS
    expect(set(kinds.filter(onOverlayPlane))).toEqual(set([...dom, "adjustment"]));
    // render look.ts DOM_OVERLAYS and web/page/main.tsx MEASURED: drawn as DOM alone, the captions with them
    expect(set(kindsWhere((k) => k.plane === "dom"))).toEqual(set([...dom, "captions"]));
  });

  it("tells a transition and a gap from what a cut can name", () => {
    expect(kinds.filter((k) => !isSequenceItem(k))).toEqual(["gap", "transition"]);
    // A caption cue is timed and no filler, so `clip/split` is offered on it as before.
    expect(capabilitiesOf("caption").timed && isSequenceItem("caption")).toBe(true);
  });
});

describe("traits the schema already shows are read from it", () => {
  it.each([
    ["blend", ["clip", "title", "shape", "svg", "sticker", "nested", "layer", "adjustment"]],
    ["blendOpacity", ["clip", "nested"]],
    ["follow", ["title", "shape", "svg", "sticker", "layer"]],
    ["freezes", ["clip", "audio"]],
  ])("the kinds with a %s prop", (prop, was) => {
    expect(set(kindsWithProp(prop))).toEqual(set(was));
  });

  it("agrees with the table where both say it", () => {
    expect(set(kindsWithProp("transform"))).toEqual(set(kindsWhere((k) => k.transformable)));
    expect(set(kindsWithProp("volume"))).toEqual(set(kindsWhere((k) => k.audio)));
  });
});

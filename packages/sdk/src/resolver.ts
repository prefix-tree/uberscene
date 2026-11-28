// The resolver and the asset manifest, without the parser, the actions or the lint: what a player needs to place a
// file's elements in time and find their media. It loads none of Babel or Sucrase, so a browser app that plays files
// but never edits them stays small, and a dev server needs no Node globals.

export { isCaptions, isCue, makesOnTrack } from "./elements";
export * from "./elements/captions/cues";
export * from "./elements/captions/subtitles";
export { isSceneAsset, type SceneUse } from "./elements/clip/scene";
export * from "./elements/placement";
export * from "./manifest/cube";
export * from "./manifest/timeref";
export * from "./manifest/transcript";
export * from "./manifest/types";
export * from "./patches/types";
export * from "./resolve/collect";
export * from "./resolve/dependents";
export * from "./resolve/errors";
export * from "./resolve/follow";
export * from "./resolve/refs";
export * from "./resolve/resolve";
export * from "./resolve/scene";
export * from "./resolve/speed";
export * from "./resolve/tree";
export {
  endSeconds,
  endTicks,
  lengthSeconds,
  lengthTicks,
  secondsSinceStart,
  startSeconds,
  startTicks,
} from "./time";

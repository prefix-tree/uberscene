// The props many kinds share, each as a named type: what code that works on any placed thing, any overlay, anything
// timed takes, in place of a cast. Each is taken from a kind that has the whole group, by the group's prop names, so a
// declaration file names these and does not print the group's schema again. `test/kinds.test.ts` holds the names
// here to the groups in `jsx/schemas/common.ts`.
import type { z } from "zod";

import type { audioSchema } from "./audio/schema";
import type { clipSchema } from "./clip/schema";
import type { layerSchema } from "./layer/schema";
import type { titleSchema } from "./title/schema";

type Title = z.output<typeof titleSchema>;
type Clip = z.output<typeof clipSchema>;

/** When it starts and how long it lasts: everything written on a track (`timedProps`). */
export interface TimedProps extends Pick<Title, "id" | "start" | "anchor" | "at" | "offset" | "duration"> {}
/** Where it sits and how it is turned: its `box` and its `transform`. */
export interface PlacedProps extends Pick<Title, "box" | "transform"> {}
/** What everything drawn over the picture takes: placed, followed, blended, with effects (`overlayProps`). */
export interface OverlayProps extends Pick<Title, "box" | "transform" | "follow" | "blend" | "effects"> {}
/** Footage and nested sequences: placed, fitted to the frame, blended, with effects (`visualProps`). */
export interface VisualProps extends Pick<Clip, "box" | "transform" | "fit" | "blend" | "effects" | "blendOpacity"> {}
/** How a picture with a size of its own fills the frame (`fitProp`). */
export interface FitProps extends Pick<Clip, "fit"> {}
/** How it comes in and goes out (`entranceProps`). */
export interface EntranceProps extends Pick<z.output<typeof layerSchema>, "enter" | "exit"> {}
/** Its level, its place between the speakers, its fades and what it ducks under (`audioProps`). */
export interface SoundProps extends Pick<z.output<typeof audioSchema>, "volume" | "pan" | "fade" | "duck"> {}

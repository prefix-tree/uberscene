// The props many kinds share, each as a named type: what code that works on any placed thing, any overlay, anything
// timed takes, in place of a cast. Named interfaces, so a declaration file refers to them by name.
import type { z } from "zod";

import type {
  audioProps,
  entranceProps,
  fitProp,
  overlayProps,
  timedProps,
  transformProp,
  visualProps,
} from "../jsx/schemas/common";

type Parsed<Shape extends z.ZodRawShape> = z.output<z.ZodObject<Shape>>;

/** When it starts and how long it lasts: everything written on a track. */
export interface TimedProps extends Parsed<typeof timedProps> {}
/** Where it sits and how it is turned: its `box` and its `transform`. */
export interface PlacedProps extends Parsed<typeof transformProp> {}
/** What everything drawn over the picture takes: placed, followed, blended, with effects. */
export interface OverlayProps extends Parsed<typeof overlayProps> {}
/** Footage and nested sequences: placed, fitted to the frame, blended, with effects. */
export interface VisualProps extends Parsed<typeof visualProps> {}
/** How a picture with a size of its own fills the frame. */
export interface FitProps extends Parsed<typeof fitProp> {}
/** How it comes in and goes out. */
export interface EntranceProps extends Parsed<typeof entranceProps> {}
/** Its level, its place between the speakers, its fades and what it ducks under. */
export interface SoundProps extends Parsed<typeof audioProps> {}

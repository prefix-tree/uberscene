import type { Box } from "../../jsx/box";
import type { ShapeProps } from "../index";

/** A shape's width and height when the file writes none, in pixels. */
export const SHAPE_SIZE = 200;

/**
 * The size a shape draws at before its box places it: its `width` and `height`, `SHAPE_SIZE` each when left out. The
 * one place it is said: the player draws it at this size, and a camera's push makes room for it at this size.
 */
export function shapeSize(props: Pick<ShapeProps, "width" | "height">): Box {
  return { width: Math.max(0, props.width ?? SHAPE_SIZE), height: Math.max(0, props.height ?? SHAPE_SIZE) };
}

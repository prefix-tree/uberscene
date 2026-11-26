import type { ComponentProps } from "react";

import { Camera, Clip, Composition, Shape, Title, Track } from "@uberscene/kit";

/**
 * A camera that makes room. A subject sits in the middle. Each card is written where it belongs beside it, partly or
 * wholly outside the frame, and the camera's `push` does the rest: as a card starts, the view moves as little as it
 * can to hold it with everything already on screen, panning first and pulling back only when it must. Move a card
 * and the camera's move follows. Nothing is keyed to keep it alive either: the cards bob on a `wiggle`, and the
 * view closes in on a `drift`. The mark in the corner is on a track outside the camera, so it stays where it is.
 */
const BLUE = "#3447ff";
const INK = "#1b2bd6";
const PAPER = "#ffffff";

/** A card is never quite still: its frame, picture and label bob together, on one seed, a few pixels up and down. */
const bob = (y: number, seed: number) => ({ type: "wiggle", base: y, amount: 9, frequency: 0.45, seed }) as const;

/** A picture comes in as its card does: up from four fifths of its size while it fades in. */
const POP = {
  opacity: [
    { at: 0, value: 0, easing: "easeOut" },
    { at: 0.2, value: 1 },
  ],
  scale: [
    { at: 0, value: 0.8, easing: "snappy" },
    { at: 0.3, value: 1 },
  ],
  borderRadius: 14,
} satisfies ComponentProps<typeof Clip>["transform"];

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080} background={{ type: "color", color: BLUE }}>
      {/* On top of the push, the view closes in a little all the way through, so the frame never rests. */}
      <Camera id="cam" push={{ on: ["frame-a", "frame-b", "frame-c"] }} zoom={{ type: "drift", base: 1, speed: 0.006 }}>
        <Track id="subject" layout="free">
          <Clip
            id="pour"
            src="asset:espresso"
            start={0}
            in={6}
            duration={6}
            volume={0}
            fit="cover"
            box={{ x: 960, y: 560, width: 760, height: 428, origin: "center" }}
            transform={{ borderRadius: 28 }}
          />
        </Track>
        <Track id="frames" layout="free">
          <Shape
            id="frame-a"
            type="rectangle"
            start={1}
            duration={5}
            width={340}
            height={420}
            cornerRadius={22}
            fill={PAPER}
            box={{ x: 70, y: bob(560, 1), origin: "center" }}
            enter={{ type: "pop", duration: 0.3 }}
          />
          <Shape
            id="frame-b"
            type="rectangle"
            start={2.2}
            duration={3.8}
            width={340}
            height={420}
            cornerRadius={22}
            fill={PAPER}
            box={{ x: 1900, y: bob(560, 2), origin: "center" }}
            enter={{ type: "pop", duration: 0.3 }}
          />
          <Shape
            id="frame-c"
            type="rectangle"
            start={3.4}
            duration={2.6}
            width={340}
            height={420}
            cornerRadius={22}
            fill={PAPER}
            box={{ x: -360, y: bob(560, 3), origin: "center" }}
            enter={{ type: "pop", duration: 0.3 }}
          />
        </Track>
        <Track id="pictures" layout="free">
          <Clip
            id="picture-a"
            src="asset:coffeeWide"
            start={1}
            in={10}
            duration={5}
            volume={0}
            fit="cover"
            box={{ x: 70, y: bob(530, 1), width: 296, height: 296, origin: "center" }}
            transform={POP}
          />
          <Clip
            id="picture-b"
            src="asset:coffee"
            start={2.2}
            in={4}
            duration={3.8}
            volume={0}
            fit="cover"
            box={{ x: 1900, y: bob(530, 2), width: 296, height: 296, origin: "center" }}
            transform={POP}
          />
          <Clip
            id="picture-c"
            src="asset:redCup"
            start={3.4}
            in={20}
            duration={2.6}
            volume={0}
            fit="cover"
            box={{ x: -360, y: bob(530, 3), width: 296, height: 296, origin: "center" }}
            transform={POP}
          />
        </Track>
        <Track id="labels" layout="free">
          <Title
            id="label-a"
            start={1}
            duration={5}
            box={{ x: 70, y: bob(724, 1), origin: "center" }}
            style={{ size: 30, weight: 800, color: INK, letterSpacing: 2 }}
            enter={{ type: "pop", duration: 0.3 }}
          >
            POUR OVER
          </Title>
          <Title
            id="label-b"
            start={2.2}
            duration={3.8}
            box={{ x: 1900, y: bob(724, 2), origin: "center" }}
            style={{ size: 30, weight: 800, color: INK, letterSpacing: 2 }}
            enter={{ type: "pop", duration: 0.3 }}
          >
            ESPRESSO
          </Title>
          <Title
            id="label-c"
            start={3.4}
            duration={2.6}
            box={{ x: -360, y: bob(724, 3), origin: "center" }}
            style={{ size: 30, weight: 800, color: INK, letterSpacing: 2 }}
            enter={{ type: "pop", duration: 0.3 }}
          >
            TO GO
          </Title>
        </Track>
      </Camera>
      {/* Outside the camera: fixed to the screen while everything under it moves. */}
      <Track id="brand" layout="free">
        <Title
          id="mark"
          start={0}
          duration={6}
          box={{ x: 960, y: 84, origin: "center" }}
          style={{ size: 34, weight: 700, color: PAPER }}
        >
          uberscene
        </Title>
      </Track>
    </Composition>
  );
}

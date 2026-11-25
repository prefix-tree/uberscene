import type { ComponentProps } from "react";

import { Camera, Clip, Composition, Shape, Title, Track } from "@uberscene/kit";

/**
 * A camera over the tracks that should move together. A subject sits in the middle; each card that comes in pushes
 * the whole frame aside to make room, and the last one is written off the frame's left edge, so the camera pulls
 * back and across until all three are in view. The mark in the corner is on a track outside the camera, so it stays where it is.
 * Nothing on the cards or the subject is keyed for these moves: the camera's `x` and `zoom` are.
 */
const BLUE = "#3447ff";
const INK = "#1b2bd6";
const PAPER = "#ffffff";

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
      <Camera
        id="cam"
        x={[
          { at: 1, value: 0, easing: "snappy" },
          { at: 1.3, value: -90 },
          { at: 2.2, value: -90, easing: "snappy" },
          { at: 2.5, value: 0 },
          { at: 3.4, value: 0, easing: "snappy" },
          { at: 3.8, value: -250 },
        ]}
        zoom={[
          { at: 0, value: 1 },
          { at: 1, value: 1.03, easing: "snappy" },
          { at: 1.3, value: 1 },
          { at: 2.2, value: 1.02, easing: "snappy" },
          { at: 2.5, value: 0.94 },
          { at: 3.4, value: 0.96, easing: "snappy" },
          { at: 3.8, value: 0.82 },
          { at: 6, value: 0.84 },
        ]}
      >
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
            box={{ x: 250, y: 560, origin: "center" }}
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
            box={{ x: 1670, y: 560, origin: "center" }}
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
            box={{ x: -250, y: 560, origin: "center" }}
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
            box={{ x: 250, y: 530, width: 296, height: 296, origin: "center" }}
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
            box={{ x: 1670, y: 530, width: 296, height: 296, origin: "center" }}
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
            box={{ x: -250, y: 530, width: 296, height: 296, origin: "center" }}
            transform={POP}
          />
        </Track>
        <Track id="labels" layout="free">
          <Title
            id="label-a"
            start={1}
            duration={5}
            box={{ x: 250, y: 724, origin: "center" }}
            style={{ size: 30, weight: 800, color: INK, letterSpacing: 2 }}
            enter={{ type: "pop", duration: 0.3 }}
          >
            POUR OVER
          </Title>
          <Title
            id="label-b"
            start={2.2}
            duration={3.8}
            box={{ x: 1670, y: 724, origin: "center" }}
            style={{ size: 30, weight: 800, color: INK, letterSpacing: 2 }}
            enter={{ type: "pop", duration: 0.3 }}
          >
            ESPRESSO
          </Title>
          <Title
            id="label-c"
            start={3.4}
            duration={2.6}
            box={{ x: -250, y: 724, origin: "center" }}
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

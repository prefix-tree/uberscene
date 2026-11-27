import { Composition, Shape, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} background={{ type: "color", color: "#101418" }}>
      <Track id="cards" layout="free">
        {/* A wiggle: a small wobble added to the rotation and the height it sits at, never quite the same twice. */}
        <Shape
          id="wobble"
          type="rectangle"
          start={0}
          duration={5}
          width={200}
          height={130}
          cornerRadius={14}
          fill="#e8a33d"
          box={{ x: 200, y: { type: "wiggle", base: 240, amount: 14, frequency: 0.5 }, origin: "center" }}
          transform={{ rotation: { type: "wiggle", amount: 5, frequency: 0.6 } }}
        />
        {/* A drift: a steady change added to the scale, so it grows a little all the way through. */}
        <Shape
          id="grow"
          type="rectangle"
          start={0}
          duration={5}
          width={200}
          height={130}
          cornerRadius={14}
          fill="#5bc0be"
          box={{ x: 480, y: 240, origin: "center" }}
          transform={{ scale: { type: "drift", base: 0.8, speed: 0.06 } }}
        />
        {/* A loop: two keys played back and forth for as long as the element lasts. */}
        <Shape
          id="pulse"
          type="rectangle"
          start={0}
          duration={5}
          width={200}
          height={130}
          cornerRadius={14}
          fill="#f25f5c"
          box={{ x: 760, y: 240, origin: "center" }}
          transform={{
            opacity: {
              type: "loop",
              mode: "pingpong",
              keys: [
                { at: 0, value: 1, easing: "easeInOut" },
                { at: 0.6, value: 0.25 },
              ],
            },
          }}
        />
      </Track>
      <Track id="labels" layout="free">
        <Title id="l1" start={0} duration={5} box={{ x: 200, y: 400, origin: "center" }} style={{ size: 24 }}>
          wiggle
        </Title>
        <Title id="l2" start={0} duration={5} box={{ x: 480, y: 400, origin: "center" }} style={{ size: 24 }}>
          drift
        </Title>
        <Title id="l3" start={0} duration={5} box={{ x: 760, y: 400, origin: "center" }} style={{ size: 24 }}>
          loop
        </Title>
      </Track>
    </Composition>
  );
}

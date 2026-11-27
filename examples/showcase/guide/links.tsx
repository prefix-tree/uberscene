import { Composition, Shape, Title, Track } from "@uberscene/kit";

const LABEL = { size: 22, color: "#9aa4b1", align: "center" } as const;

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} background={{ type: "color", color: "#101418" }}>
      <Track id="hands" layout="free">
        {/* The one that is keyed: a hand that swings back and forth. */}
        <Shape
          id="dial"
          type="rectangle"
          start={0}
          duration={6}
          width={28}
          height={150}
          cornerRadius={14}
          fill="#e8a33d"
          box={{ x: 200, y: 250, origin: "bottom" }}
          transform={{
            anchor: { x: 0.5, y: 0.92 },
            rotation: {
              type: "loop",
              mode: "pingpong",
              keys: [
                { at: 0, value: -60 },
                { at: 1.5, value: 60, easing: "easeInOut" },
              ],
            },
          }}
        />
        {/* Twice the dial's turn, the other way. */}
        <Shape
          id="gear"
          type="rectangle"
          start={0}
          duration={6}
          width={28}
          height={150}
          cornerRadius={14}
          fill="#5bc0be"
          box={{ x: 480, y: 250, origin: "bottom" }}
          transform={{ anchor: { x: 0.5, y: 0.92 }, rotation: { link: "dial.transform.rotation", scale: -2 } }}
        />
        {/* The dial's turn, 0.4 s late. */}
        <Shape
          id="late"
          type="rectangle"
          start={0}
          duration={6}
          width={28}
          height={150}
          cornerRadius={14}
          fill="#ffffff"
          box={{ x: 760, y: 250, origin: "bottom" }}
          transform={{ anchor: { x: 0.5, y: 0.92 }, rotation: { link: "dial.transform.rotation", delay: 0.4 } }}
        />
        {/* A link reads any number: the bar's width is the dial's angle, three pixels a degree, about 300 px. */}
        <Shape
          id="meter"
          type="rectangle"
          start={0}
          duration={6}
          width={{ link: "dial.transform.rotation", scale: 3, offset: 300 }}
          height={18}
          cornerRadius={9}
          fill="#e8a33d"
          box={{ x: 180, y: 440, origin: "left" }}
        />
      </Track>
      <Track id="labels" layout="free">
        <Title
          id="l1"
          start={0}
          duration={6}
          box={{ x: 200, y: 290, width: 240, height: 34, origin: "top" }}
          style={LABEL}
        >
          keyed
        </Title>
        <Title
          id="l2"
          start={0}
          duration={6}
          box={{ x: 480, y: 290, width: 240, height: 34, origin: "top" }}
          style={LABEL}
        >
          scale: -2
        </Title>
        <Title
          id="l3"
          start={0}
          duration={6}
          box={{ x: 760, y: 290, width: 240, height: 34, origin: "top" }}
          style={LABEL}
        >
          delay: 0.4
        </Title>
        <Title
          id="l4"
          start={0}
          duration={6}
          box={{ x: 180, y: 486, width: 420, height: 34, origin: "left" }}
          style={{ ...LABEL, align: "left" }}
        >
          width, linked to the angle
        </Title>
      </Track>
    </Composition>
  );
}

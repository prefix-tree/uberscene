import { Composition, Shape, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} background={{ type: "color", color: "#101418" }}>
      <Track id="shapes" layout="free">
        {/* Size and colour: the dot grows and turns from orange to violet, moved in OKLab, then back. */}
        <Shape
          id="dot"
          type="circle"
          start={0}
          duration={4}
          width={[
            { at: 0, value: 60, easing: "easeInOut" },
            { at: 1.6, value: 180, easing: "easeInOut" },
            { at: 3.2, value: 60 },
          ]}
          height={[
            { at: 0, value: 60, easing: "easeInOut" },
            { at: 1.6, value: 180, easing: "easeInOut" },
            { at: 3.2, value: 60 },
          ]}
          fill={[
            { at: 0, value: "#e8a33d", easing: "easeInOut" },
            { at: 1.6, value: "#7b5cff", easing: "easeInOut" },
            { at: 3.2, value: "#e8a33d" },
          ]}
          box={{ x: 200, y: 240, origin: "center" }}
        />
        {/* A line that draws on: its dash offset runs from the dash's length to 0, and its stroke thickens. */}
        <Shape
          id="line"
          type="path"
          start={0}
          duration={4}
          width={220}
          height={180}
          fill={{ type: "none" }}
          points={[
            { x: 0, y: 1 },
            { x: 0.3, y: 0.2 },
            { x: 0.6, y: 0.7 },
            { x: 1, y: 0 },
          ]}
          stroke={{
            color: "#5bc0be",
            thickness: [
              { at: 0, value: 3 },
              { at: 2, value: 10 },
            ],
            lineCap: "round",
            lineJoin: "round",
            dashArray: [700],
            dashOffset: [
              { at: 0, value: 700, easing: "easeInOut" },
              { at: 2, value: 0 },
            ],
          }}
          box={{ x: 480, y: 240, origin: "center" }}
        />
        {/* A morph: two lists of five points, moved point by point, from a star-like shape to a house. */}
        <Shape
          id="morph"
          type="polygon"
          start={0}
          duration={4}
          width={180}
          height={180}
          fill={[
            { at: 0.6, value: "#f25f5c", easing: "easeInOut" },
            { at: 2.6, value: "#ffd166" },
          ]}
          points={[
            {
              at: 0.6,
              easing: "easeInOut",
              value: [
                { x: 0.5, y: 0 },
                { x: 1, y: 0.4 },
                { x: 0.8, y: 1 },
                { x: 0.2, y: 1 },
                { x: 0, y: 0.4 },
              ],
            },
            {
              at: 2.6,
              value: [
                { x: 0.5, y: 0.05 },
                { x: 1, y: 0.45 },
                { x: 1, y: 1 },
                { x: 0, y: 1 },
                { x: 0, y: 0.45 },
              ],
            },
          ]}
          box={{ x: 760, y: 240, origin: "center" }}
        />
      </Track>
      <Track id="labels" layout="free">
        <Title id="l1" start={0} duration={4} box={{ x: 200, y: 420, origin: "center" }} style={{ size: 24 }}>
          size and colour
        </Title>
        <Title id="l2" start={0} duration={4} box={{ x: 480, y: 420, origin: "center" }} style={{ size: 24 }}>
          draw on
        </Title>
        <Title id="l3" start={0} duration={4} box={{ x: 760, y: 420, origin: "center" }} style={{ size: 24 }}>
          morph
        </Title>
      </Track>
    </Composition>
  );
}

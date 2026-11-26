import { Composition, Shape, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} background={{ type: "color", color: "#101418" }}>
      <Track id="rig" layout="free">
        {/* The upper arm hangs from its shoulder (the anchor at its top) and swings. */}
        <Shape
          id="arm"
          type="rectangle"
          start={0}
          duration={4}
          width={36}
          height={170}
          cornerRadius={18}
          fill="#e8a33d"
          box={{ x: 480, y: 110, origin: "top" }}
          transform={{
            anchor: { x: 0.5, y: 0.05 },
            rotation: {
              type: "loop",
              mode: "pingpong",
              keys: [
                { at: 0, value: -35 },
                { at: 1.4, value: 35, easing: "easeInOut" },
              ],
            },
          }}
        />
        {/* The forearm's box is read in the arm's box: its elbow sits at the arm's lower end, and it bends there. */}
        <Shape
          id="forearm"
          parent="arm"
          type="rectangle"
          start={0}
          duration={4}
          width={30}
          height={150}
          cornerRadius={15}
          fill="#5bc0be"
          box={{ x: 18, y: 152, origin: "top" }}
          transform={{
            anchor: { x: 0.5, y: 0.05 },
            rotation: {
              type: "loop",
              mode: "pingpong",
              keys: [
                { at: 0, value: 10 },
                { at: 0.7, value: 70, easing: "easeInOut" },
              ],
            },
          }}
        />
        {/* The hand moves with the forearm, so with the arm too: two parents up. */}
        <Shape
          id="hand"
          parent="forearm"
          type="ellipse"
          start={0}
          duration={4}
          width={56}
          height={56}
          fill="#ffffff"
          box={{ x: 15, y: 150, origin: "center" }}
        />
        {/* A label rides on the hand, and fades on its own: a parent's opacity is not handed down. */}
        <Title
          id="tag"
          parent="hand"
          start={1}
          duration={3}
          box={{ x: 64, y: 28, width: 120, height: 40, origin: "left" }}
          style={{ size: 24, color: "#ffffff", align: "left" }}
          enter={{ type: "fade", duration: 0.4 }}
        >
          hello
        </Title>
      </Track>
    </Composition>
  );
}

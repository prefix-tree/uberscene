import { Clip, Composition, Shape, Track } from "@uberscene/kit";

// A split compare: one shot before and after, with a divider that sweeps across to show both.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip id="before" src="asset:redCup" in={18} out={21} fit="cover" />
      <Track id="after" layout="free">
        <Clip
          id="green"
          src="asset:redCup"
          start={0}
          in={18}
          out={21}
          fit="cover"
          effects={[{ type: "recolor", from: "#c3292a", to: "#2f9e4f" }]}
          transform={{
            crop: {
              width: [
                { at: 0.3, value: 0.15, easing: "easeInOutSine" },
                { at: 1.6, value: 0.85, easing: "easeInOutSine" },
                { at: 2.8, value: 0.5 },
              ],
            },
          }}
        />
        <Shape
          id="divider"
          type="rectangle"
          start={0}
          duration={3}
          width={4}
          height={360}
          fill={PAPER}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0.3, value: 96, easing: "easeInOutSine" },
              { at: 1.6, value: 544, easing: "easeInOutSine" },
              { at: 2.8, value: 320 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}

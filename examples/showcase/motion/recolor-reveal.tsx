import { Clip, Composition } from "@uberscene/kit";

// A recolour reveal: one colour turns into another while you watch, for a before and after.
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
      <Clip
        id="shot"
        src="asset:redCup"
        in={18}
        out={21}
        fit="cover"
        effects={[
          {
            type: "recolor",
            from: "#c3292a",
            to: "#2f9e4f",
            amount: [
              { at: 1, value: 0, easing: "easeInOutCubic" },
              { at: 1.6, value: 1 },
            ],
          },
        ]}
      />
    </Composition>
  );
}

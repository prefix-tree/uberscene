import { Clip, Composition } from "@uberscene/kit";

// A speed ramp: the shot slows into a moment and speeds out of it, to dwell without a freeze.
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
        out={20.4}
        fit="cover"
        speed={[
          { at: 0, value: 1, easing: "easeInOutQuad" },
          { at: 0.7, value: 0.3 },
          { at: 1.5, value: 0.3, easing: "easeInOutQuad" },
          { at: 2.1, value: 1 },
        ]}
      />
    </Composition>
  );
}

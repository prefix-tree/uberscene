import { Clip, Composition, Transition } from "@uberscene/kit";

// A whip pan: one shot is pushed out fast by the next, sideways, as a quick change of place.
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
      <Clip id="a" src="asset:redCup" in={18} out={19.6} fit="cover" />
      <Transition id="whip" type="push" duration={0.3} params={{ direction: "left" }} />
      <Clip id="b" src="asset:redCup" in={32} out={33.7} fit="cover" />
    </Composition>
  );
}

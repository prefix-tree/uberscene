import { Clip, Composition, Transition } from "@uberscene/kit";

// A dip to black: the picture goes dark and comes back on the next shot, for time passing.
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
      <Clip id="a" src="asset:redCup" in={18} out={19.8} fit="cover" />
      <Transition id="night" type="dipToBlack" duration={0.8} />
      <Clip id="b" src="asset:redCup" in={32} out={33.8} fit="cover" />
    </Composition>
  );
}

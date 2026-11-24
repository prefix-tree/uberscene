import { Composition, Counter, Track } from "@uberscene/kit";

// A counter: a number that counts up to its value and holds, for a result.
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
      <Track id="text" layout="free">
        <Counter id="cups" start={0.2} duration={2.8} to={12400} suffix="+" label="cups poured" size={110} />
      </Track>
    </Composition>
  );
}

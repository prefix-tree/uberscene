import { Clip, Composition } from "@uberscene/kit";

// A push-in: the frame closes slowly on the subject, for focus or tension.
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
        transform={{
          scale: [
            { at: 0, value: 1, easing: "easeInOutSine" },
            { at: 3, value: 1.2 },
          ],
        }}
      />
    </Composition>
  );
}

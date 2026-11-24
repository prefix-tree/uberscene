import { Clip, Composition } from "@uberscene/kit";

// A matched push across a cut: both shots grow through the cut, so the camera seems to keep moving.
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
        id="a"
        src="asset:redCup"
        in={18}
        out={19.5}
        fit="cover"
        transform={{
          scale: [
            { at: 1.1, value: 1, easing: "easeInQuart" },
            { at: 1.5, value: 1.25 },
          ],
        }}
      />
      <Clip
        id="b"
        src="asset:redCup"
        in={30}
        out={31.5}
        fit="cover"
        transform={{
          scale: [
            { at: 0, value: 0.85, easing: "easeOutQuart" },
            { at: 0.4, value: 1 },
          ],
        }}
      />
    </Composition>
  );
}

import { Clip, Composition } from "@uberscene/kit";

// A pan: the frame travels across a wider picture, to show more than fits.
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
        box={{
          width: 960,
          height: 540,
          y: -90,
          x: [
            { at: 0, value: 0, easing: "easeInOutSine" },
            { at: 3, value: -320 },
          ],
        }}
      />
    </Composition>
  );
}

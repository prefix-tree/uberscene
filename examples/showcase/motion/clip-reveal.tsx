import { Clip, Composition } from "@uberscene/kit";

// A crop reveal: the shot opens from a sliver to the full frame, as a clean wipe without a transition.
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
          crop: {
            width: [
              { at: 0.3, value: 0, easing: "easeInOutQuart" },
              { at: 1.3, value: 1 },
            ],
          },
        }}
      />
    </Composition>
  );
}

import { Clip, Composition, Track } from "@uberscene/kit";

// Picture in picture: a small shot pops into a corner over the main one, for a reaction or a detail.
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
      <Clip id="wide" src="asset:redCup" in={18} out={21} fit="cover" />
      <Track id="inset" layout="free">
        <Clip
          id="detail"
          src="asset:redCup"
          start={0}
          in={32}
          out={35}
          fit="cover"
          box={{ x: 600, y: 330, width: 200, height: 112, origin: "bottomRight" }}
          transform={{
            borderRadius: 12,
            scale: [
              { at: 0.5, value: 0.01, easing: "easeOutBack" },
              { at: 1, value: 1 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}

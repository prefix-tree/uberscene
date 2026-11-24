import { Composition, Title, Track } from "@uberscene/kit";

// Scale punch: a word that jumps on each beat and settles, to land a rhythm.
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
        <Title
          id="beat"
          start={0}
          duration={3}
          style={{ size: 96, weight: 800, color: ACCENT }}
          box={{ x: 320, y: 180, origin: "center" }}
          transform={{
            scale: [
              { at: 0.45, value: 1 },
              { at: 0.5, value: 1.35, easing: "easeOutQuart" },
              { at: 0.8, value: 1 },
              { at: 1.25, value: 1 },
              { at: 1.3, value: 1.35, easing: "easeOutQuart" },
              { at: 1.6, value: 1 },
              { at: 2.05, value: 1 },
              { at: 2.1, value: 1.35, easing: "easeOutQuart" },
              { at: 2.4, value: 1 },
            ],
          }}
        >
          NOW
        </Title>
      </Track>
    </Composition>
  );
}

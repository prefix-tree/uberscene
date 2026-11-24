import { Clip, Composition, Title, Track } from "@uberscene/kit";

// A freeze: one frame holds while a note points at it, then the shot plays on.
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
        out={20}
        fit="cover"
        freezes={[{ start: 0.9, duration: 1.2, source: 18.9 }]}
      />
      <Track id="text" layout="free">
        <Title
          id="note"
          start={0.9}
          duration={1.2}
          style={{ size: 36, weight: 800, color: PAPER, background: ACCENT }}
          box={{ x: 320, y: 300, width: 130, height: 56, origin: "center" }}
          enter={{ type: "fade", duration: 0.2 }}
          exit={{ type: "fade", duration: 0.2 }}
        >
          Hold
        </Title>
      </Track>
    </Composition>
  );
}

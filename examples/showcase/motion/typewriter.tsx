import { Composition, Title, Track } from "@uberscene/kit";

// Typewriter: letters appear one by one, for code, a prompt or a search.
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
          id="prompt"
          start={0}
          duration={3}
          style={{ size: 40, weight: 800, color: INK }}
          box={{ x: 320, y: 180, origin: "center" }}
          animation={{ type: "typewriter", in: 1.6 }}
        >
          make the cup green
        </Title>
      </Track>
    </Composition>
  );
}

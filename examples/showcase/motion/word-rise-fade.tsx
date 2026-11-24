import { Composition, Title, Track } from "@uberscene/kit";

// Word by word: a line that arrives one word at a time, paced for reading.
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
          id="line"
          start={0}
          duration={3}
          style={{ size: 44, weight: 800, color: INK }}
          box={{ x: 320, y: 180, origin: "center" }}
          animation={{ type: "wordByWord", in: 1.2, stagger: 0.14 }}
        >
          Every frame on the clock
        </Title>
      </Track>
    </Composition>
  );
}

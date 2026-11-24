import { Composition, Shape, Track } from "@uberscene/kit";

// Follow-through: the lead arrives first and the parts behind it settle a beat later, as if dragged.
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
      <Track id="shapes" layout="free">
        <Shape
          id="part1"
          type="circle"
          start={0}
          duration={3}
          width={70}
          height={70}
          fill={ACCENT}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0.4, value: 140, easing: "easeOutQuart" },
              { at: 1.2, value: 500 },
            ],
          }}
        />
        <Shape
          id="part2"
          type="circle"
          start={0}
          duration={3}
          width={48}
          height={48}
          fill={INK}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0.4, value: 84, easing: "easeOutBack" },
              { at: 1.38, value: 444 },
            ],
          }}
        />
        <Shape
          id="part3"
          type="circle"
          start={0}
          duration={3}
          width={30}
          height={30}
          fill={INK}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0.4, value: 28, easing: "easeOutBack" },
              { at: 1.56, value: 388 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}

import { Composition, Shape, Track } from "@uberscene/kit";

// Parallax: near things move further than far things, so a flat frame reads as deep.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";
const MUTED = "#c9c2b6";

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
      <Track id="layers" layout="free">
        <Shape
          id="far1"
          type="circle"
          start={0}
          duration={3}
          width={30}
          height={30}
          fill={MUTED}
          box={{
            y: 110,
            origin: "center",
            x: [
              { at: 0, value: 120, easing: "easeInOutSine" },
              { at: 3, value: 60 },
            ],
          }}
        />
        <Shape
          id="far2"
          type="circle"
          start={0}
          duration={3}
          width={30}
          height={30}
          fill={MUTED}
          box={{
            y: 110,
            origin: "center",
            x: [
              { at: 0, value: 320, easing: "easeInOutSine" },
              { at: 3, value: 260 },
            ],
          }}
        />
        <Shape
          id="far3"
          type="circle"
          start={0}
          duration={3}
          width={30}
          height={30}
          fill={MUTED}
          box={{
            y: 110,
            origin: "center",
            x: [
              { at: 0, value: 520, easing: "easeInOutSine" },
              { at: 3, value: 460 },
            ],
          }}
        />
        <Shape
          id="mid1"
          type="circle"
          start={0}
          duration={3}
          width={48}
          height={48}
          fill={INK}
          box={{
            y: 190,
            origin: "center",
            x: [
              { at: 0, value: 120, easing: "easeInOutSine" },
              { at: 3, value: -40 },
            ],
          }}
        />
        <Shape
          id="mid2"
          type="circle"
          start={0}
          duration={3}
          width={48}
          height={48}
          fill={INK}
          box={{
            y: 190,
            origin: "center",
            x: [
              { at: 0, value: 320, easing: "easeInOutSine" },
              { at: 3, value: 160 },
            ],
          }}
        />
        <Shape
          id="mid3"
          type="circle"
          start={0}
          duration={3}
          width={48}
          height={48}
          fill={INK}
          box={{
            y: 190,
            origin: "center",
            x: [
              { at: 0, value: 520, easing: "easeInOutSine" },
              { at: 3, value: 360 },
            ],
          }}
        />
        <Shape
          id="near1"
          type="circle"
          start={0}
          duration={3}
          width={72}
          height={72}
          fill={ACCENT}
          box={{
            y: 280,
            origin: "center",
            x: [
              { at: 0, value: 120, easing: "easeInOutSine" },
              { at: 3, value: -200 },
            ],
          }}
        />
        <Shape
          id="near2"
          type="circle"
          start={0}
          duration={3}
          width={72}
          height={72}
          fill={ACCENT}
          box={{
            y: 280,
            origin: "center",
            x: [
              { at: 0, value: 320, easing: "easeInOutSine" },
              { at: 3, value: 0 },
            ],
          }}
        />
        <Shape
          id="near3"
          type="circle"
          start={0}
          duration={3}
          width={72}
          height={72}
          fill={ACCENT}
          box={{
            y: 280,
            origin: "center",
            x: [
              { at: 0, value: 520, easing: "easeInOutSine" },
              { at: 3, value: 200 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}

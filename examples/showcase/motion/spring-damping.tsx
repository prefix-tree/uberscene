import { Composition, Layer, Shape, spring, Title, Track, useLayer } from "@uberscene/kit";

// Spring damping: one number decides how a landing feels. Three balls drop at the same moment on springs with
// damping ratios 1.0, 0.8 and 0.5 (the kit's `damping` 20, 16 and 10): dead still, one small bounce, two bounces.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";
const MUTED = "#c9c2b6";

/** A ball that falls from `from` to `to` (pixels from the top) on a spring let go `after` seconds into the layer. */
function Ball({ x, damping, after }: { x: number; damping: number; after: number }) {
  const { elapsed } = useLayer();
  // What the spring would overshoot by is turned back up: the ball bounces off the floor instead of passing it.
  const y = 232 - Math.abs(232 - spring({ time: elapsed - after, from: 70, to: 232, damping }));
  return (
    <div
      style={{
        position: "absolute",
        left: x - 28,
        top: y - 28,
        width: 56,
        height: 56,
        borderRadius: 28,
        background: ACCENT,
      }}
    />
  );
}

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
      <Track id="floor" layout="free">
        <Shape
          id="line"
          type="rectangle"
          start={0}
          duration={3.5}
          width={520}
          height={3}
          fill={MUTED}
          box={{ x: 320, y: 262, origin: "center" }}
        />
        <Title
          id="stiff-label"
          start={0}
          duration={3.5}
          style={{ size: 22, weight: 700, color: INK }}
          box={{ x: 160, y: 300, origin: "center" }}
        >
          1.0
        </Title>
        <Title
          id="soft-label"
          start={0}
          duration={3.5}
          style={{ size: 22, weight: 700, color: INK }}
          box={{ x: 320, y: 300, origin: "center" }}
        >
          0.8
        </Title>
        <Title
          id="loose-label"
          start={0}
          duration={3.5}
          style={{ size: 22, weight: 700, color: INK }}
          box={{ x: 480, y: 300, origin: "center" }}
        >
          0.5
        </Title>
      </Track>
      <Track id="balls" layout="free">
        <Layer id="stiff" start={0} duration={3.5}>
          <Ball x={160} damping={20} after={0.4} />
        </Layer>
        <Layer id="soft" start={0} duration={3.5}>
          <Ball x={320} damping={16} after={0.4} />
        </Layer>
        <Layer id="loose" start={0} duration={3.5}>
          <Ball x={480} damping={10} after={0.4} />
        </Layer>
      </Track>
    </Composition>
  );
}

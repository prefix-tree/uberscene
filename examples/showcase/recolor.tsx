import { Clip, Composition, fontFamily, googleFont, Layer, Title, Track, useLayer } from "@uberscene/kit";

/**
 * The README's opening: one prompt changes a video. A short of espresso running into a red paper cup; an agent is asked
 * to "change red cup color to green" and writes one line, a `recolor` effect; the same short plays with the cup green.
 * The two shorts play the same seconds of the same footage, each on its own track (one track playing a stretch twice
 * reads as a mistake to the lint). Besides when they start, the only difference between them is that effects line,
 * which is the line the prompt shows; here its `amount` is keyed from 0 to 1, so the change is seen happening. Every shape in the prompt is a function of the layer's elapsed time, so the preview and
 * the export draw the same frame, and the last frame is the first, so it loops.
 */
export const mono = googleFont("Geist Mono", { weights: [400, 600] });
export const sans = googleFont("Inter", { weights: [500, 700] });

const W = 1280;
const H = 720;
const INK = "#0d0f12";
const PAPER = "#eceef1";
const MUTED = "#8a919c";
const GREEN = "#46c46a";
const PROMPT = "change red cup color to green";
/** The line the agent writes: the one difference between the two shorts. */
const LINE = '+   effects={[{ type: "recolor", from: "#c3292a", to: "#2f9e4f" }]}';

/** The short: 9:16, as tall as the frame allows with room for its label. */
const SHORT = { y: 380, width: 324, height: 576, origin: "center" } as const;
/** Where the short stands beside the prompt, and alone. */
const LEFT = 300;
const CENTRE = W / 2;
const CORNERS = { borderRadius: 26 };

export default function Video() {
  return (
    <Composition fps={30} width={W} height={H} background={{ type: "color", color: INK }}>
      <Track id="red" layout="free">
        {/* 1. The short, red; it steps aside for the prompt. */}
        <Clip
          id="before"
          src="asset:redCup"
          start={0}
          in={18}
          out={25.5}
          fit="cover"
          volume={0}
          box={{
            ...SHORT,
            x: [
              { at: 3.1, value: CENTRE, easing: "easeInOutCubic" },
              { at: 3.7, value: LEFT },
            ],
          }}
          transform={CORNERS}
        />
      </Track>
      <Track id="green" layout="free">
        {/* 3. The same short, with the line the agent wrote; it comes back to the middle. */}
        <Clip
          id="after"
          src="asset:redCup"
          start={7.5}
          in={18}
          out={22.5}
          fit="cover"
          volume={0}
          box={{
            ...SHORT,
            x: [
              { at: 0.9, value: LEFT, easing: "easeInOutCubic" },
              { at: 1.5, value: CENTRE },
            ],
          }}
          transform={CORNERS}
          effects={[
            {
              type: "recolor",
              from: "#c3292a",
              to: "#2f9e4f",
              amount: [
                { at: 0, value: 0, easing: "easeOutCubic" },
                { at: 0.45, value: 1 },
              ],
            },
          ]}
        />
      </Track>

      <Track id="words" layout="free">
        <Title
          id="file"
          start={0}
          duration={7.5}
          style={{ font: mono, size: 22, weight: 400, color: MUTED }}
          box={{ x: CENTRE, y: 50, origin: "center" }}
          enter={{ type: "fade", duration: 0.4 }}
          exit={{ type: "fade", duration: 0.3 }}
        >
          video.tsx
        </Title>
        <Title
          id="changed"
          start={7.5}
          duration={4.5}
          style={{ font: mono, size: 22, weight: 400, color: GREEN }}
          box={{ x: CENTRE, y: 50, origin: "center" }}
          enter={{ type: "fade", duration: 0.3 }}
          exit={{ type: "fade", duration: 0.4 }}
        >
          video.tsx · 1 line changed
        </Title>
        {/* 2. The prompt, typed, and the line the agent writes. */}
        <Layer id="prompt" start={3.5} duration={5.2}>
          <Agent />
        </Layer>
      </Track>
    </Composition>
  );
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0 before `a`, 1 after `b`, eased between. */
const span = (t: number, a: number, b: number) => {
  const x = clamp01((t - a) / (b - a));
  return 1 - (1 - x) ** 3;
};

/** An agent's input box: the prompt typed letter by letter, a moment of work, then the diff it made. */
function Agent() {
  const { elapsed: t } = useLayer();
  const shown = span(t, 0, 0.35) * (1 - span(t, 4.7, 5.2));
  const typed = PROMPT.slice(0, Math.floor(clamp01((t - 0.45) / 1.5) * PROMPT.length));
  const caret = t < 2.1 && Math.floor(t * 2.5) % 2 === 0;
  const working = t > 2.15 && t < 2.75;
  const diff = span(t, 2.75, 3.15);
  const text = {
    fontFamily: fontFamily(mono, "monospace"),
    fontSize: 19,
    lineHeight: "30px",
    whiteSpace: "pre" as const,
  };
  return (
    <div
      style={{
        position: "absolute",
        left: 540,
        top: 210,
        width: 680,
        opacity: shown,
        transform: `translateY(${(1 - span(t, 0, 0.35)) * 16}px)`,
        background: "#161a20",
        border: "1px solid #2a3038",
        borderRadius: 14,
        padding: "22px 26px",
        color: PAPER,
        ...text,
      }}
    >
      <div style={{ fontFamily: fontFamily(sans, "sans-serif"), fontSize: 14, color: MUTED, marginBottom: 12 }}>
        Your agent
      </div>
      <div>
        <span style={{ color: MUTED }}>{"> "}</span>
        {typed}
        <span style={{ opacity: caret ? 1 : 0 }}>▍</span>
      </div>
      <div style={{ color: MUTED, marginTop: 18, opacity: working ? 1 : diff > 0 ? 1 : 0 }}>
        {working ? "Editing video.tsx…" : diff > 0 ? "Edited video.tsx" : ""}
      </div>
      <div
        style={{
          marginTop: 10,
          opacity: diff,
          transform: `translateY(${(1 - diff) * 8}px)`,
          background: "#0f1317",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 15,
          lineHeight: "24px",
        }}
      >
        <div style={{ color: MUTED }}>{' <Clip id="after" src="asset:redCup" start={7.5} in={18} out={22.5}'}</div>
        <div style={{ color: GREEN, background: "rgba(70, 196, 106, 0.12)" }}>{LINE}</div>
        <div style={{ color: MUTED }}>{" />"}</div>
      </div>
    </div>
  );
}

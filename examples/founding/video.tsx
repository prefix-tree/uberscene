// Why we started UberScene, told in 55 seconds: editing eats the evening, a model can neither drag a timeline nor
// guess ffmpeg flags, but it writes code well, so the video became a file. Then what a file gives you, and the
// foundation the rest is built on. No footage: every frame is drawn by the code below, on the video's clock, and the
// film is itself one file of the kind it describes.

import type { ReactNode } from "react";

import { Audio, Composition, googleFont, Layer, Track, useLayer } from "@uberscene/kit";

const display = googleFont("Barlow Condensed", { weights: [800] });
const mono = googleFont("Geist Mono", { weights: [500] });

// The site's look: paper, ink, one orange, hard shadows.
const PAPER = "#f3f3f3";
const WHITE = "#ffffff";
const INK = "#0a0a0a";
const GREY = "#7a7a7a";
const RULE = "#d4d4d4";
const ACCENT = "#ff5a1f";
const RED = "#d93036";
const GREEN = "#1f9d55";
const W = 1920;
const H = 1080;
const DISPLAY = `"Barlow Condensed", "Inter", sans-serif`;
const MONO = `"Geist Mono", ui-monospace, monospace`;
const BODY = `"Inter", sans-serif`;

// ── Time helpers: every value is a function of the layer's seconds ───────────────────────────────────────────────
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const backOut = (x: number) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
/** 0 before `a`, 1 after `a + over`, eased between. */
const span = (t: number, a: number, over: number, ease: (x: number) => number = easeOut) =>
  ease(clamp01((t - a) / over));
const lerp = (a: number, b: number, q: number) => a + (b - a) * q;
/** The first part of `text`, typed from `start` at `cps` characters a second. */
const typed = (text: string, t: number, start: number, cps = 40) =>
  text.slice(0, Math.max(0, Math.floor((t - start) * cps)));
/** A typing caret that blinks twice a second. */
const caret = (t: number) => (Math.floor(t * 2) % 2 === 0 ? 1 : 0);

const useT = () => useLayer().elapsed;

// ── Shared parts ─────────────────────────────────────────────────────────────────────────────────────────────────
function Frame({ children, bg = PAPER }: { children: ReactNode; bg?: string }) {
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, background: bg, overflow: "hidden" }}>
      {children}
    </div>
  );
}

/** A hard-edged box in the site's style: a heavy ink border and a hard shadow. */
function Panel({
  x,
  y,
  w,
  h,
  children,
  bg = WHITE,
  shadow = 10,
  opacity = 1,
  lift = 0,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  children?: ReactNode;
  bg?: string;
  shadow?: number;
  opacity?: number;
  lift?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + lift,
        width: w,
        height: h,
        background: bg,
        border: `4px solid ${INK}`,
        boxShadow: `${shadow}px ${shadow}px 0 ${INK}`,
        boxSizing: "border-box",
        opacity,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

/** A panel's title bar: a file name in mono, as an editor shows it. */
function TitleBar({ name, note }: { name: string; note?: string }) {
  return (
    <div
      style={{
        height: 56,
        borderBottom: `4px solid ${INK}`,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 22px",
        font: `500 24px ${MONO}`,
        color: INK,
        background: PAPER,
      }}
    >
      <span style={{ width: 16, height: 16, background: ACCENT, display: "inline-block" }} />
      <span>{name}</span>
      {note ? <span style={{ marginLeft: "auto", color: GREY }}>{note}</span> : null}
    </div>
  );
}

/**
 * The big words of a scene. Each word rises out of its own slot, one after another from `at`; words written `*so*`
 * are in the accent colour.
 */
function Headline({
  text,
  at,
  y,
  size = 120,
  color = INK,
  center = false,
  x = 120,
}: {
  text: string;
  at: number;
  y: number;
  size?: number;
  color?: string;
  center?: boolean;
  x?: number;
}) {
  const t = useT();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: W - 2 * x,
        textAlign: center ? "center" : "left",
        font: `800 ${size}px/1 ${DISPLAY}`,
        textTransform: "uppercase",
        color,
        letterSpacing: "-0.005em",
      }}
    >
      {text.split(" ").map((word, i, words) => {
        const p = span(t, at + i * 0.07, 0.5);
        // A word is hot inside a pair of stars: from one that opens with a star to one that closes with one.
        const opened = words.slice(0, i + 1).filter((w) => w.startsWith("*")).length;
        const closed = words.slice(0, i).filter((w) => w.replace(/[.,]$/, "").endsWith("*")).length;
        const hot = opened > closed;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "top",
              paddingBottom: "0.06em",
              marginRight: "0.22em",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - p) * 110}%)`,
                color: hot ? ACCENT : color,
              }}
            >
              {word.replace(/\*/g, "")}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** A line of plain words under the graphic, faded and lifted in at `at`. */
function Line({
  text,
  at,
  y,
  size = 40,
  color = INK,
  x = 120,
  center = false,
}: {
  text: string;
  at: number;
  y: number;
  size?: number;
  color?: string;
  x?: number;
  center?: boolean;
}) {
  const t = useT();
  const p = span(t, at, 0.5);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + (1 - p) * 18,
        width: W - 2 * x,
        textAlign: center ? "center" : "left",
        font: `700 ${size}px/1.25 ${BODY}`,
        color,
        opacity: p,
      }}
    >
      {text}
    </div>
  );
}

/** A mouse pointer, drawn as the site draws its icons: an ink outline over a fill. */
function Pointer({ x, y, fill = ACCENT, opacity = 1 }: { x: number; y: number; fill?: string; opacity?: number }) {
  return (
    <svg
      width={64}
      height={64}
      viewBox="0 0 32 32"
      style={{ position: "absolute", left: x, top: y, opacity, overflow: "visible" }}
      role="img"
    >
      <title>pointer</title>
      <path d="M4 2 L4 26 L10 20 L14 29 L19 27 L15 18 L23 18 Z" fill={fill} stroke={INK} strokeWidth={2.4} />
    </svg>
  );
}

/** A speech bubble with a label over it, for what a person asks for. */
function Bubble({
  x,
  y,
  w,
  label,
  text,
  t,
  at,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  text: string;
  t: number;
  at: number;
}) {
  const p = span(t, at, 0.35, backOut);
  const shown = typed(text, t, at + 0.25, 28);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        transform: `scale(${lerp(0.6, 1, p)})`,
        transformOrigin: "left bottom",
        opacity: clamp01(p * 3),
      }}
    >
      <div style={{ font: `500 22px ${MONO}`, color: GREY, marginBottom: 10, letterSpacing: "0.08em" }}>{label}</div>
      <div
        style={{
          background: INK,
          color: WHITE,
          font: `700 38px/1.2 ${BODY}`,
          padding: "22px 28px",
          minHeight: 46,
          boxShadow: `8px 8px 0 ${ACCENT}`,
        }}
      >
        “{shown}
        {shown.length < text.length ? <span style={{ opacity: caret(t) }}>▍</span> : "”"}
      </div>
    </div>
  );
}

// ── The timeline drawn in several scenes ─────────────────────────────────────────────────────────────────────────
interface Bar {
  readonly id: string;
  readonly row: number;
  /** 0 to 1 across the timeline. */
  readonly from: number;
  readonly to: number;
  readonly fill: string;
  readonly ink?: string;
  /** 0 to 1: how much of the bar has grown in, from its left end. */
  readonly grow?: number;
  readonly dx?: number;
  readonly dy?: number;
}

/** Rows of clips on a ruler: a non-linear editor reduced to its bars. */
function Timeline({
  x,
  y,
  w,
  rows,
  bars,
  labels,
  playhead,
}: {
  x: number;
  y: number;
  w: number;
  rows: number;
  bars: readonly Bar[];
  labels: readonly string[];
  playhead?: number;
}) {
  const gutter = 92;
  const rowH = 78;
  const inner = w - gutter - 8;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: 44 + rows * rowH }}>
      {/* The ruler. */}
      <div style={{ position: "absolute", left: gutter, top: 0, width: inner, height: 32 }}>
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (i / 10) * inner,
              top: i % 5 === 0 ? 4 : 16,
              width: 3,
              height: i % 5 === 0 ? 28 : 16,
              background: INK,
            }}
          />
        ))}
      </div>
      {labels.map((label, r) => (
        <div
          key={label}
          style={{
            position: "absolute",
            left: 0,
            top: 44 + r * rowH,
            width: gutter - 16,
            height: rowH - 14,
            display: "flex",
            alignItems: "center",
            font: `500 24px ${MONO}`,
            color: GREY,
          }}
        >
          {label}
        </div>
      ))}
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          style={{
            position: "absolute",
            left: gutter,
            top: 44 + r * rowH + (rowH - 14) / 2,
            width: inner,
            height: 3,
            background: RULE,
          }}
        />
      ))}
      {bars.map((bar) => {
        const grow = bar.grow ?? 1;
        const width = (bar.to - bar.from) * inner * grow;
        if (width <= 1) return null;
        return (
          <div
            key={bar.id}
            style={{
              position: "absolute",
              left: gutter + bar.from * inner + (bar.dx ?? 0),
              top: 44 + bar.row * rowH + (bar.dy ?? 0),
              width,
              height: rowH - 14,
              background: bar.fill,
              border: `4px solid ${INK}`,
              boxSizing: "border-box",
              boxShadow: `5px 5px 0 ${INK}`,
              font: `500 22px/1 ${MONO}`,
              color: bar.ink ?? INK,
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {bar.id}
          </div>
        );
      })}
      {playhead !== undefined && playhead > 0 && playhead < 1 ? (
        <div
          style={{
            position: "absolute",
            left: gutter + playhead * inner - 2,
            top: 0,
            width: 4,
            height: 44 + rows * rowH - 10,
            background: ACCENT,
          }}
        >
          <div style={{ position: "absolute", left: -10, top: 0, width: 24, height: 18, background: ACCENT }} />
        </div>
      ) : null}
    </div>
  );
}

/** Lines of code, each typed in turn; a line can be marked as added, removed or lit. */
interface CodeLine {
  readonly text: string;
  readonly at?: number;
  readonly mark?: "add" | "remove" | "lit" | undefined;
  /** 0 to 1, for a mark that fades in. */
  readonly markIn?: number;
}

function Code({
  lines,
  t,
  size = 26,
  top = 24,
}: {
  lines: readonly CodeLine[];
  t: number;
  size?: number;
  top?: number;
}) {
  const lead = Math.round(size * 1.75);
  return (
    <div style={{ position: "absolute", left: 0, top: 56 + top, right: 0 }}>
      {lines.map((line, i) => {
        const text = line.at === undefined ? line.text : typed(line.text, t, line.at, 55);
        const typing = line.at !== undefined && text.length > 0 && text.length < line.text.length;
        const k = line.markIn ?? 1;
        const bg =
          line.mark === "add"
            ? `rgba(31, 157, 85, ${0.18 * k})`
            : line.mark === "remove"
              ? `rgba(217, 48, 54, ${0.16 * k})`
              : line.mark === "lit"
                ? `rgba(255, 90, 31, ${0.22 * k})`
                : "transparent";
        const sign = line.mark === "add" ? "+" : line.mark === "remove" ? "−" : " ";
        const signColor = line.mark === "add" ? GREEN : RED;
        return (
          <div
            key={i}
            style={{
              height: lead,
              display: "flex",
              alignItems: "center",
              background: bg,
              font: `500 ${size}px ${MONO}`,
              color: INK,
              whiteSpace: "pre",
            }}
          >
            <span style={{ width: 54, textAlign: "right", color: RULE, marginRight: 14 }}>{i + 1}</span>
            <span style={{ width: 26, color: signColor, opacity: k }}>{sign}</span>
            <Highlighted text={text} />
            {typing ? <span style={{ color: ACCENT }}>▍</span> : null}
          </div>
        );
      })}
    </div>
  );
}

/** JSX coloured the way the site colours it: tags ink, ids and strings orange, the rest grey. */
function Highlighted({ text }: { text: string }) {
  const parts = text.split(/("[^"]*"?|\{[^}]*\}?)/g);
  return (
    <span>
      {parts.map((part, i) => (
        <span key={i} style={{ color: part.startsWith('"') || part.startsWith("{") ? ACCENT : INK }}>
          {part}
        </span>
      ))}
    </span>
  );
}

// ── 1. Editing eats the evening ──────────────────────────────────────────────────────────────────────────────────
function Evening() {
  const t = useT();
  const film = span(t, 1.0, 0.4, backOut);
  const edit = span(t, 2.7, 2.6, easeInOut);
  const minutes = Math.round(lerp(5, 134, edit));
  const label = minutes < 60 ? `${minutes} MIN` : `${Math.floor(minutes / 60)} H ${minutes % 60} MIN`;
  const full = 1680;
  return (
    <Frame>
      <Headline text="Filming takes *five* minutes." at={0.2} y={130} size={140} />
      <Headline text="Editing takes the *evening.*" at={2.4} y={290} size={140} />
      <div style={{ position: "absolute", left: 120, top: 560, font: `500 26px ${MONO}`, color: GREY }}>FILM</div>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 600,
          width: 64 * film,
          height: 72,
          background: ACCENT,
          border: film > 0 ? `4px solid ${INK}` : "none",
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 210,
          top: 616,
          font: `800 44px ${DISPLAY}`,
          color: INK,
          opacity: film,
        }}
      >
        5 MIN
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 720,
          font: `500 26px ${MONO}`,
          color: GREY,
          opacity: span(t, 2.5, 0.3),
        }}
      >
        EDIT
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 760,
          width: full * edit,
          height: 72,
          background: INK,
          boxShadow: edit > 0 ? `8px 8px 0 ${ACCENT}` : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 120 + Math.max(0, full * edit - 260),
          top: 776,
          width: 240,
          textAlign: "right",
          font: `800 44px ${DISPLAY}`,
          color: WHITE,
          opacity: span(t, 3.1, 0.3),
        }}
      >
        {label}
      </div>
      <Line text="Every cut, every caption, every export. By hand." at={4.4} y={900} color={GREY} />
    </Frame>
  );
}

// ── 2. A model cannot drag a timeline ────────────────────────────────────────────────────────────────────────────
function Drag() {
  const t = useT();
  const panel = span(t, 0.3, 0.45, backOut);
  // The pointer comes in, takes hold of the talk clip, and cannot move it: it shakes, slips and lets go.
  const come = span(t, 1.5, 0.6, easeInOut);
  const shake = t > 2.15 && t < 2.9 ? Math.sin(t * 70) * 12 * (1 - span(t, 2.15, 0.75)) : 0;
  const px = lerp(1720, 1280, come) + shake;
  const py = lerp(960, 540, come) + (t > 2.9 ? span(t, 2.9, 0.4) * 60 : 0);
  const miss = span(t, 2.75, 0.3, backOut);
  const bars: Bar[] = [
    { id: "intro", row: 0, from: 0, to: 0.24, fill: PAPER },
    { id: "talk", row: 0, from: 0.24, to: 0.78, fill: ACCENT, dx: shake * 0.4 },
    { id: "outro", row: 0, from: 0.78, to: 1, fill: PAPER },
    { id: "title", row: 1, from: 0.3, to: 0.52, fill: WHITE },
    { id: "music", row: 2, from: 0, to: 1, fill: RULE },
  ];
  return (
    <Frame>
      <Headline text="We wanted AI to do *the editing.*" at={0.05} y={100} size={120} />
      <Panel x={700} y={330} w={1100} h={420} opacity={clamp01(panel * 2)} lift={(1 - panel) * 40}>
        <TitleBar name="timeline" />
        <Timeline x={30} y={84} w={1030} rows={3} bars={bars} labels={["V1", "V2", "A1"]} />
      </Panel>
      <Bubble x={120} y={420} w={500} label="PROMPT" text="Make it tighter." t={t} at={0.9} />
      {t > 1.5 ? <Pointer x={px} y={py} opacity={1 - span(t, 3.6, 0.3)} /> : null}
      {/* A cross where the drag failed. */}
      <div
        style={{
          position: "absolute",
          left: 1150,
          top: 400,
          width: 120,
          height: 120,
          transform: `scale(${miss}) rotate(${lerp(-20, 0, miss)}deg)`,
          font: `800 150px/120px ${DISPLAY}`,
          color: RED,
          textAlign: "center",
        }}
      >
        ×
      </div>
      <Line text="But a model can’t drag a timeline." at={2.9} y={850} size={56} />
    </Frame>
  );
}

// ── 3. Flags are guesswork ───────────────────────────────────────────────────────────────────────────────────────
const COMMAND =
  '$ ffmpeg -i talk.mp4 -filter_complex "[0:v]trim=start=3.2:end=11.87,setpts=PTS-STARTPTS[v0];[0:a]atrim=start=3.2:end=11.87,asetpts=PTS-STARTPTS[a0];[v0]drawtext=text=\'Maya\':x=(w-tw)/2:y=h-140:fontsize=48[v1]" -map "[v1]" -map "[a0]" -c:v libx264 out.mp4';
const ERRORS = [
  { text: "[AVFilterGraph] No such filter: 'drawtext'", at: 2.85 },
  { text: "Error initializing complex filters.", at: 3.15 },
  { text: "Invalid argument", at: 3.4 },
];

function Flags() {
  const t = useT();
  const box = span(t, 0.2, 0.4, backOut);
  const shown = typed(COMMAND, t, 0.6, 140);
  return (
    <Frame>
      <Headline text="And ffmpeg flags are *guesswork.*" at={0.05} y={100} size={120} />
      <Panel x={160} y={310} w={1600} h={600} bg={INK} opacity={clamp01(box * 2)} lift={(1 - box) * 40}>
        <div
          style={{
            padding: "40px 48px",
            font: `500 30px/1.55 ${MONO}`,
            color: WHITE,
            wordBreak: "break-all",
          }}
        >
          {shown}
          {shown.length < COMMAND.length ? <span style={{ color: ACCENT }}>▍</span> : null}
          {ERRORS.map((e) =>
            t >= e.at ? (
              <div key={e.text} style={{ color: ACCENT, marginTop: 6 }}>
                {e.text}
              </div>
            ) : null,
          )}
          {t > 3.5 ? <div style={{ color: GREY, opacity: caret(t) }}>$ ▍</div> : null}
        </div>
      </Panel>
    </Frame>
  );
}

// ── 4. What models are good at ───────────────────────────────────────────────────────────────────────────────────
// Code drifting behind the words, faint: lines a model writes all day.
const DRIFT = [
  "export default function Video() {",
  "const cut = clips.filter((c) => c.score > 0.8);",
  "return <Composition fps={30} width={1920}>",
  "<Clip id='talk' in='word:12' out='word:40.end' />",
  "for (const take of takes) review(take);",
  "<Captions id='subs' src='asset:talk' />",
  "git diff video.tsx",
  "const music = await pick({ mood: 'warm' });",
  "<Transition id='x1' type='crossfade' />",
  "test('every caption follows its word')",
  "<Title id='name' at='word:1'>Maya</Title>",
  "pnpm uberscene video.tsx --out film.mp4",
];

function Insight() {
  const t = useT();
  const stamp = span(t, 1.25, 0.45, backOut);
  return (
    <Frame bg={INK}>
      {DRIFT.map((line, i) => {
        const speed = 40 + (i % 4) * 14;
        const x = ((i * 397 + t * speed) % 2600) - 700;
        return (
          <div
            key={line}
            style={{
              position: "absolute",
              left: x,
              top: 40 + i * 86,
              font: `500 34px ${MONO}`,
              color: "#1d1d1d",
              whiteSpace: "pre",
            }}
          >
            {line}
          </div>
        );
      })}
      <Line text="WHAT MODELS ARE ACTUALLY GOOD AT" at={0.3} y={330} size={40} color={ACCENT} center />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 400,
          width: W,
          textAlign: "center",
          font: `800 300px/1 ${DISPLAY}`,
          color: WHITE,
          transform: `scale(${lerp(1.5, 1, stamp)})`,
          opacity: clamp01(stamp * 2),
        }}
      >
        WRITING CODE.
      </div>
    </Frame>
  );
}

// ── 5. So we made the video a file ───────────────────────────────────────────────────────────────────────────────
/** The listing and the bar each line makes, with when each line is typed. */
const FILE_LINES = [
  { text: "<Composition fps={30}>", at: 0.9 },
  { text: '  <Clip id="intro" src="asset:city" />', at: 1.5, bar: "intro" },
  { text: '  <Clip id="talk" out="word:11.end" />', at: 2.2, bar: "talk" },
  { text: '  <Title id="name" at="word:1" />', at: 2.9, bar: "name" },
  { text: '  <Captions id="subs" src="asset:talk" />', at: 3.6, bar: "subs" },
  { text: '  <Audio id="music" src="asset:bed" />', at: 4.3, bar: "music" },
  { text: "</Composition>", at: 5.0 },
] as const;
const FILE_BARS: Record<string, Omit<Bar, "id" | "grow">> = {
  intro: { row: 0, from: 0, to: 0.26, fill: PAPER },
  talk: { row: 0, from: 0.26, to: 1, fill: ACCENT },
  name: { row: 1, from: 0.32, to: 0.6, fill: WHITE },
  subs: { row: 2, from: 0.26, to: 1, fill: INK, ink: WHITE },
  music: { row: 3, from: 0, to: 1, fill: RULE },
};
/** How long a line takes to type, and so when its bar grows. */
const typedBy = (text: string, at: number) => at + text.length / 55;

function MadeAFile() {
  const t = useT();
  const panels = span(t, 0.4, 0.45, backOut);
  const bars: Bar[] = FILE_LINES.flatMap((line) =>
    "bar" in line
      ? [{ id: line.bar, ...FILE_BARS[line.bar], grow: span(t, typedBy(line.text, line.at), 0.45) } as Bar]
      : [],
  );
  return (
    <Frame>
      <Headline text="So we made the video *a file.*" at={0.05} y={90} size={120} />
      <Panel x={120} y={290} w={880} h={540} opacity={clamp01(panels * 2)} lift={(1 - panels) * 40}>
        <TitleBar name="video.tsx" />
        <Code lines={FILE_LINES.map((l) => ({ text: l.text, at: l.at }))} t={t} size={25} />
      </Panel>
      <Panel x={1060} y={290} w={740} h={540} opacity={clamp01(panels * 2)} lift={(1 - panels) * 40}>
        <TitleBar name="timeline" />
        <Timeline
          x={24}
          y={84}
          w={680}
          rows={4}
          bars={bars}
          labels={["V1", "V2", "TXT", "A1"]}
          playhead={span(t, 5.6, 3, (x) => x)}
        />
      </Panel>
      {/* A rule from the file to the timeline: one is the other. */}
      <div
        style={{
          position: "absolute",
          left: 1006,
          top: 552,
          width: 48 * span(t, 1.8, 0.4),
          height: 6,
          background: ACCENT,
        }}
      />
      <Line text="One TSX file is the edit, the project and the code." at={5.4} y={900} size={44} />
    </Frame>
  );
}

// ── 6. Diff it ───────────────────────────────────────────────────────────────────────────────────────────────────
function Diff() {
  const t = useT();
  const panels = span(t, 0.2, 0.4, backOut);
  const removed = span(t, 0.7, 0.3);
  const added = span(t, 1.1, 0.3);
  const trim = span(t, 1.3, 0.6, easeInOut);
  const approve = span(t, 2.3, 0.35, backOut);
  const bars: Bar[] = [
    { id: "intro", row: 0, from: 0, to: 0.26, fill: PAPER },
    { id: "talk", row: 0, from: 0.26, to: lerp(1, 0.78, trim), fill: ACCENT },
    { id: "name", row: 1, from: 0.32, to: 0.6, fill: WHITE },
  ];
  return (
    <Frame>
      <Headline text="Diff it. *Review it.*" at={0.05} y={100} size={130} />
      <Panel x={120} y={320} w={960} h={420} opacity={clamp01(panels * 2)} lift={(1 - panels) * 40}>
        <TitleBar name="video.tsx" note="1 line changed" />
        <Code
          t={t}
          size={26}
          lines={[
            { text: '<Clip id="intro" src="asset:city" />' },
            {
              text: '<Clip id="talk" out="word:11.end" />',
              mark: removed > 0 ? "remove" : undefined,
              markIn: removed,
            },
            ...(t >= 1.1 ? [{ text: '<Clip id="talk" out="word:8.end" />', mark: "add" as const, markIn: added }] : []),
            { text: '<Title id="name" at="word:1" />' },
          ]}
        />
      </Panel>
      <Panel x={1140} y={320} w={660} h={300} opacity={clamp01(panels * 2)} lift={(1 - panels) * 40}>
        <TitleBar name="timeline" />
        <Timeline x={20} y={74} w={610} rows={2} bars={bars} labels={["V1", "V2"]} />
      </Panel>
      {/* A review stamp: the change went through like any other code. */}
      <div
        style={{
          position: "absolute",
          left: 1250,
          top: 660,
          padding: "14px 30px",
          border: `6px solid ${GREEN}`,
          color: GREEN,
          font: `800 64px/1 ${DISPLAY}`,
          transform: `rotate(-6deg) scale(${lerp(1.8, 1, approve)})`,
          opacity: clamp01(approve * 2),
          background: WHITE,
        }}
      >
        ✓ APPROVED
      </div>
      <Line text="An edit is a change of one value, read in a pull request." at={2.6} y={880} size={44} />
    </Frame>
  );
}

// ── 7. Cut on words ──────────────────────────────────────────────────────────────────────────────────────────────
const WORDS = ["So", "we", "made", "the", "video", "a", "file,", "and", "the", "rest", "followed."];
const CUT_AFTER = 6;

function Words() {
  const t = useT();
  // Each word's chip, laid out by its length.
  const widths = WORDS.map((w) => 40 + w.length * 26);
  const gap = 14;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (WORDS.length - 1);
  const left = (W - total) / 2;
  const xs = widths.map((_, i) => left + widths.slice(0, i).reduce((a, b) => a + b + gap, 0));
  const cutX = (xs[CUT_AFTER] ?? 0) + (widths[CUT_AFTER] ?? 0) + gap / 2;
  // The cut marker sweeps in, overshoots, and snaps to the end of "file,".
  const sweep = span(t, 1.0, 0.8, easeInOut);
  const snap = span(t, 1.8, 0.25, backOut);
  const markerX = lerp(left - 60, cutX + 70, sweep) + (cutX - (cutX + 70)) * snap;
  const cut = span(t, 2.05, 0.3);
  return (
    <Frame>
      <Headline text="Cut on *words,* not seconds." at={0.05} y={100} size={130} />
      {WORDS.map((word, i) => {
        const p = span(t, 0.35 + i * 0.05, 0.3, backOut);
        const after = i > CUT_AFTER;
        return (
          <div
            key={`${word}-${xs[i]}`}
            style={{
              position: "absolute",
              left: xs[i],
              top: 470 + (1 - p) * 30,
              width: widths[i],
              opacity: clamp01(p * 2) * (after ? lerp(1, 0.25, cut) : 1),
            }}
          >
            <div style={{ font: `500 22px ${MONO}`, color: GREY, textAlign: "center", marginBottom: 10 }}>{i}</div>
            <div
              style={{
                height: 96,
                background: i === CUT_AFTER ? ACCENT : WHITE,
                border: `4px solid ${INK}`,
                boxSizing: "border-box",
                boxShadow: `5px 5px 0 ${INK}`,
                font: `700 44px/88px ${BODY}`,
                textAlign: "center",
                color: INK,
              }}
            >
              {word}
            </div>
          </div>
        );
      })}
      {/* The cut. */}
      {t > 1.0 ? (
        <div style={{ position: "absolute", left: markerX - 3, top: 430, width: 6, height: 230, background: INK }}>
          <div
            style={{
              position: "absolute",
              left: -50,
              top: -54,
              width: 106,
              textAlign: "center",
              font: `500 24px ${MONO}`,
              color: WHITE,
              background: INK,
              padding: "6px 0",
            }}
          >
            CUT
          </div>
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 720,
          width: W,
          textAlign: "center",
          font: `500 44px ${MONO}`,
          color: INK,
          opacity: span(t, 2.1, 0.3),
        }}
      >
        {'<Clip id="talk" out='}
        <span style={{ color: ACCENT }}>{typed('"word:6.end"', t, 2.2, 30)}</span>
        {" />"}
      </div>
      <Line text="Trim the clip, and every caption and title moves with its word." at={2.7} y={880} size={44} center />
    </Frame>
  );
}

// ── 8. Your agent and you, one file ──────────────────────────────────────────────────────────────────────────────
function OneFile() {
  const t = useT();
  const card = span(t, 0.2, 0.4, backOut);
  // The agent's change lands in the file at 1.4; the hand's drag lands at 2.7.
  const agentLands = span(t, 1.4, 0.3);
  const drag = span(t, 1.9, 0.7, easeInOut);
  const handLands = span(t, 2.7, 0.3);
  const colour = t < 1.4 ? '"#0a0a0a"' : '"#ff5a1f"';
  const out = t < 2.7 ? "{12}" : "{10}";
  const bars: Bar[] = [{ id: "talk", row: 0, from: 0, to: lerp(0.9, 0.72, drag), fill: ACCENT }];
  return (
    <Frame>
      <Headline text="Your agent and you. *One file.*" at={0.05} y={100} size={120} />
      <Bubble x={120} y={380} w={460} label="YOUR AGENT" text="Make the title orange." t={t} at={0.4} />
      <Panel x={650} y={340} w={640} h={400} opacity={clamp01(card * 2)} lift={(1 - card) * 40}>
        <TitleBar name="video.tsx" note="undo ⌘Z" />
        <Code
          t={t}
          size={24}
          lines={[
            { text: "<Composition fps={30}>" },
            {
              text: `  <Title id="name" color=${colour} />`,
              mark: agentLands > 0 ? "lit" : undefined,
              markIn: agentLands * (1 - span(t, 2.4, 0.4)),
            },
            { text: `  <Clip id="talk" out=${out} />`, mark: handLands > 0 ? "lit" : undefined, markIn: handLands },
            { text: "</Composition>" },
          ]}
        />
      </Panel>
      <div style={{ position: "absolute", left: 1360, top: 380, opacity: span(t, 0.8, 0.4) }}>
        <div style={{ font: `500 22px ${MONO}`, color: GREY, letterSpacing: "0.08em" }}>YOU, ON THE TIMELINE</div>
      </div>
      <Panel x={1360} y={430} w={440} h={200} opacity={span(t, 0.8, 0.4)}>
        <Timeline x={10} y={30} w={410} rows={1} bars={bars} labels={["V1"]} />
      </Panel>
      {t > 1.7 && t < 3.2 ? (
        <Pointer
          x={1360 + 10 + 92 + lerp(0.9, 0.72, drag) * 310 - 14}
          y={520}
          fill={WHITE}
          opacity={1 - span(t, 2.9, 0.3)}
        />
      ) : null}
      <Line text="Both change the same text, with undo." at={2.9} y={880} size={44} center />
    </Frame>
  );
}

// ── 9. The foundation ────────────────────────────────────────────────────────────────────────────────────────────
const ON_TOP = [
  { label: "CUTLEAP", note: "the AI editor", at: 1.3 },
  { label: "YOUR AGENT", note: "edits as code", at: 1.7 },
  { label: "YOUR APP", note: "an editor of your own", at: 2.1 },
];

function Foundation() {
  const t = useT();
  const base = span(t, 0.3, 0.4, (x) => x * x);
  const settle = t > 0.7 ? Math.sin((t - 0.7) * 30) * 6 * (1 - span(t, 0.7, 0.4, (x) => x)) : 0;
  const next = span(t, 2.9, 0.4, backOut);
  return (
    <Frame>
      <Headline text="We started with *the foundation.*" at={3.1} y={100} size={120} />
      {/* The slab: UberScene, dropped in and landing hard. */}
      <div
        style={{
          position: "absolute",
          left: 300,
          top: lerp(-300, 770, base) + settle,
          width: 1320,
          height: 170,
          background: INK,
          boxShadow: `12px 12px 0 ${ACCENT}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
        }}
      >
        <span style={{ font: `800 110px/1 ${DISPLAY}`, color: WHITE }}>UBERSCENE</span>
        <span style={{ font: `500 30px ${MONO}`, color: ACCENT }}>VIDEO AS CODE</span>
      </div>
      {ON_TOP.map((block, i) => {
        const fall = span(t, block.at, 0.35, (x) => x * x);
        const bounce =
          t > block.at + 0.35
            ? Math.sin((t - block.at - 0.35) * 28) * 5 * (1 - span(t, block.at + 0.35, 0.35, (x) => x))
            : 0;
        return (
          <div
            key={block.label}
            style={{
              position: "absolute",
              left: 300 + i * 450,
              top: lerp(-300, 580, fall) + bounce,
              width: 420,
              height: 160,
              background: WHITE,
              border: `4px solid ${INK}`,
              boxSizing: "border-box",
              boxShadow: `10px 10px 0 ${INK}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span style={{ font: `800 64px/1 ${DISPLAY}`, color: INK }}>{block.label}</span>
            <span style={{ font: `500 24px ${MONO}`, color: GREY }}>{block.note}</span>
          </div>
        );
      })}
      {/* Room for what comes next: an outline waiting on top. */}
      <div
        style={{
          position: "absolute",
          left: 750,
          top: 400,
          width: 420,
          height: 150,
          border: `4px dashed ${GREY}`,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          font: `500 26px ${MONO}`,
          color: GREY,
          opacity: next,
          transform: `scale(${lerp(0.85, 1, next)})`,
        }}
      >
        WHAT YOU BUILD NEXT
      </div>
      <Line
        text="Everything we build, and everything you build, stands on one idea: a video is a file."
        at={4.4}
        y={268}
        size={40}
        color={GREY}
      />
    </Frame>
  );
}

// ── 10. The name ─────────────────────────────────────────────────────────────────────────────────────────────────
// The logo's block U, in its own 512-unit square.
const LOGO = "M56 40H164L200 76V340H312V76L348 40H456V380L364 472H148L56 380Z";

function End() {
  const t = useT();
  const draw = span(t, 0.2, 1.0, easeInOut);
  const fill = span(t, 1.0, 0.4);
  const name = span(t, 1.1, 0.5);
  const fade = span(t, useLayer().duration - 0.6, 0.6, (x) => x);
  return (
    <Frame>
      <svg
        width={300}
        height={300}
        viewBox="0 0 512 512"
        style={{ position: "absolute", left: 360, top: 300 }}
        role="img"
      >
        <title>UberScene</title>
        <path
          d={LOGO}
          fill={INK}
          fillOpacity={fill}
          stroke={INK}
          strokeWidth={14}
          strokeDasharray={2400}
          strokeDashoffset={2400 * (1 - draw)}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 730,
          top: 310 + (1 - name) * 30,
          opacity: name,
          font: `800 200px/1 ${DISPLAY}`,
          color: INK,
        }}
      >
        UberScene
      </div>
      <div
        style={{
          position: "absolute",
          left: 736,
          top: 540,
          font: `500 40px ${MONO}`,
          color: ACCENT,
          opacity: span(t, 1.7, 0.4),
        }}
      >
        A whole multimedia pipeline written as code.
      </div>
      <Line text="Open source · MIT · uberscene.prefixtree.xyz" at={2.4} y={800} size={36} center />
      <Line text="This film is one file: examples/founding/video.tsx" at={3.0} y={870} size={28} color={GREY} center />
      <div style={{ position: "absolute", inset: 0, background: PAPER, opacity: fade }} />
    </Frame>
  );
}

export default function Video() {
  return (
    <Composition
      fps={30}
      width={W}
      height={H}
      background={{ type: "color", color: PAPER }}
      theme={{ fonts: { heading: display, body: "Inter", mono } }}
    >
      {/* One layer per beat of the story, back to back. */}
      <Track id="scenes" layout="free">
        <Layer id="evening" start={0} duration={6}>
          <Evening />
        </Layer>
        <Layer id="drag" start={6} duration={4.5}>
          <Drag />
        </Layer>
        <Layer id="flags" start={10.5} duration={4.5}>
          <Flags />
        </Layer>
        <Layer id="code" start={15} duration={5}>
          <Insight />
        </Layer>
        <Layer id="file" start={20} duration={9}>
          <MadeAFile />
        </Layer>
        <Layer id="diff" start={29} duration={4}>
          <Diff />
        </Layer>
        <Layer id="words" start={33} duration={4}>
          <Words />
        </Layer>
        <Layer id="one-file" start={37} duration={4}>
          <OneFile />
        </Layer>
        <Layer id="foundation" start={41} duration={8}>
          <Foundation />
        </Layer>
        <Layer id="end" start={49} duration={6}>
          <End />
        </Layer>
      </Track>

      {/* The bed, made by media/bed.ts: minor while the story is the problem, major with a pulse once the video is a file. */}
      <Track id="music" role="music" layout="free">
        <Audio id="bed" src="asset:bed" start={0} volume={1} />
      </Track>

      {/* A cue on each beat, each hung off its scene, from the shorts' sound synth (examples/shorts/media/sounds.ts). */}
      <Track id="sounds" role="effects" layout="free">
        <Audio id="film-bar" src="asset:pop" anchor="evening" offset={1} volume={0.5} />
        <Audio id="edit-bar" src="asset:riser" anchor="evening" offset={3.3} volume={0.25} />
        <Audio id="to-drag" src="asset:whoosh" anchor="drag" offset={-0.2} volume={0.5} />
        <Audio id="prompt" src="asset:pop" anchor="drag" offset={0.9} volume={0.5} />
        <Audio id="grab" src="asset:click" anchor="drag" offset={2.15} volume={0.7} />
        <Audio id="miss" src="asset:thud" anchor="drag" offset={2.75} volume={0.5} />
        <Audio id="to-flags" src="asset:swish" anchor="flags" offset={-0.1} volume={0.5} />
        <Audio id="error" src="asset:thud" anchor="flags" offset={2.85} volume={0.5} />
        <Audio id="build" src="asset:riser" anchor="code" offset={-0.75} volume={0.35} />
        <Audio id="writing-code" src="asset:thud" anchor="code" offset={1.25} volume={0.8} />
        <Audio id="to-file" src="asset:whoosh" anchor="file" offset={-0.2} volume={0.5} />
        {/* A tick as each line's bar grows, when the line is typed. */}
        <Audio id="bar-intro" src="asset:tick" anchor="file" offset={2.19} volume={0.5} />
        <Audio id="bar-talk" src="asset:tick" anchor="file" offset={2.89} volume={0.5} />
        <Audio id="bar-name" src="asset:tick" anchor="file" offset={3.5} volume={0.5} />
        <Audio id="bar-subs" src="asset:tick" anchor="file" offset={4.35} volume={0.5} />
        <Audio id="bar-music" src="asset:tick" anchor="file" offset={4.99} volume={0.5} />
        <Audio id="to-diff" src="asset:swish" anchor="diff" offset={-0.1} volume={0.5} />
        <Audio id="approve" src="asset:pop" anchor="diff" offset={2.3} volume={0.6} />
        <Audio id="to-words" src="asset:swish" anchor="words" offset={-0.1} volume={0.5} />
        <Audio id="snap" src="asset:click" anchor="words" offset={1.8} volume={0.8} />
        <Audio id="to-one-file" src="asset:swish" anchor="one-file" offset={-0.1} volume={0.5} />
        <Audio id="agent-edit" src="asset:tick" anchor="one-file" offset={1.4} volume={0.6} />
        <Audio id="hand-edit" src="asset:tick" anchor="one-file" offset={2.7} volume={0.6} />
        <Audio id="slab" src="asset:thud" anchor="foundation" offset={0.7} volume={0.9} />
        <Audio id="block-cutleap" src="asset:thud" anchor="foundation" offset={1.65} volume={0.6} />
        <Audio id="block-agent" src="asset:thud" anchor="foundation" offset={2.05} volume={0.6} />
        <Audio id="block-app" src="asset:thud" anchor="foundation" offset={2.45} volume={0.6} />
        <Audio id="to-end" src="asset:whoosh" anchor="end" offset={-0.2} volume={0.5} />
        <Audio id="name" src="asset:chime" anchor="end" offset={1.1} volume={0.6} />
      </Track>
    </Composition>
  );
}

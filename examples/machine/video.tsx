// A music machine: 36 seconds, 9:16, drawn in code. Each voice of the score (score.ts) has a lane, and each of its
// notes is a block that falls down the lane and reaches the strike line on the moment it sounds, where it bursts and
// its pad lights. A chord is as long as it is held and names itself; the bass and the lead sit left or right in their
// lanes by pitch. The notes are the ones Strudel rendered (notes.ts, written with the song by scripts/music.ts), so
// picture and sound share one clock.
//
// A lane is a Layer; it lights two seconds before its voice plays, as the first note comes into view, and goes dark
// when the voice stops. Inside it everything is computed from the time alone.
import type { ReactNode } from "react";

import { Audio, Composition, googleFont, Layer, stepAt, Title, Track, useLayer } from "@uberscene/kit";

import { NOTES } from "./notes";
import { CHORDS } from "./score";

const W = 1080;
const H = 1920;
const display = googleFont("Inter Tight", { weights: [800] });
const mono = googleFont("JetBrains Mono", { weights: [500, 700] });
const MONO = `"JetBrains Mono", ui-monospace, monospace`;

const C = {
  bg: "#0a0c11",
  grid: "#161a26",
  pad: "#1b2030",
  dim: "#7d8597",
  text: "#d6deeb",
  kick: "#ff6b35",
  snare: "#7df9ff",
  hats: "#f2f5fa",
  bass: "#a78bfa",
  chords: "#ffc400",
  lead: "#5eead4",
};

/** Seconds a beat lasts at 120 BPM; a bar is four. */
const BEAT = 0.5;
/** The film's length in beats: 18 bars, and two for the last chord. */
const BEATS = 80;

// The strike line and the pads under it sit inside TikTok's safe area (240 to 1260 down, 120 to 960 across); the
// lanes run from the top of the frame, and below the pads there is only their light.
const LINE = 1150;
const PAD = 90;
const LEFT = 120;
const LANE = 140;
/** A block falls this many pixels a second: it comes in at the top two seconds before it sounds. */
const SPEED = LINE / 2;

interface Note {
  readonly time: number;
  /** Seconds it is held, for a note drawn as long as it sounds. */
  readonly length?: number;
  /** Where it sits across its lane, -1 left to 1 right: its pitch. */
  readonly across?: number;
  /** 0 to 1: how loud, for a note drawn fainter when it is quiet. */
  readonly level?: number;
  /** A name written on it. */
  readonly name?: string;
}
interface Voice {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  /** A block's height, when it is not as long as its note. */
  readonly height: number;
  readonly notes: readonly Note[];
}

/** A note as it is read: `db2` is D♭2. */
const noteName = (note: string): string => `${note[0]?.toUpperCase()}${note.slice(1).replace("b", "♭")}`;
/** The first note of each bar carries the name: the chord and the bass root change a bar at a time. */
const firstOfBar = (time: number, list: readonly { readonly time: number }[], i: number): boolean =>
  i === 0 || Math.floor(time / 2) !== Math.floor((list[i - 1] as { time: number }).time / 2);

/** Where each of a voice's notes sits across its lane: its lowest note at the left, its highest at the right. */
const acrossOf = (list: readonly { readonly midi: number }[]): ((midi: number) => number) => {
  const low = Math.min(...list.map((n) => n.midi));
  const high = Math.max(...list.map((n) => n.midi));
  return (midi) => ((midi - low) / (high - low)) * 2 - 1;
};
const bassAcross = acrossOf(NOTES.bass);
const leadAcross = acrossOf(NOTES.lead);

const VOICES: readonly Voice[] = [
  { id: "kick", label: "KICK", color: C.kick, height: 56, notes: NOTES.kick.map((time) => ({ time })) },
  { id: "snare", label: "SNARE", color: C.snare, height: 56, notes: NOTES.snare.map((time) => ({ time })) },
  { id: "hats", label: "HATS", color: C.hats, height: 28, notes: NOTES.hats },
  {
    id: "bass",
    label: "BASS",
    color: C.bass,
    height: 52,
    notes: NOTES.bass.map((n, i) => ({
      time: n.time,
      across: bassAcross(n.midi),
      ...(firstOfBar(n.time, NOTES.bass, i) ? { name: noteName(n.note) } : {}),
    })),
  },
  {
    id: "chords",
    label: "CHORD",
    color: C.chords,
    height: 0,
    notes: NOTES.chords.map((n, i) => ({
      time: n.time,
      length: n.length,
      ...(firstOfBar(n.time, NOTES.chords, i) ? { name: CHORDS[n.chord] as string } : {}),
    })),
  },
  {
    id: "lead",
    label: "LEAD",
    color: C.lead,
    height: 52,
    notes: NOTES.lead.map((n) => ({ time: n.time, across: leadAcross(n.midi), level: n.level })),
  },
];

const laneX = (lane: number): number => LEFT + lane * LANE;

// ── Time ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** 0 to 1 over `d` seconds, fast then slow. */
const settle = (s: number, d: number): number => 1 - (1 - Math.min(1, Math.max(0, s / d))) ** 3;
/** The last note that has sounded by `t`, if one has. */
const lastNote = (voice: Voice, times: readonly number[], t: number): Note | undefined => voice.notes[stepAt(times, t)];
/** The frame jumps on the kick: a few pixels, gone in a tenth of a second. */
const shake = (t: number): number => {
  const i = stepAt(NOTES.kick, t);
  return i < 0 ? 0 : -7 * Math.exp(-(t - (NOTES.kick[i] as number)) / 0.07);
};
/** A number in 0 to 1 fixed by its keys, for a spark's direction. */
const fixed = (a: number, b: number): number => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** A drawing over the whole frame, as an SVG, moved by the kick. */
function Stage({ t, children }: { t: number; children: ReactNode }) {
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${shake(t)}px)` }}
    >
      <title>lane</title>
      {children}
    </svg>
  );
}
const glow = (color: string, amount: number): { filter: string } => ({
  filter: `drop-shadow(0 0 ${6 + 30 * amount}px ${color})`,
});

/** A pad: the lane's name under the strike line, lit by `lit` (0 to 1). */
function Pad({ lane, voice, lit }: { lane: number; voice: Voice; lit: number }) {
  const x = laneX(lane);
  return (
    <g>
      <rect x={x + 8} y={LINE} width={LANE - 16} height={PAD} rx={16} fill={C.pad} />
      <rect
        x={x + 8}
        y={LINE}
        width={LANE - 16}
        height={PAD}
        rx={16}
        fill={voice.color}
        opacity={lit}
        style={lit > 0.5 ? glow(voice.color, lit - 0.5) : undefined}
      />
      <text
        data-name={`pad-${voice.id}`}
        x={x + LANE / 2}
        y={LINE + 56}
        textAnchor="middle"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={30}
        fill={lit > 0.4 ? C.bg : C.dim}
      >
        {voice.label}
      </text>
    </g>
  );
}

/** One voice's lane, lit: its notes falling to the line, the burst as each sounds, and its pad. */
function Lane({ lane }: { lane: number }) {
  const { time: t } = useLayer();
  const voice = VOICES[lane] as Voice;
  const times = voice.notes.map((n) => n.time);
  const x = laneX(lane);
  const mid = x + LANE / 2;
  const last = lastNote(voice, times, t);
  const s = last ? t - last.time : Number.POSITIVE_INFINITY;
  // A held note keeps its lane lit for as long as it sounds.
  const held = last?.length !== undefined && s < last.length ? 0.6 : 0;
  const hit = Math.max(held, Math.exp(-s / 0.1) * (last?.level ?? 1));
  // Lit while it plays: from two seconds before a note, as the note comes into view, until a second after its last.
  const next = voice.notes[stepAt(times, t) + 1];
  const ended = last ? t - last.time - (last.length ?? 0) : Number.POSITIVE_INFINITY;
  const power = Math.max(1 - settle(ended - 1, 0.5), next ? 1 - settle(next.time - t - 2, 0.3) : 0);
  return (
    <Stage t={t}>
      <rect x={x + 8} y={0} width={LANE - 16} height={LINE} fill={voice.color} opacity={(0.05 + 0.12 * hit) * power} />
      {voice.notes.map((note) => {
        const bottom = LINE - (note.time - t) * SPEED;
        const height = note.length === undefined ? voice.height : Math.max(40, note.length * SPEED - 10);
        // Above the frame still, or (a short note) already sounded, or (a held one) all through the line.
        if (bottom < 0 || (note.length === undefined ? bottom > LINE : bottom - height > LINE)) return null;
        const width = note.across === undefined ? LANE - 36 : 68;
        const left = mid - width / 2 + (note.across ?? 0) * ((LANE - 36 - width) / 2);
        const top = bottom - height;
        const sounding = bottom > LINE;
        return (
          <g key={`${note.time} ${note.across ?? 0}`}>
            <rect
              x={left}
              y={top}
              width={width}
              height={Math.min(bottom, LINE) - top}
              rx={Math.min(14, height / 2)}
              fill={sounding ? "#ffffff" : voice.color}
              opacity={0.35 + 0.65 * (note.level ?? 1)}
            />
            {note.name && top + 46 < LINE && (
              <text
                data-name={`${voice.id}-name`}
                x={left + width / 2}
                y={top + (height > 60 ? 46 : height / 2 + 11)}
                textAnchor="middle"
                fontFamily={MONO}
                fontWeight={700}
                fontSize={height > 60 ? 36 : 30}
                fill={C.bg}
              >
                {note.name}
              </text>
            )}
          </g>
        );
      })}
      {/* The burst: the block flattens along the line, a ring opens from the pad, sparks fly up. */}
      {last && s < 0.35 && last.length === undefined && (
        <g opacity={last.level ?? 1}>
          <rect
            x={mid - 52 - 60 * settle(s, 0.2)}
            y={LINE - 14 * (1 - settle(s, 0.2)) - 3}
            width={104 + 120 * settle(s, 0.2)}
            height={6 + 28 * (1 - settle(s, 0.2))}
            rx={8}
            fill="#ffffff"
            opacity={1 - s / 0.35}
          />
          {voice.height > 40 && (
            <circle
              cx={mid}
              cy={LINE}
              r={40 + 260 * settle(s, 0.35)}
              fill="none"
              stroke={voice.color}
              strokeWidth={5}
              opacity={0.8 * (1 - s / 0.35)}
            />
          )}
          {voice.height > 40 &&
            [0, 1, 2, 3, 4, 5, 6].map((n) => {
              const angle = -Math.PI / 2 + (fixed(last.time, n) - 0.5) * 2.2;
              const far = (120 + 220 * fixed(n, last.time)) * settle(s, 0.35);
              return (
                <circle
                  key={n}
                  cx={mid + Math.cos(angle) * far}
                  cy={LINE + Math.sin(angle) * far}
                  r={7 * (1 - s / 0.35)}
                  fill={n % 2 ? "#ffffff" : voice.color}
                />
              );
            })}
        </g>
      )}
      <Pad lane={lane} voice={voice} lit={(0.25 + 0.75 * hit) * power} />
      {/* The pad's light on the floor under it. */}
      <rect
        x={x + 8}
        y={LINE + PAD + 14}
        width={LANE - 16}
        height={520}
        fill={`url(#fall-${voice.id})`}
        opacity={hit * power}
      />
      <defs>
        <linearGradient id={`fall-${voice.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={voice.color} stopOpacity={0.7} />
          <stop offset="1" stopColor={voice.color} stopOpacity={0} />
        </linearGradient>
      </defs>
    </Stage>
  );
}

/**
 * What is there from the first frame: the lanes unlit, the beats as lines falling at the notes' speed (a bar's first
 * heavier), the strike line, the pads waiting for their voices, and a cell for each bar under them.
 */
function Ground() {
  const { time: t } = useLayer();
  const beat = t / BEAT;
  const bar = Math.floor(beat / 4);
  const onBeat = Math.exp(-((t % BEAT) / 0.12));
  const first = Math.ceil(beat);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, background: C.bg }}>
      <Stage t={t}>
        {VOICES.map((voice, lane) => (
          <rect key={voice.id} x={laneX(lane) + 8} y={0} width={LANE - 16} height={LINE} fill={C.grid} opacity={0.6} />
        ))}
        {[0, 1, 2, 3, 4].map((n) => {
          const y = LINE - (first + n - beat) * BEAT * SPEED;
          const heavy = (first + n) % 4 === 0;
          return first + n > BEATS - 8 ? null : (
            <rect
              key={first + n}
              x={LEFT}
              y={y - (heavy ? 2 : 1)}
              width={6 * LANE}
              height={heavy ? 4 : 2}
              fill="#ffffff"
              opacity={heavy ? 0.22 : 0.08}
            />
          );
        })}
        <rect
          x={LEFT - 20}
          y={LINE - 4}
          width={6 * LANE + 40}
          height={8}
          rx={4}
          fill="#ffffff"
          opacity={0.75 + 0.25 * onBeat}
        />
        {Array.from({ length: 18 }, (_, n) => (
          <rect
            key={n}
            x={LEFT + 8 + n * 46}
            y={LINE + PAD + 40}
            width={n % 4 === 1 ? 30 : 36}
            height={14}
            rx={5}
            fill="#ffffff"
            opacity={bar > 17 ? 0.4 : n < bar ? 0.4 : n === bar ? 0.6 + 0.4 * onBeat : 0.08}
          />
        ))}
      </Stage>
    </div>
  );
}

/** A flash of white, on the drop and on the last hit. */
function Flash() {
  const { elapsed } = useLayer();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        background: "#ffffff",
        opacity: 0.5 * Math.exp(-elapsed / 0.12),
      }}
    />
  );
}

/** A dark halo under the words, so they read over the falling notes. */
const HALO = { color: "rgba(10, 12, 17, 0.95)", blur: 26, y: 0 };

/** The section's name, small, at the top left: what the machine is doing. */
const SECTIONS = [
  { id: "open", beat: 0, beats: 8, text: "DROP" },
  { id: "power-up", beat: 8, beats: 16, text: "POWER UP" },
  { id: "build", beat: 24, beats: 16, text: "BUILD" },
  { id: "drop", beat: 40, beats: 16, text: "DROP" },
  { id: "power-down", beat: 56, beats: 16, text: "POWER DOWN" },
] as const;

export default function Video() {
  const until = (beat: number): number => (BEATS - beat) * BEAT;
  return (
    <Composition fps={30} width={W} height={H} background={{ type: "color", color: C.bg }}>
      <Track id="music" layout="free" role="music">
        <Audio id="song" src="asset:song" start={0} in="beat:0" out={`beat:${BEATS - 1}.end`} />
      </Track>

      <Track id="machine" layout="free">
        <Layer id="ground" anchor="song" at="beat:0" duration={until(0)} ground>
          <Ground />
        </Layer>
        {VOICES.map((voice, lane) => (
          <Layer key={voice.id} id={voice.id} anchor="song" at="beat:0" duration={until(0)} ground>
            <Lane lane={lane} />
          </Layer>
        ))}
        <Layer id="drop-flash" anchor="song" at="beat:40" duration={1} ground>
          <Flash />
        </Layer>
        <Layer id="end-flash" anchor="song" at="beat:72" duration={1} ground>
          <Flash />
        </Layer>
      </Track>

      <Track id="words" layout="free">
        {SECTIONS.map((section) => (
          <Title
            key={section.id}
            id={section.id}
            anchor="song"
            at={`beat:${section.beat}`}
            duration={section.beats * BEAT}
            style={{ font: mono, size: 40, weight: 700, color: C.text, align: "left", shadow: HALO }}
            box={{ x: 160, y: 270, width: 600, height: 56, origin: "topLeft" }}
            enter={{ type: "fade", duration: 0.15 }}
          >
            {section.text}
          </Title>
        ))}
        <Title
          id="end"
          anchor="song"
          at="beat:72"
          duration={until(72)}
          style={{
            font: display,
            size: 104,
            weight: 800,
            color: "#ffffff",
            align: "center",
            shadow: HALO,
          }}
          box={{ x: W / 2, y: 640, width: 840, height: 380, origin: "center" }}
          enter={{ type: "fade", duration: 0.3 }}
        >
          {"Every block\nis a note.\nAll code."}
        </Title>
      </Track>
    </Composition>
  );
}

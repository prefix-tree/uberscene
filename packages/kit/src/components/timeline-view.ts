import { z } from "zod";

import { Layer } from "../jsx/elements";
import { useLayer } from "../jsx/use-t";
import { h, parse, timing, timingOf, timingSchema } from "./shared";

const clipSchema = z.object({
  id: z.string(),
  kind: z.string(),
  from: z.number(),
  to: z.number(),
  label: z.string(),
  /** What it plays, as a person would name the file. */
  title: z.string().optional(),
  /** Seconds it fades in and out over: drawn as ramps at its ends. */
  fade: z.object({ in: z.number().min(0), out: z.number().min(0) }).optional(),
  /** A sound's level, 0 to 1, at even steps across the clip. */
  level: z.array(z.number()).optional(),
  /** A picture clip's frames, as image addresses (data URLs), tiled along it like an editor's thumbnails. */
  thumbs: z.array(z.string()).optional(),
});
const laneSchema = z.object({
  id: z.string(),
  track: z.string().optional(),
  role: z.string(),
  kind: z.enum(["picture", "sound"]),
  clips: z.array(clipSchema),
});
const markerSchema = z.object({ time: z.number(), label: z.string(), color: z.string().optional() });

const COLORS = {
  ground: "#1b1e25",
  lane: "#22262e",
  picture: "#1f7a7f",
  sound: "#2d8a52",
  wave: "#a9f2c0",
  waveLit: "#e9fff0",
  text: "#e8f5ec",
  playhead: "#ff3b30",
  active: "#ff8a3d",
  marker: "#b06bd0",
};

export const timelineViewSchema = timingSchema.extend({
  /** The component's id; its layer's id starts with it. */
  id: z.string(),
  /** The film's lanes, as `timelineLanes()` of `@uberscene/sdk` returns them for its resolved timeline. */
  lanes: z.array(laneSchema),
  /** The film's length in seconds. */
  length: z.number().positive(),
  /** Marks above the lanes, as an editor's ruler shows them: the film's markers, or moments chosen to point at. */
  markers: z.array(markerSchema).default([]),
  /** The timeline's top left, in pixels from the frame's top left. */
  box: z.object({ x: z.number(), y: z.number() }).default({ x: 60, y: 1060 }),
  /** The timeline's width in pixels: the film's length (or the window) across it. */
  width: z.number().positive().default(960),
  /** The timeline's height in pixels: the strip of markers on top, then the lanes. */
  height: z.number().positive().default(720),
  /** The film's second at which the layer starts: the playhead is there, then moves with the layer's clock. */
  from: z.number().min(0).default(0),
  /** Seconds across the view. Left out: the whole film, the playhead sweeping once. With it, the view scrolls. */
  window: z.number().positive().optional(),
  /** Write each clip's name on it: its element id, and what it plays. */
  labels: z.boolean().default(true),
  /** Number the seconds in the strip on top. */
  ruler: z.boolean().default(true),
  /**
   * Draw it as a ground, as a background is: the layout check does not hold it to the safe zone. For a post whose
   * timeline runs under the app's own buttons and caption, as an editor's screen in a phone video does.
   */
  ground: z.boolean().default(false),
  /** The colours of the ground, lanes, picture and sound clips, waveforms, names, playhead, the clip in play, markers. */
  colors: z
    .object({
      ground: z.string().default(COLORS.ground),
      lane: z.string().default(COLORS.lane),
      picture: z.string().default(COLORS.picture),
      sound: z.string().default(COLORS.sound),
      wave: z.string().default(COLORS.wave),
      waveLit: z.string().default(COLORS.waveLit),
      text: z.string().default(COLORS.text),
      playhead: z.string().default(COLORS.playhead),
      active: z.string().default(COLORS.active),
      marker: z.string().default(COLORS.marker),
    })
    .default(COLORS),
});

type View = z.infer<typeof timelineViewSchema>;
type Clip = z.infer<typeof clipSchema>;

/** A sound's level as thin vertical strokes about the middle of a band `w` by `height`, as editors draw waveforms. */
function waveStrokes(level: readonly number[], w: number, height: number): string {
  if (level.length === 0 || w <= 0) return "";
  const mid = height / 2;
  // A stroke every 1.5 px. A long sound's values are taken at their peaks, as a zoomed-out editor shows them; a short
  // list of values is read between its points, so a few values still draw a full waveform.
  const count = Math.max(1, Math.floor(w / 1.5));
  const per = level.length / count;
  const step = w / count;
  let d = "";
  for (let i = 0; i < count; i++) {
    let peak = 0;
    if (per >= 1) {
      for (let k = Math.floor(i * per); k < Math.floor((i + 1) * per); k++) peak = Math.max(peak, level[k] ?? 0);
    } else {
      const at = (i + 0.5) * per - 0.5;
      const a = Math.max(0, Math.floor(at));
      const b = Math.min(level.length - 1, a + 1);
      const f = Math.min(1, Math.max(0, at - a));
      peak = (level[a] ?? 0) * (1 - f) + (level[b] ?? 0) * f;
    }
    const half = Math.max(0.5, (peak * height) / 2);
    const x = (i + 0.5) * step;
    d += `M${x.toFixed(1)} ${(mid - half).toFixed(1)}V${(mid + half).toFixed(1)}`;
  }
  return d;
}

/** One clip: its block, its frames or its waveform, its fades, its name. */
function ClipBlock(props: {
  clip: Clip;
  kind: "picture" | "sound";
  left: number;
  width: number;
  height: number;
  playing: boolean;
  pxPerSecond: number;
  view: Omit<View, keyof z.infer<typeof timingSchema>>;
}) {
  const { clip, kind, left, width: w, height: hgt, playing, pxPerSecond, view } = props;
  const { colors } = view;
  const band = view.labels ? Math.max(12, Math.min(18, hgt * 0.3)) : 0;
  const body = hgt - band;
  const font = Math.max(9, Math.min(13, band * 0.72));
  const fadeIn = (clip.fade?.in ?? 0) * pxPerSecond;
  const fadeOut = (clip.fade?.out ?? 0) * pxPerSecond;
  const thumbs = clip.thumbs ?? [];
  // Frames at the height of the body, as many as fit, each the frame for its place along the clip.
  const thumbW = body * (16 / 9);
  const tiles = thumbs.length > 0 ? Math.max(1, Math.ceil(w / thumbW)) : 0;
  return h(
    "div",
    {
      style: {
        position: "absolute",
        left,
        top: 0,
        width: w,
        height: hgt,
        background: kind === "sound" ? colors.sound : colors.picture,
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: playing
          ? `inset 0 0 0 2px ${kind === "picture" ? colors.active : colors.waveLit}`
          : "inset 0 0 0 1px rgba(0,0,0,0.35)",
      },
    },
    ...Array.from({ length: tiles }, (_, i) =>
      h("img", {
        key: `t${i}`,
        src: thumbs[Math.min(thumbs.length - 1, Math.floor((i / tiles) * thumbs.length))],
        style: {
          position: "absolute",
          left: i * thumbW,
          top: 0,
          width: thumbW - 1,
          height: body,
          objectFit: "cover",
          opacity: 0.92,
        },
      }),
    ),
    clip.level && body > 4
      ? h(
          "svg",
          { width: w, height: body, viewBox: `0 0 ${w} ${body}`, style: { position: "absolute", left: 0, top: 0 } },
          h("path", {
            d: waveStrokes(clip.level, w, body * 0.86),
            transform: `translate(0 ${(body * 0.07).toFixed(1)})`,
            stroke: playing ? colors.waveLit : colors.wave,
            strokeWidth: 1,
            fill: "none",
          }),
        )
      : null,
    fadeIn > 1 || fadeOut > 1
      ? h(
          "svg",
          { width: w, height: hgt, viewBox: `0 0 ${w} ${hgt}`, style: { position: "absolute", left: 0, top: 0 } },
          fadeIn > 1 ? h("path", { d: `M0 0H${fadeIn.toFixed(1)}L0 ${hgt}Z`, fill: "rgba(0,0,0,0.38)" }) : null,
          fadeOut > 1
            ? h("path", { d: `M${w} 0H${(w - fadeOut).toFixed(1)}L${w} ${hgt}Z`, fill: "rgba(0,0,0,0.38)" })
            : null,
        )
      : null,
    band > 0 && w > 18
      ? h(
          "div",
          {
            style: {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: band,
              padding: "0 5px",
              background: "rgba(0,0,0,0.22)",
              color: colors.text,
              fontSize: font,
              lineHeight: `${band}px`,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            },
          },
          `${kind === "sound" ? "◖ " : "▸ "}${clip.label}${clip.title && clip.title !== clip.label ? ` · ${clip.title}` : ""}`,
        )
      : null,
  );
}

/** The picture itself, drawn each frame inside the view's layer: markers, lanes, clips, waveforms, names, the playhead. */
export function TimelineViewPicture(props: Omit<View, keyof z.infer<typeof timingSchema>>) {
  const { elapsed } = useLayer();
  const view = props;
  const { lanes, length, box, width, height, colors } = view;
  const now = props.from + elapsed;
  const span = props.window ?? length;
  // A scrolling view keeps the playhead at a third of the way across.
  const start = props.window === undefined ? 0 : Math.min(Math.max(0, now - span / 3), Math.max(0, length - span));
  const pxPerSecond = width / span;
  const x = (t: number) => (t - start) * pxPerSecond;
  const strip = 30;
  const gap = 3;
  // Picture lanes are lower than sound lanes, as in an editor; together they fill the height, within limits.
  const weight = (kind: "picture" | "sound") => (kind === "picture" ? 0.8 : 1);
  const total = lanes.reduce((s, l) => s + weight(l.kind), 0);
  const unit = Math.max(16, Math.min(120, (height - strip - gap * lanes.length) / Math.max(1, total)));
  const every = span <= 10 ? 1 : 5;
  const ticks: number[] = [];
  for (let s = Math.ceil(start); s <= start + span; s++) ticks.push(s);
  let top = strip;
  return h(
    "div",
    {
      style: {
        position: "absolute",
        left: box.x,
        top: box.y,
        width,
        height,
        overflow: "hidden",
        background: colors.ground,
        borderRadius: 8,
        fontFamily: "var(--us-mono, 'JetBrains Mono'), ui-monospace, monospace",
      },
    },
    // The strip on top: a tick a second, numbered when asked, and the markers.
    ...ticks.map((s) =>
      h(
        "div",
        {
          key: `tick-${s}`,
          style: {
            position: "absolute",
            left: x(s),
            top: s % every === 0 ? strip - 12 : strip - 6,
            width: 1,
            height: s % every === 0 ? 12 : 6,
            background: colors.text,
            opacity: 0.3,
          },
        },
        view.ruler && s % every === 0
          ? h(
              "span",
              { style: { position: "absolute", left: 4, top: -11, fontSize: 11, color: colors.text, opacity: 0.6 } },
              `${s}s`,
            )
          : null,
      ),
    ),
    ...view.markers
      .filter((m) => m.time >= start && m.time <= start + span)
      .map((m, i) =>
        h("div", {
          key: `marker-${i}`,
          "data-name": `marker-${m.label}`,
          style: {
            position: "absolute",
            left: x(m.time) - 3,
            top: 4,
            width: 6,
            height: strip - 8,
            borderRadius: 2,
            background: m.color ?? colors.marker,
          },
        }),
      ),
    ...lanes.map((lane) => {
      const laneH = unit * weight(lane.kind);
      const laneTop = top;
      top += laneH + gap;
      return h(
        "div",
        {
          key: lane.id,
          "data-name": `lane-${lane.id}`,
          style: { position: "absolute", left: 0, top: laneTop, width, height: laneH, background: colors.lane },
        },
        ...lane.clips
          .filter((c) => c.to > start && c.from < start + span)
          .map((c) =>
            h(ClipBlock, {
              key: c.id,
              clip: c,
              kind: lane.kind,
              left: x(c.from),
              width: Math.max(2, x(c.to) - x(c.from) - 1),
              height: laneH,
              playing: now >= c.from && now < c.to,
              pxPerSecond,
              view,
            }),
          ),
      );
    }),
    // The playhead: a thin line from a small head in the strip down through the lanes.
    h("div", {
      "data-name": "playhead",
      style: {
        position: "absolute",
        left: x(now) - 0.75,
        top: 6,
        width: 1.5,
        height: height - 6,
        background: colors.playhead,
      },
    }),
    h("div", {
      style: {
        position: "absolute",
        left: x(now) - 5,
        top: 2,
        width: 10,
        height: 8,
        background: colors.playhead,
        clipPath: "polygon(0 0, 100% 0, 50% 100%)",
      },
    }),
  );
}

/**
 * A film's timeline drawn as an editor shows it: a lane for each track, its clips as blocks with their names (and a
 * picture clip's frames), each sound's waveform, fades, markers, and a playhead that moves with the clock. The lanes
 * come from the film's own resolved timeline (`timelineLanes()` of `@uberscene/sdk`), so every block on screen is an
 * element of the film's file.
 */
export function TimelineView(props: z.input<typeof timelineViewSchema>) {
  const p = parse("TimelineView", timelineViewSchema, props);
  const t = timingOf(p);
  const { start: _s, anchor: _a, at: _at, offset: _o, duration: _d, id, ...view } = p;
  return [
    h(
      Layer,
      { id: `${id}-picture`, ...timing(t), ...(view.ground ? { ground: true } : {}) },
      h(TimelineViewPicture, { ...view, id }),
    ),
  ];
}

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
  level: z.array(z.number()).optional(),
});
const laneSchema = z.object({
  id: z.string(),
  track: z.string().optional(),
  role: z.string(),
  kind: z.enum(["picture", "sound"]),
  clips: z.array(clipSchema),
});

export const timelineViewSchema = timingSchema.extend({
  /** The component's id; its layer's id starts with it. */
  id: z.string(),
  /** The film's lanes, as `timelineLanes()` of `@uberscene/sdk` returns them for its resolved timeline. */
  lanes: z.array(laneSchema),
  /** The film's length in seconds. */
  length: z.number().positive(),
  /** The timeline's top left, in pixels from the frame's top left. */
  box: z.object({ x: z.number(), y: z.number() }).default({ x: 60, y: 1060 }),
  /** The timeline's width in pixels: the film's length (or the window) across it. */
  width: z.number().positive().default(960),
  /** The timeline's height in pixels, shared by its lanes under a ruler. */
  height: z.number().positive().default(720),
  /** The film's second at which the layer starts: the playhead is there, then moves with the layer's clock. */
  from: z.number().min(0).default(0),
  /** Seconds across the view. Left out: the whole film, the playhead sweeping once. With it, the view scrolls. */
  window: z.number().positive().optional(),
  /** Write each clip's name on it. */
  labels: z.boolean().default(true),
  /** The colours of the ground, the lanes, picture and sound clips, the waveforms, the names and the playhead. */
  colors: z
    .object({
      ground: z.string().default("#1c1f26"),
      lane: z.string().default("#252932"),
      picture: z.string().default("#2b7a80"),
      sound: z.string().default("#2f8a55"),
      wave: z.string().default("#9ff0b8"),
      text: z.string().default("#e8f5ec"),
      playhead: z.string().default("#ff3b30"),
    })
    .default({
      ground: "#1c1f26",
      lane: "#252932",
      picture: "#2b7a80",
      sound: "#2f8a55",
      wave: "#9ff0b8",
      text: "#e8f5ec",
      playhead: "#ff3b30",
    }),
});

type View = z.infer<typeof timelineViewSchema>;

/** A sound's level as a filled shape, mirrored about its middle, `w` by `h` pixels. */
function wavePath(level: readonly number[], w: number, height: number): string {
  if (level.length === 0) return "";
  const mid = height / 2;
  const step = w / level.length;
  const top = level.map((l, i) => `${(i * step + step / 2).toFixed(1)},${(mid - (l * height) / 2).toFixed(1)}`);
  const bottom = level
    .map((l, i) => `${(i * step + step / 2).toFixed(1)},${(mid + (l * height) / 2).toFixed(1)}`)
    .reverse();
  return `M0,${mid} L${top.join(" L")} L${w},${mid} L${bottom.join(" L")} Z`;
}

/** The picture itself, drawn each frame inside the view's layer: lanes, clips, waveforms, names, the playhead. */
export function TimelineViewPicture(props: Omit<View, keyof z.infer<typeof timingSchema>>) {
  const { elapsed } = useLayer();
  const { lanes, length, box, width, height, colors, labels } = props;
  const now = props.from + elapsed;
  const span = props.window ?? length;
  // A scrolling view keeps the playhead at a third of the way across.
  const start = props.window === undefined ? 0 : Math.min(Math.max(0, now - span / 3), Math.max(0, length - span));
  const x = (t: number) => ((t - start) / span) * width;
  const ruler = 28;
  const gap = 6;
  const laneH = Math.max(18, (height - ruler - gap * lanes.length) / Math.max(1, lanes.length));
  const font = Math.max(10, Math.min(18, laneH * 0.28));
  // A number on every second of a short view, on every fifth of a long one.
  const every = span <= 10 ? 1 : 5;
  const ticks: number[] = [];
  for (let s = Math.ceil(start); s <= start + span; s++) ticks.push(s);
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
        borderRadius: 10,
        fontFamily: "var(--us-mono, 'JetBrains Mono'), ui-monospace, monospace",
      },
    },
    // The ruler: a tick each second, a number each five.
    ...ticks.map((s) =>
      h(
        "div",
        {
          key: `tick-${s}`,
          style: {
            position: "absolute",
            left: x(s),
            top: s % every === 0 ? 4 : 14,
            width: 1,
            height: s % every === 0 ? ruler - 6 : ruler - 16,
            background: colors.text,
            opacity: 0.35,
          },
        },
        s % every === 0
          ? h("span", { style: { position: "absolute", left: 4, top: -2, fontSize: 12, color: colors.text } }, `${s}s`)
          : null,
      ),
    ),
    ...lanes.map((lane, i) => {
      const top = ruler + i * (laneH + gap);
      return h(
        "div",
        {
          key: lane.id,
          "data-name": `lane-${lane.id}`,
          style: { position: "absolute", left: 0, top, width, height: laneH, background: colors.lane },
        },
        ...lane.clips
          .filter((c) => c.to > start && c.from < start + span)
          .map((c) => {
            const left = x(c.from);
            const w = Math.max(2, x(c.to) - left - 2);
            const fill = lane.kind === "sound" ? colors.sound : colors.picture;
            const playing = now >= c.from && now < c.to;
            return h(
              "div",
              {
                key: c.id,
                style: {
                  position: "absolute",
                  left,
                  top: 2,
                  width: w,
                  height: laneH - 4,
                  background: fill,
                  borderRadius: 4,
                  overflow: "hidden",
                  outline: playing ? `2px solid ${colors.wave}` : "none",
                  outlineOffset: -2,
                },
              },
              c.level
                ? h(
                    "svg",
                    {
                      width: w,
                      height: laneH - 4,
                      viewBox: `0 0 ${w} ${laneH - 4}`,
                      style: { position: "absolute", left: 0, top: 0 },
                    },
                    h("path", {
                      d: wavePath(c.level, w, (laneH - 4) * (labels ? 0.72 : 0.92)),
                      fill: colors.wave,
                      opacity: 0.9,
                    }),
                  )
                : null,
              labels && w > font * 2
                ? h(
                    "div",
                    {
                      style: {
                        position: "absolute",
                        left: 6,
                        bottom: 2,
                        right: 4,
                        fontSize: font,
                        lineHeight: 1.1,
                        color: colors.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      },
                    },
                    c.label,
                  )
                : null,
            );
          }),
      );
    }),
    // The playhead.
    h("div", {
      "data-name": "playhead",
      style: {
        position: "absolute",
        left: x(now) - 1.5,
        top: 0,
        width: 3,
        height,
        background: colors.playhead,
        boxShadow: `0 0 8px ${colors.playhead}`,
      },
    }),
  );
}

/**
 * A film's timeline drawn as an editor shows it: a lane for each track, its clips as blocks with their names, each
 * sound's waveform, and a playhead that moves with the clock. The lanes come from the film's own resolved timeline
 * (`timelineLanes()` of `@uberscene/sdk`), so every block on screen is an element of the film's file.
 */
export function TimelineView(props: z.input<typeof timelineViewSchema>) {
  const p = parse("TimelineView", timelineViewSchema, props);
  const t = timingOf(p);
  const { start: _s, anchor: _a, at: _at, offset: _o, duration: _d, id, ...view } = p;
  return [h(Layer, { id: `${id}-picture`, ...timing(t) }, h(TimelineViewPicture, { ...view, id }))];
}

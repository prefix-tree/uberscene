/** @jsxRuntime automatic */
/** @jsxImportSource react */

import type { CSSProperties, ReactNode } from "react";

import { fontFamily } from "@uberscene/kit";
import { TEXT_ANIMATION_TYPES, type TextRun, type TitleProps, themedRuns, titleWords } from "@uberscene/kit/schema";
import { lengthSeconds, secondsSinceStart } from "@uberscene/sdk/resolver";

import { devWarn } from "../../warn";
import type { ElementPropsOf } from "../dom-drawing";

type Animation = NonNullable<TitleProps["animation"]>;

const SUPPORTED: ReadonlySet<string> = new Set(TEXT_ANIMATION_TYPES);

/** Text title: the file's text content in its `style`; entrance/exit presets as CSS transforms. */
export function titleContent(p: ElementPropsOf<"title">): ReactNode {
  const { text, props } = p.placement;
  const look = props.style;
  // The words its <Mark>s draw their own way, with theme tokens made the theme's colours.
  const runs = p.placement.runs.length
    ? p.state.theme
      ? themedRuns(p.placement.runs, p.state.theme).runs
      : p.placement.runs
    : NO_RUNS;
  const rel = secondsSinceStart(p.placement, p.time);
  const anim = props.animation;
  const { effect, visibleChars } = animation(anim, rel, lengthSeconds(p.placement), text.length, p.placement.id);
  const { weight, shadow, stroke } = look;
  const inner: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: look.valign === "top" ? "flex-start" : look.valign === "bottom" ? "flex-end" : "center",
    justifyContent: look.align === "left" ? "flex-start" : look.align === "right" ? "flex-end" : "center",
    textAlign: look.align,
    // Quoted: a family with a word that starts with a digit ("Source Sans 3") is not valid CSS without quotes,
    // and the browser would drop the declaration and set the text in its default face.
    fontFamily: fontFamily(look.font),
    fontSize: look.size,
    fontWeight: typeof weight === "number" ? weight : weight === "normal" ? 400 : 700,
    fontStyle: look.italic ? "italic" : "normal",
    color: look.color,
    lineHeight: look.lineHeight,
    letterSpacing: look.letterSpacing,
    textDecoration: look.decoration !== undefined ? textDecoration(look.decoration) : "none",
    whiteSpace: "pre-wrap",
    ...(look.background ? { background: look.background } : {}),
    ...(shadow ? { textShadow: `${shadow.x ?? 0}px ${shadow.y ?? 0}px ${shadow.blur ?? 0}px ${shadow.color}` } : {}),
    ...(stroke ? { WebkitTextStroke: `${stroke.thickness}px ${stroke.color}` } : {}),
    ...effect,
  };
  const shown = visibleChars === null ? text : text.slice(0, visibleChars);
  return (
    <div style={inner}>
      {anim?.type === "wordByWord" ? (
        // One flex item for the whole text: the words then flow and wrap inside it as ordinary text does, instead of
        // each word being an item of a line that never wraps, with the spaces between them lost.
        <span>{words(text, rel, anim, lengthSeconds(p.placement), runs)}</span>
      ) : (
        marked(shown, 0, runs)
      )}
    </div>
  );
}

/** A decoration as CSS writes it: `lineThrough` is `line-through`. */
function textDecoration(value: string): string {
  return value === "lineThrough" ? "line-through" : value;
}

function animation(
  anim: Animation | undefined,
  rel: number,
  duration: number,
  chars: number,
  id: string,
): { effect: CSSProperties; visibleChars: number | null } {
  if (!anim || anim.type === "none") return { effect: {}, visibleChars: null };
  let type: string = anim.type;
  if (!SUPPORTED.has(type)) {
    devWarn(`title-anim:${id}:${type}`, `text animation "${type}" on "${id}" is shown as a fade`);
    type = "fade";
  }
  const inP = anim.in > 0 ? Math.min(1, rel / anim.in) : 1;
  const outP = anim.out > 0 ? Math.min(1, Math.max(0, (duration - rel) / anim.out)) : 1;
  const k = Math.min(inP, outP);
  if (type === "typewriter") return { effect: {}, visibleChars: Math.round(chars * inP) };
  if (type === "wordByWord") return { effect: {}, visibleChars: null };
  const slide = { slideUp: [0, 40], slideDown: [0, -40], slideLeft: [40, 0], slideRight: [-40, 0] }[type];
  if (slide)
    return {
      effect: { opacity: k, transform: `translate(${slide[0]! * (1 - k)}px, ${slide[1]! * (1 - k)}px)` },
      visibleChars: null,
    };
  if (type === "scale") return { effect: { opacity: k, transform: `scale(${0.6 + 0.4 * k})` }, visibleChars: null };
  return { effect: { opacity: k }, visibleChars: null };
}

const NO_RUNS: readonly TextRun[] = [];

/** How a run's words differ from the title's: its colour, weight, italics and highlight. */
function runStyle(run: TextRun): CSSProperties {
  const w = run.weight;
  return {
    ...(run.color !== undefined ? { color: run.color } : {}),
    ...(w !== undefined ? { fontWeight: typeof w === "number" ? w : w === "normal" ? 400 : 700 } : {}),
    ...(run.italic !== undefined ? { fontStyle: run.italic ? "italic" : "normal" } : {}),
    ...(run.background !== undefined ? { background: run.background } : {}),
  };
}

/**
 * `part`, the stretch of the title's text from character `offset`, cut where a run starts or ends: the plain pieces
 * as text, the marked ones as spans in their run's look. The text alone when no run touches it.
 */
function marked(part: string, offset: number, runs: readonly TextRun[]): ReactNode {
  const end = offset + part.length;
  const touching = runs.filter((r) => r.from < end && r.to > offset);
  if (touching.length === 0) return part;
  const out: ReactNode[] = [];
  let at = offset;
  for (const r of touching) {
    const from = Math.max(r.from, offset);
    const to = Math.min(r.to, end);
    if (from > at) out.push(part.slice(at - offset, from - offset));
    out.push(
      <span key={from} style={runStyle(r)}>
        {part.slice(from - offset, to - offset)}
      </span>,
    );
    at = to;
  }
  if (at < end) out.push(part.slice(at - offset));
  return out;
}

function words(
  text: string,
  rel: number,
  anim: Pick<Animation, "in" | "stagger">,
  duration: number,
  runs: readonly TextRun[] = NO_RUNS,
) {
  const parts = text.split(/(\s+)/);
  const wordCount = titleWords(text).length;
  const stagger = anim.stagger ?? (wordCount > 0 ? anim.in / wordCount : 0);
  let i = 0;
  let offset = 0;
  return parts.map((part, idx) => {
    const at = offset;
    offset += part.length;
    if (part.trim().length === 0)
      return (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: the parts of one fixed string, never reordered.
          key={idx}
        >
          {marked(part, at, runs)}
        </span>
      );
    const start = i++ * stagger;
    const shown = rel >= start && rel <= duration;
    return (
      <span
        // biome-ignore lint/suspicious/noArrayIndexKey: the parts of one fixed string, never reordered.
        key={idx}
        style={{ opacity: shown ? 1 : 0 }}
      >
        {marked(part, at, runs)}
      </span>
    );
  });
}

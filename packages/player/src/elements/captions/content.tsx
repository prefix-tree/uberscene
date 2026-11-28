/** @jsxRuntime automatic */
/** @jsxImportSource react */

import type { CSSProperties, ReactNode } from "react";

import { fontFamily } from "@uberscene/kit";
import { lengthSeconds, type Placement, secondsSinceStart, startSeconds } from "@uberscene/sdk/resolver";

import { isVisibleAt } from "../../model/visible";
import { captionPlace, captionPlacement } from "../../overlays/caption-placement";
import type { ElementProps } from "../../overlays/layout";

/**
 * What each overlay element draws, as a React tree with no hooks and no DOM
 * calls. The player mounts these inside positioned divs.
 */

/** The active caption lines, positioned by the captions style; karaoke colours words by their timing. */
export function captionsContent(p: {
  readonly placement: Placement;
  readonly state: ElementProps["state"];
  readonly time: number;
}): ReactNode {
  const props = p.placement.props as Record<string, unknown>;
  const style = (props.style ?? {}) as {
    font?: string;
    size?: number;
    weight?: number | string;
    color?: string;
    background?: string;
    shadow?: { color: string; blur?: number; x?: number; y?: number };
    stroke?: { color: string; thickness: number };
    highlight?: string;
    highlightBox?: string;
    upcoming?: string;
  };
  const animation = String(props.animation ?? "none");
  // Cues are the captions' children in the file, or the ones the resolver generated from the transcript.
  const active = [...p.state.items.values()]
    .filter(
      (c): c is Placement =>
        c.parent === p.placement.id && c.kind === "caption" && isVisibleAt(c, p.time, p.state.composition.duration),
    )
    .sort((a, b) => startSeconds(a) - startSeconds(b));
  const comp = p.state.composition;
  // Without a shadow of its own, a tight dark halo under a soft drop: it reads as an outline on a white shirt or sky.
  const shadow = style.shadow
    ? `${style.shadow.x ?? 0}px ${style.shadow.y ?? 0}px ${style.shadow.blur ?? 0}px ${style.shadow.color}`
    : "0 0 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.55), 0 2px 14px rgba(0,0,0,0.75)";
  const container: CSSProperties = {
    ...captionPlacement(captionPlace(props), comp),
    gap: 8,
    pointerEvents: "none",
    fontFamily: fontFamily(style.font ?? "Inter"),
    fontSize: style.size ?? Math.round(comp.height / 24),
    color: style.color ?? "#ffffff",
    fontWeight: style.weight === "normal" ? 400 : style.weight === "bold" ? 700 : Number(style.weight ?? 800),
    textShadow: shadow,
    // The outline is painted under the letters, so it does not eat into them.
    ...(style.stroke
      ? { WebkitTextStroke: `${style.stroke.thickness}px ${style.stroke.color}`, paintOrder: "stroke fill" }
      : {}),
    lineHeight: 1.15,
  };
  return (
    <div data-el={p.placement.id} data-kind="captions" style={container}>
      {active.map((c) => (
        <div
          key={c.id}
          data-el={c.id}
          data-kind="caption"
          style={
            {
              padding: "0.2em 0.5em",
              borderRadius: 6,
              textWrap: "balance",
              ...(style.background ? { background: style.background } : {}),
            } as CSSProperties
          }
        >
          {line(c, p.time, animation, style)}
        </div>
      ))}
    </div>
  );
}

/**
 * The box behind the word being said. Its padding is taken back by a negative margin, so a word takes the same room
 * with the box as without and the line does not move as the box passes along it.
 */
function wordBox(color: string): CSSProperties {
  return {
    background: color,
    borderRadius: "0.2em",
    padding: "0.04em 0.12em",
    margin: "-0.04em -0.12em",
    // The halo that lifts letters off footage only muddies them on a flat box.
    textShadow: "none",
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
  };
}

function line(
  c: Placement,
  time: number,
  animation: string,
  style: { highlight?: string; highlightBox?: string; upcoming?: string },
) {
  const text = String(c.props.text ?? "");
  const words = c.props.words as { text: string; start: number; end: number }[] | undefined;
  if (!words || words.length === 0 || animation === "none") {
    if (animation === "typewriter" && lengthSeconds(c) > 0)
      return text.slice(0, Math.round((text.length * secondsSinceStart(c, time)) / lengthSeconds(c)));
    return text;
  }
  return words.map((w, i) => {
    const done = time >= w.end,
      current = time >= w.start && time < w.end;
    const color = current
      ? (style.highlight ?? "#ffd400")
      : done || animation === "wordHighlight"
        ? undefined
        : (style.upcoming ?? "rgba(255,255,255,0.5)");
    const hidden = animation === "wordByWord" && time < w.start;
    return (
      <span
        // biome-ignore lint/suspicious/noArrayIndexKey: a caption's words in time order, never reordered.
        key={i}
        style={hidden ? { opacity: 0 } : undefined}
      >
        {/* The space sits outside the word, so a box hugs the word alone. */}
        <span
          data-word={current ? "current" : undefined}
          style={{ ...(color ? { color } : {}), ...(current && style.highlightBox ? wordBox(style.highlightBox) : {}) }}
        >
          {w.text}
        </span>
        {i < words.length - 1 ? " " : ""}
      </span>
    );
  });
}

import { memo, type ReactNode, useMemo } from "react";

import { effectEntry } from "@uberscene/kit/schema";
import { endTicks, type Placement, type ResolvedState, secondsSinceStart, startTicks } from "@uberscene/sdk/resolver";

import { trackBands } from "../model/backdrop";
import { trackCamera } from "../model/camera";
import { effectPipeline } from "../model/shaders";
import { frameIndex, frameTime } from "../model/time";
import type { Matrix2D } from "../model/transform";
import { type VisibleItem, visiblePlacements } from "../model/visible";
import { type ElementProps, OVERLAY_KINDS } from "../overlays/layout";
import { rootSpace, type Space, spacesAt } from "../overlays/space";
import { devWarn } from "../warn";
import { Adjustment } from "./elements/Adjustment";
import { Captions } from "./elements/Captions";
import { Layer } from "./elements/Layer";
import { Shape } from "./elements/Shape";
import { Sticker } from "./elements/Sticker";
import { Svg } from "./elements/Svg";
import { Title } from "./elements/Title";
import { useCompositionTime, usePlayer } from "./hooks";
import { htmlInCanvas } from "./html-in-canvas";
import { ShaderBox } from "./ShaderBox";

export interface DomLayerProps {
  readonly state: ResolvedState;
  readonly interiors: ReadonlyMap<string, ReactNode>;
  /**
   * Which overlays: those beneath the footage (`"backdrop"`), the rest and the captions (`"front"`, the default),
   * or, in a player with a canvas per band (`trackBands`), those above canvas `slot`. The captions go with the
   * top slot.
   */
  readonly layer?: "backdrop" | "front";
  readonly slot?: number;
}

/** Overlay elements as DOM, one absolutely positioned group per track in compositing order, above the canvas (or, for the backdrop, below it). */
export function DomLayer({ state, interiors, layer = "front", slot }: DomLayerProps) {
  const time = useCompositionTime();
  const exact = usePlayer().exactTime;
  // Where the overlays that follow another are placed from, worked out once a frame (at the frame's own time unless
  // the player draws every moment), and handed to each element.
  const at = exact ? time : frameTime(frameIndex(time, state.composition.rate), state.composition.rate);
  const spaces = useMemo(() => spacesAt(state, at), [state, at]);
  const root = useMemo(() => rootSpace(state), [state]);
  const items = visiblePlacements(state, time).filter((v) => OVERLAY_KINDS.has(v.placement.kind));
  const byTrack = new Map<string, VisibleItem[]>();
  for (const item of items) {
    const list = byTrack.get(item.track.id) ?? [];
    list.push(item);
    byTrack.set(item.track.id, list);
  }
  const bands = trackBands(state);
  const slotOf = (id: string) => bands.slotOf.get(id) ?? bands.count - 1;
  const tracks = state.tracks.filter((t) =>
    slot !== undefined ? slotOf(t.id) === slot : slotOf(t.id) < 0 === (layer === "backdrop"),
  );
  const top = slot !== undefined ? slot === bands.count - 1 : layer === "front";
  const captions = top ? [...state.items.values()].filter((p) => p.kind === "captions") : [];
  return (
    <>
      {tracks.map((track) => {
        const list = byTrack.get(track.id);
        if (!list) return null;
        return (
          <div
            key={track.id}
            data-track={track.id}
            style={{ position: "absolute", inset: 0, zIndex: track.order + 1, pointerEvents: "none" }}
          >
            {list.map((item) => (
              <Element
                key={item.placement.id}
                item={item}
                state={state}
                time={time}
                exact={exact}
                space={spaces.get(item.placement.id) ?? root}
                interior={interiors.get(item.placement.id)}
              />
            ))}
          </div>
        );
      })}
      {captions.map((c) => (
        <div
          key={c.id}
          style={{ position: "absolute", inset: 0, zIndex: state.tracks.length + 1, pointerEvents: "none" }}
        >
          <Captions placement={c} state={state} time={time} />
        </div>
      ))}
    </>
  );
}

export interface ElementCellProps {
  item: VisibleItem;
  state: ResolvedState;
  time: number;
  interior: ReactNode;
  /** Re-render for any change of time, not only a new frame (the player's `exactTime`). */
  exact?: boolean;
  /** The space its `box` is read in: the composition's, or that of the element it follows (overlays/space.ts). */
  space: Space;
}

/** Re-renders only when the element's own relative frame or placement changes. */
const Element = memo(
  function Element({ item, state, time, interior, space }: ElementCellProps) {
    const props: ElementProps = {
      placement: item.placement,
      children: item.children,
      state,
      time,
      transition: item.transition,
      space,
    };
    const content = elementContent(item, props, state, interior);
    if (item.placement.kind !== "adjustment") warnPostOnOverlay(item.placement.id, item.children);
    // An overlay's effects run in file order over its picture, drawn through HTML-in-Canvas. Without HTML-in-Canvas
    // they draw as CSS (overlays/layout.ts), and only the ones with no CSS form are left here, to be reported.
    const passes =
      item.placement.kind === "adjustment"
        ? undefined
        : effectPipeline(state, item.children, item.placement.id, secondsSinceStart(item.placement, time), {
            shaders: htmlInCanvas(),
          }).shaders;
    // The box stays for as long as the element has an effect a shader draws, also at a moment when that effect
    // changes nothing and has no pass: taking the box away and putting it back would make the overlay's content
    // anew each time, and a three.js scene would be set up again in the middle of the video.
    if (!content || item.placement.kind === "adjustment") return content;
    const list = passes ?? [];
    if (list.length === 0 && !hasShaderEffect(item.children)) return content;
    const { width, height } = state.composition;
    return (
      <ShaderBox id={item.placement.id} width={width} height={height} passes={list}>
        {content}
      </ShaderBox>
    );
  },
  (a, b) => sameElement(a, b),
);

/** Whether an element has an enabled effect that is drawn by a shader: a built-in one, or one the file declares. */
function hasShaderEffect(children: readonly Placement[]): boolean {
  if (!htmlInCanvas()) return false;
  return children.some(
    (c) =>
      c.kind === "effect" &&
      c.props.enabled !== false &&
      (typeof c.props.type !== "string" || effectEntry(c.props.type)?.draw.kind === "shader"),
  );
}

/** Vignette and grain are painted on the canvas; an overlay has no pass for them yet, so the preview says so once. */
function warnPostOnOverlay(id: string, children: readonly Placement[]): void {
  for (const c of children) {
    if (c.kind !== "effect" || c.props.enabled === false || effectEntry(c.props.type)?.draw.kind !== "post") continue;
    const type = String(c.props.type);
    devWarn(
      `effect:${id}:${type}`,
      `effect "${type}" on overlay "${id}" is not drawn: put it on a clip or an <Adjustment>`,
    );
  }
}

function elementContent(item: VisibleItem, props: ElementProps, state: ResolvedState, interior: ReactNode): ReactNode {
  switch (item.placement.kind) {
    case "title":
      return (
        <Title
          {...props}
          text={state.tree.byId.get(item.placement.id)?.text ?? ""}
          runs={state.tree.byId.get(item.placement.id)?.runs}
        />
      );
    case "shape":
      return <Shape {...props} />;
    case "svg":
      return <Svg {...props} />;
    case "sticker":
      return <Sticker {...props} />;
    case "layer":
      return <Layer {...props} interior={interior} />;
    case "adjustment":
      return <Adjustment {...props} />;
    default:
      return null;
  }
}

/**
 * Whether two renders of an overlay would produce the same DOM. Placements
 * are new objects on every resolve, so compare what matters: timing, the
 * parsed props (referentially stable while untouched), children, the
 * element-relative frame, the transition progress, the text and the
 * composition box.
 */
export function sameElement(a: ElementCellProps, b: ElementCellProps): boolean {
  const p = a.item.placement,
    q = b.item.placement;
  // The resolver hands back the same Placement object when nothing about it changed.
  if (
    p !== q &&
    (p.id !== q.id ||
      p.kind !== q.kind ||
      startTicks(p) !== startTicks(q) ||
      endTicks(p) !== endTicks(q) ||
      p.props !== q.props ||
      p.interior !== q.interior)
  )
    return false;
  if (a.interior !== b.interior) return false;
  if (
    a.item.children.length !== b.item.children.length ||
    a.item.children.some(
      (c, i) =>
        c !== b.item.children[i] &&
        (c.props !== b.item.children[i]!.props || startTicks(c) !== startTicks(b.item.children[i]!)),
    )
  )
    return false;
  const ca = a.state.composition,
    cb = b.state.composition;
  if (ca.width !== cb.width || ca.height !== cb.height || ca.rate.num !== cb.rate.num || ca.rate.den !== cb.rate.den)
    return false;
  if (p.kind === "title") {
    const was = a.state.tree.byId.get(p.id);
    const now = b.state.tree.byId.get(p.id);
    if (was?.text !== now?.text || was?.runs !== now?.runs) return false;
  }
  if (
    a.exact || b.exact
      ? secondsSinceStart(p, a.time) !== secondsSinceStart(q, b.time)
      : frameIndex(secondsSinceStart(p, a.time), ca.rate) !== frameIndex(secondsSinceStart(q, b.time), cb.rate)
  )
    return false;
  // A camera moves an overlay that has no keys of its own, at times its own frame does not change.
  if (!sameMatrix(trackCamera(a.state, p.track, a.time), trackCamera(b.state, q.track, b.time))) return false;
  // What it follows carries it at times its own frame does not change, and an edit to that element moves it too.
  if (a.space.isRoot !== b.space.isRoot || !sameMatrix(a.space.matrix, b.space.matrix)) return false;
  if (a.space.frame.width !== b.space.frame.width || a.space.frame.height !== b.space.frame.height) return false;
  return (a.item.transition?.progress ?? -1) === (b.item.transition?.progress ?? -1);
}

function sameMatrix(m: Matrix2D | null, n: Matrix2D | null): boolean {
  if (m === n) return true;
  if (!m || !n) return false;
  return m.a === n.a && m.b === n.b && m.c === n.c && m.d === n.d && m.e === n.e && m.f === n.f;
}

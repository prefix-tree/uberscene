import { endSeconds, startSeconds } from "@uberscene/sdk";
import { lookupAsset, type Placement, type ResolvedState } from "@uberscene/sdk/resolver";

import { MOUNT_AHEAD_S, UNMOUNT_BEHIND_S } from "../constants";
import { matteOf } from "../model/frame-plan";
import { trackItems } from "../model/visible";
import type { AssetSources } from "./asset-sources";
import { ClipDecoder } from "./clip-decoder";

/**
 * Keeps a ClipDecoder for every media placement near the play head and drops
 * the rest, and a second one reading the matte for a clip with `cutout`.
 * Asset sources are shared through `AssetSources`, so nested compositors
 * handed the same registry never open an asset twice.
 */
export class DecoderPool {
  private readonly decoders = new Map<string, ClipDecoder>();
  /** By placement id: the decoder of the clip's matte, at the same source times as its footage. */
  private readonly mattes = new Map<string, ClipDecoder>();
  private rate = 1;

  constructor(readonly sources: AssetSources) {}

  setRate(rate: number): void {
    this.rate = rate;
  }

  /** Mount decoders for placements within the window around `t`; unmount the rest. */
  sync(state: ResolvedState, t: number): void {
    const want = new Map<string, { p: Placement; children: Placement[]; matte: string | null }>();
    for (const track of state.tracks) {
      if (track.hidden) continue;
      for (const p of trackItems(state, track)) {
        if (p.kind !== "clip" || !p.source) continue;
        const asset = lookupAsset(state.manifest, p.source.asset);
        if (!asset) continue;
        if (t < startSeconds(p) - MOUNT_AHEAD_S || t >= endSeconds(p) + UNMOUNT_BEHIND_S) continue;
        want.set(p.id, {
          p,
          children: p.children.map((id) => state.items.get(id)).filter((c): c is Placement => c !== undefined),
          matte: matteOf(state, p, asset)?.asset ?? null,
        });
      }
    }
    for (const [id, d] of this.decoders) {
      const w = want.get(id);
      if (!w || ClipDecoder.sourceKey(w.p) !== d.sourceKey) this.unmount(id);
      else if (w.p !== d.placement) d.update(w.p, w.children);
    }
    for (const [id, m] of this.mattes) {
      const w = want.get(id);
      if (!w?.matte || ClipDecoder.sourceKey(w.p, w.matte) !== m.sourceKey) this.unmountMatte(id);
      else if (w.p !== m.placement) m.update(w.p, w.children);
    }
    for (const [id, w] of want) {
      const speed = () => w.p.source!.speed * this.rate;
      if (!this.decoders.has(id)) {
        const { source } = this.sources.acquire(w.p.source!.asset);
        const d = new ClipDecoder(source, w.p, w.children, speed);
        this.decoders.set(id, d);
        void d.prime(Math.max(t, startSeconds(w.p)));
      }
      if (w.matte && !this.mattes.has(id)) {
        const { source } = this.sources.acquire(w.matte);
        const m = new ClipDecoder(source, w.p, w.children, speed, w.matte);
        this.mattes.set(id, m);
        void m.prime(Math.max(t, startSeconds(w.p)));
      }
    }
    this.sources.sweep();
  }

  decoderFor(id: string): ClipDecoder | undefined {
    return this.decoders.get(id);
  }

  /** The decoder of a clip's matte, when it has `cutout` and a matte. */
  matteFor(id: string): ClipDecoder | undefined {
    return this.mattes.get(id);
  }

  get mounted(): string[] {
    return [...this.decoders.keys()];
  }

  /** After a seek: every decoder jumps to `t`. */
  seekAll(t: number): Promise<void> {
    return Promise.all(this.all().map((d) => d.prime(Math.max(t, startSeconds(d.placement))))).then(() => undefined);
  }

  /** Resolves when every decoder has its first frame. */
  settle(): Promise<void> {
    return Promise.all(this.all().map((d) => d.ready)).then(() => undefined);
  }

  dispose(): void {
    for (const id of [...this.decoders.keys()]) this.unmount(id);
    for (const id of [...this.mattes.keys()]) this.unmountMatte(id);
  }

  private all(): ClipDecoder[] {
    return [...this.decoders.values(), ...this.mattes.values()];
  }

  private unmountMatte(id: string): void {
    const m = this.mattes.get(id);
    if (!m) return;
    m.dispose();
    this.mattes.delete(id);
    if (m.asset) this.sources.release(m.asset);
  }

  private unmount(id: string): void {
    const d = this.decoders.get(id);
    if (!d) return;
    d.dispose();
    this.decoders.delete(id);
    if (d.placement.source) this.sources.release(d.placement.source.asset);
  }
}

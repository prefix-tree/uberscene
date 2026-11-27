// The resolver keeps what it worked out for a node, a props object or a track, keyed by that object, so an edit
// derives again only what it touched. `uncached` runs a resolve with every one of those caches off: nothing is read
// from them and nothing is written, so the result is derived from the tree and the log alone. The tests hold every
// cached resolve to that result.

let off = false;

/** A cache keyed by an object, which `uncached` switches off. */
export class Cache<K extends WeakKey, V> {
  private readonly map = new WeakMap<K, V>();

  get(key: K): V | undefined {
    return off ? undefined : this.map.get(key);
  }

  set(key: K, value: V): void {
    if (!off) this.map.set(key, value);
  }
}

/** Whether a resolve is running with its caches off. */
export function cachesOff(): boolean {
  return off;
}

/** Runs `work` with the resolver's caches off, and puts them back as they were. */
export function uncached<T>(work: () => T): T {
  const was = off;
  off = true;
  try {
    return work();
  } finally {
    off = was;
  }
}

/**
 * How often each short cut of the resolver was taken, since the process started. The tests read it to see that the
 * rows they compare went through every one; nothing else does.
 */
export const shortCuts = {
  /** A settled track taken whole, by its node. */
  tracksTaken: 0,
  /** A settled track taken after a child changed, the rest as they stood. */
  tracksChanged: 0,
  /** A settled track taken after a child changed, the rest moved in time. */
  tracksShifted: 0,
  /** A resolve done again the plain way, because two elements shared an id. */
  plain: 0,
  /** A tree placed by walking it from its root, with no id map. */
  walked: 0,
};

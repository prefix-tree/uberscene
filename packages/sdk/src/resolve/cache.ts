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

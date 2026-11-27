// The footage of the liftoff film, and the launch clips whose ignition `ignition.ts` finds. Filled in as the shots
// are chosen from Wikimedia Commons.

/** A launch clip to time: its asset id, and the part of the frame where the pad is (x0, y0, x1, y1, as fractions). */
export interface Ignite {
  readonly id: string;
  readonly region: readonly [number, number, number, number];
}

export const IGNITE: readonly Ignite[] = [];

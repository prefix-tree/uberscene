// Written by scripts/flashes.ts from media/storms.webm: the second each lightning flash starts, how many bright
// pixels it adds, and where it is across the frame (0 left, 1 right), for the crop to centre on.
// Run `pnpm --filter @uberscene/example-orbit flashes` to find them again.
export const LIGHTNING: readonly { readonly time: number; readonly pixels: number; readonly x: number }[] = [
  { time: 0.1, pixels: 399, x: 0.52 },
  { time: 0.667, pixels: 308, x: 0.59 },
  { time: 3.167, pixels: 60, x: 0.35 },
  { time: 4.167, pixels: 49, x: 0.83 },
  { time: 22.433, pixels: 51, x: 0.67 },
  { time: 22.833, pixels: 48, x: 0.7 },
  { time: 23.833, pixels: 74, x: 0.84 },
  { time: 24.167, pixels: 88, x: 0.65 },
  { time: 24.767, pixels: 30, x: 0.76 },
];

// What the nature film is made of: stretches of Pixabay footage (the Pixabay Content License) and Freesound recordings
// (CC0), each fetched into media/ by scripts/prepare.ts with `fetchStock`. Nothing here is committed media: the ids
// and seconds are enough to fetch the same stretch again. CREDITS.md is written from what was fetched.

export interface Source {
  /** The asset id the film uses. */
  readonly id: string;
  /** `library:id`, what `uberscene fetch` takes. */
  readonly ref: string;
  /** The seconds of the original to keep. */
  readonly from: number;
  readonly to: number;
  readonly what: string;
}

/** The footage: each stretch long enough for its longest use, kept at 1080 high. Pixabay's sound tracks are silent. */
export const FOOTAGE: readonly Source[] = [
  { id: "fire", ref: "pixabay:15178", from: 10, to: 18, what: "flames close up" },
  { id: "falls", ref: "pixabay:358693", from: 4, to: 12, what: "a waterfall over rocks" },
  { id: "surf", ref: "pixabay:217115", from: 6, to: 14, what: "surf breaking on dark rocks" },
  { id: "drops", ref: "pixabay:92994", from: 4, to: 12, what: "raindrops on rose leaves" },
  { id: "rain", ref: "pixabay:204307", from: 2, to: 10, what: "rain falling through leaves" },
  { id: "storm", ref: "pixabay:283426", from: 2, to: 10, what: "storm clouds rolling over a valley" },
  { id: "ridge", ref: "pixabay:145447", from: 4, to: 12, what: "a snow ridge from the air" },
  { id: "grass", ref: "pixabay:89182", from: 8, to: 16, what: "grass in the wind" },
  { id: "stork", ref: "pixabay:85715", from: 4, to: 12, what: "a stork flying" },
  { id: "embers", ref: "pixabay:286679", from: 4, to: 12, what: "a fire pit's logs and flames" },
];

/** The recordings: every place's sound (the footage has none), and the cues laid on the cuts. */
export const SOUNDS: readonly Source[] = [
  { id: "fire-sound", ref: "freesound:657357", from: 30, to: 38, what: "a wood fire crackling near" },
  { id: "drops-sound", ref: "freesound:874301", from: 30, to: 38, what: "rain close up on leaves" },
  { id: "rain-sound", ref: "freesound:874301", from: 60, to: 68, what: "rain close up on leaves, later" },
  { id: "ridge-sound", ref: "freesound:156414", from: 10, to: 18, what: "wind on a mountain top, Atacama" },
  { id: "grass-sound", ref: "freesound:81793", from: 10, to: 18, what: "mistral gusts in high grass" },
  { id: "falls-sound", ref: "freesound:352902", from: 3, to: 11, what: "the top of a large waterfall" },
  { id: "surf-sound", ref: "freesound:376799", from: 4, to: 12, what: "waves crashing into rocks" },
  { id: "thunder", ref: "freesound:778369", from: 3, to: 11, what: "rolling distant thunder in heavy rain" },
  { id: "wings", ref: "freesound:655322", from: 0, to: 4, what: "bird wings flapping" },
  { id: "crackle", ref: "freesound:657357", from: 20, to: 28, what: "a wood fire crackling near" },
  { id: "whoosh", ref: "freesound:877978", from: 0, to: 1.3, what: "a fast whoosh passing by" },
  { id: "braam", ref: "freesound:427803", from: 0, to: 4.4, what: "a cinematic hit with horns" },
];

// The footage of the liftoff film: each asset is a stretch of one file from Wikimedia Commons, read from the original
// and kept at its own resolution up to 4K, so the vertical frame crops real pixels instead of stretching them. Two
// vertical clips of the Starship booster coming home are supplied locally (`local`), not fetched.

export interface Source {
  /** The asset id the film uses. */
  readonly id: string;
  /** The file's name on Commons, or `local` for a file placed in media/ by hand. */
  readonly file: string;
  /** The seconds of it to keep. */
  readonly from: number;
  readonly to: number;
  /** The height to keep it at: its own, at most 2160. */
  readonly height: number;
  readonly what: string;
}

export const SOURCES: readonly Source[] = [
  {
    id: "pad",
    file: "Film to Tape - Apollo, Saturn V, Crawler, VAB, Pad 39A (KSC-1960s-MH-NAS01-0001-Apollo Saturn V Crawler, VAB Pad Film To Tape).webm",
    from: 1244,
    to: 1352,
    height: 720,
    what: "a Saturn V on pad 39A beside its gantry, 1960s film",
  },
  {
    id: "engines",
    file: "Apollo 11 launch, video of engines at 500 fps (camera E-8).ogv",
    from: 0,
    to: 30,
    height: 720,
    what: "Apollo 11's five F-1 engines lighting, filmed at 500 frames a second",
  },
  {
    id: "saturn",
    file: "Power for Apollo - Saturn V.webm",
    from: 568,
    to: 588,
    height: 1080,
    what: "a Saturn V climbing, from the 1960s film Power for Apollo",
  },
  {
    id: "interstage",
    file: "Apollo 4 separation of interstage ring.webm",
    from: 0,
    to: 38,
    height: 1080,
    what: "Apollo 4's interstage ring falling away, filmed from the rocket",
  },
  {
    id: "apollo4",
    file: "Separation of Rocket Stages During Apollo 4.webm",
    from: 18,
    to: 40,
    height: 1080,
    what: "Apollo 4's stages separating, filmed from the rocket",
  },
  {
    id: "shuttle",
    file: "STS-132 Liftoff Space Shuttle Atlantis.ogv",
    from: 0,
    to: 70,
    height: 1080,
    what: "Atlantis on STS-132: the main engines lighting, liftoff, the climb, the booster camera",
  },
  {
    id: "night",
    file: "Launch of Space Shuttle Endeavour STS-126.webm",
    from: 0,
    to: 56,
    height: 1080,
    what: "Endeavour's night launch on STS-126",
  },
  {
    id: "artemis",
    file: "Artemis I Launch (Artemis I Launch 2022 CU tracking from Press Site compressed).webm",
    from: 40,
    to: 100,
    height: 2160,
    what: "Artemis I lifting off at night, in 4K",
  },
  {
    id: "roman",
    file: "Nancy Grace Roman Space Telescope High Speed Footage (KSC-20260830-MH-CSH01-0001-Roman Space Telescope Launch High Speed Footage).webm",
    from: 18,
    to: 42,
    height: 2160,
    what: "a Falcon Heavy lighting at sunrise, carrying the Roman Space Telescope, high speed, in 4K",
  },
  {
    id: "heavy-lift",
    file: "Falcon Heavy test flight.webm",
    from: 76,
    to: 92,
    height: 2160,
    what: "the first Falcon Heavy clearing the tower, in 4K",
  },
  {
    id: "heavy-climb",
    file: "Falcon Heavy test flight.webm",
    from: 126,
    to: 162,
    height: 2160,
    what: "the first Falcon Heavy climbing and its side boosters separating, in 4K",
  },
  {
    id: "heavy-land",
    file: "Falcon Heavy test flight.webm",
    from: 212,
    to: 236,
    height: 2160,
    what: "the two side boosters landing side by side, in 4K",
  },
  {
    id: "catch",
    file: "local",
    from: 0,
    to: 15.7,
    height: 1920,
    what: "a Starship Super Heavy booster caught by the tower's arms, vertical",
  },
  {
    id: "return",
    file: "local",
    from: 0,
    to: 60,
    height: 1920,
    what: "a Super Heavy booster coming back from launch to the tower, vertical",
  },
];

/** A launch clip to time: its asset id, and the part of the frame where the fire starts (x0, y0, x1, y1, fractions). */
export interface Ignite {
  readonly id: string;
  readonly region: readonly [number, number, number, number];
}

export const IGNITE: readonly Ignite[] = [
  { id: "engines", region: [0.1, 0.3, 1, 1] },
  { id: "shuttle", region: [0.3, 0.4, 0.9, 1] },
  { id: "roman", region: [0.1, 0.6, 0.55, 1] },
];

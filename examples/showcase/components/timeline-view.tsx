import { Composition, TimelineView, Track } from "@uberscene/kit";

// TimelineView: a film's timeline as an editor shows it. In a real post the lanes come from the film itself, with
// timelineLanes(state) of @uberscene/sdk; here, a short film's lanes are written out.
const LANES = [
  {
    id: "shots",
    role: "general",
    kind: "picture" as const,
    clips: [
      { id: "fire", kind: "clip", from: 0, to: 1.5, label: "fire" },
      { id: "falls", kind: "clip", from: 1.5, to: 3, label: "falls" },
      { id: "storm", kind: "clip", from: 3, to: 4, label: "storm" },
    ],
  },
  {
    id: "sfx",
    role: "effects",
    kind: "sound" as const,
    clips: [
      { id: "whoosh", kind: "audio", from: 1.2, to: 1.9, label: "whoosh", level: [0.1, 0.3, 0.7, 0.9, 0.6, 0.3, 0.1] },
      {
        id: "boom",
        kind: "audio",
        from: 3,
        to: 4,
        label: "boom",
        level: [1, 0.8, 0.6, 0.45, 0.35, 0.25, 0.2, 0.15, 0.1, 0.05],
      },
    ],
  },
  {
    id: "beds",
    role: "ambience",
    kind: "sound" as const,
    clips: [
      {
        id: "crackle",
        kind: "audio",
        from: 0,
        to: 1.6,
        label: "crackle",
        level: [0.4, 0.6, 0.3, 0.7, 0.5, 0.4, 0.6, 0.3],
      },
      {
        id: "water",
        kind: "audio",
        from: 1.4,
        to: 3.1,
        label: "water",
        level: [0.5, 0.6, 0.55, 0.62, 0.58, 0.6, 0.57, 0.5],
      },
    ],
  },
];

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080} background={{ type: "color", color: "#0b0d12" }}>
      <Track id="over" layout="free">
        <TimelineView
          id="timeline"
          start={0}
          duration={4}
          length={4}
          lanes={LANES}
          box={{ x: 160, y: 240 }}
          width={1600}
          height={600}
        />
      </Track>
    </Composition>
  );
}

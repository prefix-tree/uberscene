// The sound-breakdown post, 1080x1920: a title, the film, and under it the film's own timeline as an editor shows it,
// its playhead on the film's clock, so every sound is seen as it is heard. The timeline is the film's resolved timeline
// (`timelineLanes` of @uberscene/sdk), drawn by `<TimelineView>`: each block on screen is an element of the film's file.
// `render.ts` renders the film first, hands it in as an asset, and passes its lanes with a frame for each picture clip.
import { z } from "zod";

import { Clip, Composition, googleFont, TimelineView, Title, Track } from "@uberscene/kit";

const display = googleFont("Inter Tight", { weights: [800] });
const mono = googleFont("JetBrains Mono", { weights: [500] });

const clip = z.object({
  id: z.string(),
  kind: z.string(),
  from: z.number(),
  to: z.number(),
  label: z.string(),
  title: z.string().optional(),
  fade: z.object({ in: z.number(), out: z.number() }).optional(),
  level: z.array(z.number()).optional(),
  thumbs: z.array(z.string()).optional(),
});

export const schema = z.object({
  /** The rendered film's asset id, its size and length. */
  film: z.string(),
  width: z.number(),
  height: z.number(),
  length: z.number(),
  /** The film's lanes and markers, from its resolved timeline. */
  lanes: z.array(
    z.object({
      id: z.string(),
      track: z.string().optional(),
      role: z.string(),
      kind: z.enum(["picture", "sound"]),
      clips: z.array(clip),
    }),
  ),
  markers: z.array(z.object({ time: z.number(), label: z.string(), color: z.string().optional() })),
  title: z.string(),
  subtitle: z.string(),
});

export const defaults: z.infer<typeof schema> = {
  film: "film",
  width: 1080,
  height: 880,
  length: 4,
  lanes: [],
  markers: [],
  title: "SOUND BREAKDOWN",
  subtitle: "every sound is a line of code",
};

const W = 1080;
const H = 1920;
/** The title bar, then the film, then the timeline. */
const FILM_TOP = 270;
const GAP = 24;

export default function Breakdown(props: z.infer<typeof schema>) {
  const { film, width, height, length, lanes, markers, title, subtitle } = props;
  const filmH = Math.round((W * height) / width);
  const timelineTop = FILM_TOP + filmH + GAP;
  return (
    <Composition fps={30} width={W} height={H} background={{ type: "color", color: "#000000" }}>
      <Track id="heading" layout="free">
        <Title
          id="title"
          start={0}
          duration={length}
          style={{ font: display, size: 72, weight: 800, color: "#ffffff", align: "center" }}
          box={{ x: W / 2, y: 150, width: 900, height: 90, origin: "center" }}
        >
          {title}
        </Title>
        <Title
          id="subtitle"
          start={0}
          duration={length}
          style={{ font: mono, size: 26, weight: 500, color: "#8a93a6", align: "center" }}
          box={{ x: W / 2, y: 218, width: 900, height: 40, origin: "center" }}
        >
          {subtitle}
        </Title>
      </Track>
      <Track id="film" layout="free">
        <Clip
          id="the-film"
          src={`asset:${film}`}
          start={0}
          in={0}
          duration={length}
          fit="cover"
          box={{ x: 0, y: FILM_TOP, width: W, height: filmH, origin: "topLeft" }}
        />
      </Track>
      <Track id="timeline" layout="free">
        <TimelineView
          id="timeline"
          start={0}
          duration={length}
          length={length}
          lanes={lanes}
          markers={markers}
          box={{ x: 24, y: timelineTop }}
          width={W - 48}
          height={H - timelineTop - 120}
          ruler={false}
          ground
        />
      </Track>
    </Composition>
  );
}

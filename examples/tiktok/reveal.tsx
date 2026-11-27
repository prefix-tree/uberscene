// The reveal version of a TikTok post, 1080x1920: the film plays full screen, then for a stretch it slides up into the
// top of the frame and its own source rises into the bottom, lighting the line of each element as it comes on screen,
// and then the code drops away and the film fills the frame again. `render.ts` picks the stretch: for a film cut to
// music, from one section to the next, so the split and the return land on beats.
//
// The film keeps its size and only moves, so nothing in it is scaled down; the split line is at y 840, and the code's
// lit line is held inside TikTok's safe zone (y 240 to 1260), above the caption and buttons.
//
// The code can be several files, `pages`, each from a second of the film on, as tabs of the editor switching on a beat
// (the music's score, then the pictures' file). `hook` lines can open the post: a question, its answer, the turn.
import { z } from "zod";

import { Clip, Composition, Layer, Title, Track, useLayer } from "@uberscene/kit";

import { CodeView } from "./code-view";
import { display } from "./frame";

const litSchema = z.array(
  z.object({ line: z.number(), from: z.number(), to: z.number(), cols: z.tuple([z.number(), z.number()]).optional() }),
);
const pageSchema = z.object({
  file: z.string(),
  /** What the file plays, shown beside its name: "the music", "the pictures". */
  label: z.string(),
  code: z.string(),
  /** The lines lit while what they write plays, in seconds of the film. */
  lit: litSchema,
  /** The second of the film this page comes up at. */
  from: z.number(),
});

export const schema = z.object({
  film: z.string(),
  width: z.number(),
  height: z.number(),
  length: z.number(),
  /** The code shown below the film: the film's source, or several files, each from a second of the film on. */
  pages: z.array(pageSchema).min(1),
  /**
   * Lines that open the post and say what it is, each over its own seconds: a question, its answer, then the turn
   * ("BUT…"). `y` is the line's middle; left out, a little above the frame's middle.
   */
  hook: z
    .array(
      z.object({
        text: z.string(),
        from: z.number(),
        to: z.number(),
        size: z.number().optional(),
        y: z.number().optional(),
      }),
    )
    .optional(),
  /** When the code comes up and when it goes, in seconds of the film. */
  split: z.number(),
  back: z.number(),
});

export const defaults: z.infer<typeof schema> = {
  film: "film",
  width: 1080,
  height: 1920,
  length: 8,
  pages: [
    {
      file: "video.tsx",
      label: "playing above",
      code: "export default function Video() {\n  return <Composition />;\n}",
      lit: [],
      from: 0,
    },
  ],
  split: 2,
  back: 6,
};

const W = 1080;
const H = 1920;
/** Where the film and the code meet while the code is up. */
const SPLIT_Y = 840;
/** How long the code takes to rise, and to drop away. */
const RISE = 0.5;
const DROP = 0.3;

const easeInOut = (k: number): number => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

/** The code, sliding up from below the frame as the layer starts and back down as it ends. */
function Code(props: { pages: z.infer<typeof pageSchema>[]; length: number; split: number }) {
  const { elapsed, remaining } = useLayer();
  const up = Math.min(easeInOut(Math.min(1, elapsed / RISE)), easeInOut(Math.min(1, remaining / DROP)));
  const top = SPLIT_Y + (1 - up) * (H - SPLIT_Y);
  // The window reads the film's clock, so its lines light as the film above plays them; the page is the last one up.
  const t = props.split + elapsed;
  const page = props.pages.filter((p) => p.from <= t).at(-1) ?? (props.pages[0] as z.infer<typeof pageSchema>);
  return (
    // The page under the code starts at the code's top edge, so the film above stays in view.
    <div style={{ position: "absolute", left: 0, right: 0, top, bottom: 0, background: "#0b0d12" }}>
      <CodeView
        key={page.file}
        code={page.code}
        lit={page.lit}
        t={t}
        length={props.length}
        file={`${page.file} · ${page.label}`}
        x={24}
        y={18}
        w={W - 48}
        h={H - SPLIT_Y - 18}
        size={34}
        hold={0.22}
        fade={300}
        strong
      />
    </div>
  );
}

export default function Reveal(props: z.infer<typeof schema>) {
  const { film, width, height, length, pages, hook, split, back } = props;
  const tall = height > width;
  const h = tall ? H : Math.round((W * height) / width);
  // Up: the film's centre moves so its middle shows above the split line.
  const centre = H / 2,
    raised = SPLIT_Y / 2;
  return (
    <Composition fps={30} width={W} height={H} background={{ type: "color", color: "#0b0d12" }}>
      <Track id="film" layout="free">
        <Clip
          id="the-film"
          src={`asset:${film}`}
          start={0}
          in={0}
          duration={length}
          fit={tall ? "cover" : "contain"}
          box={{
            x: W / 2,
            y: [
              { at: split, value: centre, easing: "easeInOutCubic" },
              { at: split + RISE, value: raised },
              { at: back - DROP, value: raised, easing: "easeInOutCubic" },
              { at: back, value: centre },
            ],
            width: W,
            height: h,
            origin: "center",
          }}
        />
      </Track>
      <Track id="code" layout="free">
        {/* A ground: it runs under the phone's caption and buttons, faded; its lit line is held inside the safe zone. */}
        <Layer id="source" start={split} duration={back - split} ground>
          <Code pages={pages} length={length} split={split} />
        </Layer>
      </Track>
      {hook ? (
        <Track id="hook-lines" layout="free">
          {hook.map((line, i) => (
            <Title
              key={line.text}
              id={`hook-${i}`}
              start={line.from}
              duration={line.to - line.from}
              style={{
                font: display,
                size: line.size ?? 76,
                weight: 800,
                color: "#ffffff",
                align: "center",
                shadow: { color: "rgba(0, 0, 0, 0.8)", blur: 30, y: 2 },
              }}
              box={{ x: W / 2, y: line.y ?? 760, width: 840, height: 240, origin: "center" }}
              enter={{ type: "fade", duration: 0.12 }}
              exit={{ type: "fade", duration: 0.2 }}
            >
              {line.text}
            </Title>
          ))}
        </Track>
      ) : null}
    </Composition>
  );
}

// The code version of a TikTok post, 1080x1920: the film on top, its own source below in an editor window that lights
// the line of whatever is on screen. `render.ts` renders the film first and hands it in as an asset, with its source
// and the times its elements are on screen.
//
// Everything that matters sits inside TikTok's safe zone (x 120 to 960, y 240 to 1260): the platform's buttons and
// caption cover the sides and the bottom 660 px.
import { z } from "zod";

import { Clip, Composition, googleFont, Layer, Shape, Title, Track, useLayer } from "@uberscene/kit";

import { CodeView } from "./code-view";

export const mono = googleFont("JetBrains Mono", { weights: [500] });
export const display = googleFont("Inter Tight", { weights: [400, 800] });

export const schema = z.object({
  /** The film's source, as its file has it. */
  code: z.string(),
  /** The lines lit while what they write is on screen. */
  lit: z.array(z.object({ line: z.number(), from: z.number(), to: z.number() })),
  /** The rendered film's asset id, and its size and length. */
  film: z.string(),
  width: z.number(),
  height: z.number(),
  length: z.number(),
  /** The name on the editor's tab. */
  file: z.string(),
  hook: z.string(),
});

export const defaults: z.infer<typeof schema> = {
  code: "export default function Video() {\n  return <Composition />;\n}",
  lit: [],
  film: "film",
  width: 1920,
  height: 1080,
  length: 4,
  file: "video.tsx",
  hook: "This video is code.",
};

const W = 1080;
const H = 1920;
const LEFT = 120;
const ZONE_W = 840;
const END = 2.2;
const BG = "#0b0d12";

/** Where the film sits: a 16:9 film across the zone, a tall one smaller and centred, both under the hook. */
function filmBox(width: number, height: number) {
  const top = 360;
  if (width >= height) {
    const h = Math.round((ZONE_W * height) / width);
    return { x: LEFT, y: top, w: ZONE_W, h };
  }
  const h = 540;
  const w = Math.round((h * width) / height);
  return { x: (W - w) / 2, y: top, w, h };
}

function Code(props: { code: string; lit: z.infer<typeof schema>["lit"]; length: number; file: string; top: number }) {
  const t = useLayer().elapsed;
  return (
    <CodeView
      code={props.code}
      lit={props.lit}
      t={t}
      length={props.length}
      file={props.file}
      x={LEFT}
      y={props.top}
      w={ZONE_W}
      h={1780 - props.top}
      fade={420}
    />
  );
}

export default function Frame(props: z.infer<typeof schema>) {
  const { code, lit, film, width, height, length, file, hook } = props;
  const box = filmBox(width, height);
  const codeTop = box.y + box.h + 28;
  return (
    <Composition fps={30} width={W} height={H} background={{ type: "color", color: BG }}>
      <Track id="hook" layout="free">
        <Title
          id="hook-line"
          start={0}
          duration={length}
          style={{ font: display, size: 62, weight: 800, color: "#ffffff", align: "left" }}
          box={{ x: LEFT, y: 244, width: ZONE_W, height: 76, origin: "topLeft" }}
          enter={{ type: "slideUp", duration: 0.4, easing: "easeOutCubic" }}
        >
          {hook}
        </Title>
        <Title
          id="made-with"
          start={0.3}
          duration={length - 0.3}
          style={{ font: mono, size: 22, weight: 500, color: "#7d8597", align: "left" }}
          box={{ x: LEFT, y: 318, width: ZONE_W, height: 32, origin: "topLeft" }}
          enter={{ type: "fade", duration: 0.4 }}
        >
          {`made with UberScene · ${file}`}
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
          box={{ x: box.x, y: box.y, width: box.w, height: box.h, origin: "topLeft" }}
          transform={{ borderRadius: 18 }}
        />
      </Track>
      <Track id="code" layout="free">
        {/* A ground: it runs under the phone's caption and buttons, faded; the lit line is held inside the safe zone. */}
        <Layer id="source" start={0} duration={length} ground>
          <Code code={code} lit={lit} length={length} file={file} top={codeTop} />
        </Layer>
      </Track>
      <Track id="end" layout="free">
        <Shape
          id="end-card"
          type="rectangle"
          start={length}
          duration={END}
          width={W}
          height={H}
          fill={BG}
          box={{ x: W / 2, y: H / 2, origin: "center" }}
        />
        <Title
          id="end-name"
          start={length}
          duration={END}
          style={{ font: display, size: 120, weight: 800, color: "#ffffff", align: "center" }}
          box={{ x: W / 2, y: 640, width: ZONE_W, height: 150, origin: "center" }}
          enter={{ type: "scale", duration: 0.35, easing: "easeOutBack" }}
        >
          uberscene
        </Title>
        <Title
          id="end-line"
          start={length + 0.15}
          duration={END - 0.15}
          style={{ font: display, size: 44, weight: 400, color: "#ffc400", align: "center" }}
          box={{ x: W / 2, y: 760, width: ZONE_W, height: 60, origin: "center" }}
          enter={{ type: "fade", duration: 0.3 }}
        >
          video, written as code
        </Title>
        <Title
          id="end-url"
          start={length + 0.3}
          duration={END - 0.3}
          style={{ font: mono, size: 26, weight: 500, color: "#7d8597", align: "center" }}
          box={{ x: W / 2, y: 840, width: ZONE_W, height: 40, origin: "center" }}
          enter={{ type: "fade", duration: 0.3 }}
        >
          github.com/prefix-tree/uberscene
        </Title>
      </Track>
    </Composition>
  );
}

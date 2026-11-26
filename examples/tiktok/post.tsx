// The film version of a TikTok post, 1080x1920: just the film. A tall film fills the frame; a wide one sits across
// it, centred, over a blurred copy of itself, so there are no bars. `render.ts` hands the rendered film in.
import { z } from "zod";

import { Clip, Composition, Track } from "@uberscene/kit";

export const schema = z.object({
  film: z.string(),
  width: z.number(),
  height: z.number(),
  length: z.number(),
});

export const defaults: z.infer<typeof schema> = { film: "film", width: 1920, height: 1080, length: 4 };

const W = 1080;
const H = 1920;

export default function Post({ film, width, height, length }: z.infer<typeof schema>) {
  const tall = height > width;
  const h = tall ? H : Math.round((W * height) / width);
  return (
    <Composition
      fps={30}
      width={W}
      height={H}
      background={tall ? { type: "color", color: "#000000" } : { type: "blur" }}
    >
      <Track id="film" layout="free">
        <Clip
          id="the-film"
          src={`asset:${film}`}
          start={0}
          in={0}
          duration={length}
          fit={tall ? "cover" : "contain"}
          box={{ x: W / 2, y: H / 2, width: W, height: h, origin: "center" }}
        />
      </Track>
    </Composition>
  );
}

import { z } from "zod";

import { Captions, Clip, Composition, LowerThird, Title, Track, Transition } from "@uberscene/kit";

// What a person may change without touching the edit.
export const schema = z.object({
  product: z.string().describe("Product name in the title"),
  who: z.string().describe("Name on the lower third"),
});
export const defaults = { product: "Halvard", who: "Maya Chen" };

export default function Video({ product, who }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} theme={{ extends: "midnight" }}>
      <Track id="main">
        <Clip id="hook" src="asset:talk" in="word:3" out="word:14.end" fit="cover" />
        <Transition id="x1" type="crossfade" duration={0.4} />
        {/* A slow push-in, and a warm grade that comes in. */}
        <Clip
          id="broll"
          src="asset:broll"
          in="shot:1"
          out="shot:1.end"
          fit="cover"
          transform={{
            scale: [
              { at: 0, value: 1, easing: "easeInOutSine" },
              { at: 5, value: 1.1 },
            ],
          }}
          effects={[
            {
              type: "vibrance",
              amount: [
                { at: 0, value: 0 },
                { at: 1, value: 0.3 },
              ],
            },
          ]}
        />
      </Track>
      <Track id="text">
        <Title id="name" anchor="hook" at="word:5" duration={2.5} style="h1">
          {product}
        </Title>
        <LowerThird id="lt" anchor="hook" at="word:8" duration={3} name={who} role="Founder" />
      </Track>
      <Captions id="captions" src="asset:talk" animation="karaoke" />
    </Composition>
  );
}

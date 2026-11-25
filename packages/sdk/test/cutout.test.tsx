import { describe, expect, it } from "vitest";

import { Audio, Clip, Composition, Nested, Track } from "@uberscene/kit";
import { type AssetManifest, collect, lint, resolve } from "@uberscene/sdk";

import { manifest as sample } from "./helpers";

// `cutout` on a clip keeps the subject where the asset's matte (another video, named by "matte" on its entry) is
// white. The resolver and lint say what is missing when the matte is not there.

const withMatte: AssetManifest = {
  ...sample,
  assets: {
    ...sample.assets,
    interview: { ...sample.assets.interview!, matte: "interview.matte" },
    "interview.matte": { ...sample.assets.interview!, id: "interview.matte" },
    city: { ...sample.assets.city!, matte: "city.matte" },
    "logo.matte": { ...sample.assets.logo!, id: "logo.matte" },
  },
};

function errorsOf(clip: Record<string, unknown>, manifest: AssetManifest = withMatte) {
  const state = resolve(
    collect(
      <Composition fps={30} width={1920} height={1080}>
        <Track id="t">
          <Clip id="c" in={0} out={2} {...(clip as { src: string })} />
        </Track>
      </Composition>,
    ),
    manifest,
  );
  return state.errors.map((e) => ({ code: e.code, id: e.id, prop: e.prop, message: e.message }));
}

describe("cutout", () => {
  it("takes true or { shrink, feather } on a clip whose asset has a matte", () => {
    expect(errorsOf({ src: "asset:interview", cutout: true })).toEqual([]);
    expect(errorsOf({ src: "asset:interview", cutout: { shrink: 2, feather: 1.5 } })).toEqual([]);
    expect(errorsOf({ src: "asset:interview", cutout: false })).toEqual([]);
    // Without cutout, an asset with no matte is fine.
    expect(errorsOf({ src: "asset:city" }, sample)).toEqual([]);
  });

  it("refuses unknown fields and negative pixels", () => {
    expect(errorsOf({ src: "asset:interview", cutout: { shrink: -1 } }).map((e) => e.code)).toEqual(["SCHEMA"]);
    expect(errorsOf({ src: "asset:interview", cutout: { despill: 1 } }).map((e) => e.code)).toEqual(["SCHEMA"]);
  });

  it("says how to make a matte when the asset has none", () => {
    const [e, ...rest] = errorsOf({ src: "asset:interview", cutout: true }, sample);
    expect(rest).toEqual([]);
    expect(e).toMatchObject({ code: "SCHEMA", id: "c", prop: "cutout" });
    expect(e?.message).toContain("npx uberscene add interview.matte.webm");
    expect(e?.message).toContain('"matte": "interview.matte"');
  });

  it("reports a matte missing from the manifest, a matte that is not video, and a source that is not footage", () => {
    expect(errorsOf({ src: "asset:city", cutout: true })).toMatchObject([{ code: "MISSING_ASSET", prop: "cutout" }]);
    const imageMatte: AssetManifest = {
      ...withMatte,
      assets: { ...withMatte.assets, interview: { ...withMatte.assets.interview!, matte: "logo.matte" } },
    };
    expect(errorsOf({ src: "asset:interview", cutout: true }, imageMatte)).toMatchObject([
      { code: "SCHEMA", prop: "cutout", message: expect.stringContaining("is an image") },
    ]);
    const logo = errorsOf({ src: "asset:logo", cutout: true, in: undefined, out: undefined, duration: 2 });
    expect(logo).toMatchObject([
      { code: "SCHEMA", prop: "cutout", message: expect.stringContaining("an image asset") },
    ]);
  });

  it("is not a prop of <Nested> or <Audio>", () => {
    const Inner = () => (
      <Composition fps={30} width={1920} height={1080}>
        <Track id="i">
          <Clip id="x" src="asset:city" in={0} out={1} />
        </Track>
      </Composition>
    );
    const state = resolve(
      collect(
        <Composition fps={30} width={1920} height={1080}>
          <Track id="t">
            {/* @ts-expect-error cutout is a clip's */}
            <Nested id="n" of={Inner} duration={1} cutout />
          </Track>
          <Track id="a">
            {/* @ts-expect-error cutout is a clip's */}
            <Audio id="b" src="asset:bed" in={0} out={1} cutout />
          </Track>
        </Composition>,
      ),
      withMatte,
    );
    expect(state.errors.filter((e) => e.code === "SCHEMA").map((e) => e.id)).toEqual(["n", "b"]);
  });
});

describe("cutout-without-matte", () => {
  const file = (src: string) => `
import { Clip, Composition, Track } from "@uberscene/kit";
export default function V() {
  return (<Composition fps={30} width={1920} height={1080}><Track id="t"><Clip id="c" src="${src}" in={0} out={2} cutout /></Track></Composition>);
}
`;
  const run = (src: string, manifest: AssetManifest) =>
    lint(file(src), { manifest, rules: ["cutout-without-matte"] }).map((d) => `${d.severity}:${d.id}:${d.message}`);

  it("flags a cutout whose asset has no matte, saying how to add one", () => {
    const [d] = run("asset:interview", sample);
    expect(d).toMatch(/^error:c:cutout needs a matte for interview/);
    expect(d).toContain("npx uberscene add interview.matte.webm");
  });

  it("flags a matte the manifest does not have, and passes one it has", () => {
    expect(run("asset:city", withMatte)).toEqual([
      "error:c:the matte of city, asset city.matte, is not in the manifest",
    ]);
    expect(run("asset:interview", withMatte)).toEqual([]);
  });
});

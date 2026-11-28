import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ref, refSitesIn, SCHEMAS_BY_KIND } from "../src/schema";

const id = z.string();

const sites = (schema: z.ZodType): string[] =>
  refSitesIn(schema).map((s) => `${s.type}@${s.path.join(".")}${s.each ? `[${s.each}]` : ""}`);

describe("ref and refSitesIn", () => {
  it("finds a marked prop under optional and default, with the path to it", () => {
    const schema = z.strictObject({
      id,
      follow: ref("follow", id).optional(),
      style: z.strictObject({ like: ref("like", id).default("none") }).optional(),
    });
    expect(sites(schema)).toEqual(["follow@follow", "like@style.like"]);
  });

  it("finds a list of references and an object of them by name", () => {
    const schema = z.strictObject({
      push: z.strictObject({ on: z.array(ref("push", id)).min(1), keep: z.array(ref("push", id)).optional() }),
      times: z.record(z.string(), ref("time", z.union([z.number(), z.string()]))).optional(),
    });
    expect(sites(schema)).toEqual(["push@push.on[list]", "push@push.keep[list]", "time@times[record]"]);
  });

  it("finds a reference in each way a value may be written", () => {
    const schema = z.strictObject({
      duration: z.union([
        z.number(),
        z.strictObject({ match: ref("match", id) }),
        z.strictObject({ until: ref("until", id), at: z.string().optional() }),
      ]),
    });
    expect(sites(schema)).toEqual(["match@duration.match", "until@duration.until"]);
  });

  it("marks a copy, so the schema it was given is not a reference where it is used again", () => {
    const schema = z.strictObject({ id, anchor: ref("anchor", id) });
    expect(sites(schema)).toEqual(["anchor@anchor"]);
    expect(ref("anchor", id)).not.toBe(id);
    expect(ref("anchor", id).safeParse("a").success).toBe(true);
    expect(ref("anchor", id).safeParse(3).success).toBe(false);
  });

  it("gives the elements their references, in the schema's order", () => {
    expect(sites(SCHEMAS_BY_KIND.camera)).toEqual(["push@push.on[list]", "push@push.keep[list]"]);
    expect(sites(SCHEMAS_BY_KIND.transition)).toEqual(["on@on"]);
    expect(sites(SCHEMAS_BY_KIND.caption)).toEqual(["marker@start", "marker@end"]);
    expect(sites(SCHEMAS_BY_KIND.clip)).toEqual([
      "anchor@anchor",
      "match@duration.match",
      "until@duration.until",
      "marker@in",
      "marker@out",
      "sceneTime@times[record]",
      "duck@duck.under",
    ]);
    expect(sites(SCHEMAS_BY_KIND.title)).toEqual([
      "anchor@anchor",
      "match@duration.match",
      "until@duration.until",
      "follow@follow",
    ]);
    // An id is never a reference: it names the element itself.
    for (const schema of Object.values(SCHEMAS_BY_KIND))
      expect(refSitesIn(schema).some((s) => s.path.join(".") === "id")).toBe(false);
  });
});

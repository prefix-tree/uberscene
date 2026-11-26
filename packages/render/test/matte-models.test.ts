import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  acceptLicence,
  cachedModelPath,
  ensureModel,
  LicenceNotAccepted,
  licenceAccepted,
  matteModel,
  matteModels,
} from "../src/matte/models";

// The models `uberscene matte` lists, their download into the cache, and the licence asked for first. No network.

const scratch = join(import.meta.dirname, ".tmp", "matte-models");
let dir = "";
const stub = join(import.meta.dirname, "fixtures", "matte", "stub.onnx");
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "m-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** A registry file with the stub model under `name`, and an environment pointing at it and at a fresh cache. */
function withStub(name = "stub", hash = sha(readFileSync(stub)), source = pathToFileURL(stub).href) {
  const registry = join(dir, `${name}-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(
    registry,
    JSON.stringify({
      [name]: {
        title: "a stand-in",
        source,
        sha256: hash,
        bytes: readFileSync(stub).length,
        licence: "MIT",
        licenceUrl: "https://example.com/licence",
        input: "src",
        output: "pha",
      },
    }),
  );
  const env = { UBERSCENE_MODEL_REGISTRY: registry, UBERSCENE_MODEL_CACHE: mkdtempSync(join(dir, "cache-")) };
  return { env, model: matteModel(name, matteModels(env)) };
}

describe("the registry", () => {
  it("lists the package's models, RVM ResNet-50 the default, each with a checksum and a licence", () => {
    const models = matteModels({});
    expect(models.map((m) => m.name)).toEqual(expect.arrayContaining(["rvm-resnet50", "rvm-mobilenet", "u2net-human"]));
    expect(matteModel(undefined, models)).toMatchObject({ name: "rvm-resnet50", licence: "GPL-3.0" });
    for (const m of models) expect(m.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(matteModel("rvm-resnet50", models).recurrent).toMatchObject({
      inputs: ["r1i", "r2i", "r3i", "r4i"],
      warmup: 6,
    });
  });

  it("adds the models of UBERSCENE_MODEL_REGISTRY, and says which entry of a bad one is wrong", () => {
    const { env } = withStub();
    expect(matteModels(env).map((m) => m.name)).toContain("stub");
    const bad = join(dir, "bad.json");
    writeFileSync(bad, JSON.stringify({ Bad: { title: "x" } }));
    expect(() => matteModels({ UBERSCENE_MODEL_REGISTRY: bad })).toThrow(/not a list of matting models: Bad/);
    expect(() => matteModel("nope", matteModels({}))).toThrow(/no matting model "nope"; there are: rvm-resnet50/);
  });
});

describe("the licence", () => {
  it("is asked for before the first download, and remembered once accepted", async () => {
    const { env, model } = withStub();
    expect(licenceAccepted(model, env)).toBe(false);
    await expect(ensureModel(model, { env })).rejects.toBeInstanceOf(LicenceNotAccepted);
    await expect(ensureModel(model, { env })).rejects.toThrow(
      /licensed MIT.*\n.*does not ship it.*\n.*\n.*--accept-licence/s,
    );
    acceptLicence(model, env);
    expect(licenceAccepted(model, env)).toBe(true);
    // A new file under the same name is a new licence to accept.
    expect(licenceAccepted({ ...model, sha256: "0".repeat(64) }, env)).toBe(false);
  });

  it("is accepted for a model UBERSCENE_ACCEPT_LICENCE names", () => {
    const { env, model } = withStub();
    expect(licenceAccepted(model, { ...env, UBERSCENE_ACCEPT_LICENCE: "other, stub" })).toBe(true);
  });
});

describe("the download", () => {
  it("fetches the model into the cache under its checksum, once", async () => {
    const bytes = readFileSync(stub);
    const { env, model } = withStub("served", sha(bytes), "https://example.com/stub.onnx");
    acceptLicence(model, env);
    let calls = 0;
    const served = (async () => {
      calls++;
      return new Response(bytes);
    }) as unknown as typeof fetch;
    const lines: string[] = [];
    const path = await ensureModel(model, { env, fetch: served, log: (m) => lines.push(m) });
    expect(path).toBe(cachedModelPath(model, env));
    expect(readFileSync(path)).toEqual(bytes);
    expect(lines[0]).toMatch(/downloading served .*MIT.* from https:\/\/example.com\/stub.onnx \(once\)/);
    await ensureModel(model, { env, fetch: served });
    expect(calls).toBe(1);
  });

  it("refuses a file that is not the one listed, and leaves nothing in the cache", async () => {
    const { env, model } = withStub("wrong", "f".repeat(64));
    acceptLicence(model, env);
    await expect(ensureModel(model, { env })).rejects.toThrow(/is not wrong \(sha256 [0-9a-f]{64}, expected f{64}\)/);
    expect(existsSync(cachedModelPath(model, env))).toBe(false);
  });

  it("says what the source answered when it is not there", async () => {
    const { env, model } = withStub("gone", undefined, "https://example.com/gone.onnx");
    acceptLicence(model, env);
    const missing = (async () => new Response("no", { status: 404 })) as unknown as typeof fetch;
    await expect(ensureModel(model, { env, fetch: missing })).rejects.toThrow(/answered 404/);
  });
});

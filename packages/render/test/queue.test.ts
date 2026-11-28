// The render queue: a queue file is checked whole before anything renders, and its jobs run in order with one summary.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { formatQueue, type QueueJob, readQueue, runQueue } from "../src/queue";

const dir = mkdtempSync(join(tmpdir(), "uberscene-queue-"));
mkdirSync(join(dir, "cuts"));
writeFileSync(join(dir, "cuts", "video.tsx"), "");
writeFileSync(join(dir, "cuts", "teaser.tsx"), "");
writeFileSync(join(dir, "cuts", "assets.json"), "{}");
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let n = 0;
function queueFile(data: unknown): string {
  const path = join(dir, `q${n++}.json`);
  writeFileSync(path, typeof data === "string" ? data : JSON.stringify(data));
  return path;
}

describe("readQueue", () => {
  it("takes { jobs } and resolves every path from the queue file's folder", () => {
    const jobs = readQueue(
      queueFile({
        jobs: [
          { file: "cuts/video.tsx", out: "out/wide.mp4" },
          {
            file: "cuts/teaser.tsx",
            out: "out/teaser.webm",
            props: { aspect: "9:16" },
            from: 2,
            to: 8,
            codec: "vp9",
            quality: "high",
            manifest: "cuts/assets.json",
            silent: true,
          },
        ],
      }),
    );
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({ file: join(dir, "cuts", "video.tsx"), out: join(dir, "out", "wide.mp4") });
    expect(jobs[1]).toMatchObject({
      props: { aspect: "9:16" },
      from: 2,
      to: 8,
      codec: "vp9",
      quality: "high",
      manifest: join(dir, "cuts", "assets.json"),
      silent: true,
      label: { file: "cuts/teaser.tsx", out: "out/teaser.webm" },
    });
  });

  it("takes the list of jobs alone", () => {
    expect(readQueue(queueFile([{ file: "cuts/video.tsx", out: "a.mp4" }]))).toHaveLength(1);
  });

  it("names a draft's file as --draft writes it", () => {
    const [job] = readQueue(queueFile([{ file: "cuts/video.tsx", out: "a.mp4", draft: true }]));
    expect(job?.label.out).toBe("a.draft.mp4");
    expect(job?.out).toBe(join(dir, "a.mp4"));
  });

  it("reports every problem at once, each naming its job", () => {
    const path = queueFile({
      jobs: [
        { file: "cuts/video.tsx", out: "a.mp4" },
        { file: "cuts/missing.tsx", out: "b.mp4" },
        { file: "cuts/video.tsx", out: "c.mp4", codec: "h265" },
        { file: "cuts/video.tsx", out: "d.mp4", quality: "high", bitrate: 1e6 },
        { file: "cuts/video.tsx", out: "e.mp4", from: 4, to: 2 },
        { file: "cuts/video.tsx", out: "a.mp4" },
        { file: "cuts/video.tsx" },
        { file: "cuts/video.tsx", out: "f.mp4", fps: 60 },
        { file: "cuts/video.tsx", out: "g.png", still: 1 },
      ],
    });
    let message = "";
    try {
      readQueue(path);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("job 2 (b.mp4): cuts/missing.tsx does not exist");
    expect(message).toContain("job 3 (c.mp4): codec wants avc, vp9, av1, prores");
    expect(message).toContain("job 4 (d.mp4): quality and bitrate both set the size");
    expect(message).toContain("job 5 (e.mp4): to (2) must be after from (4)");
    expect(message).toContain("job 6 (a.mp4): job 1 writes a.mp4 too");
    expect(message).toContain("job 7: out is missing");
    expect(message).toContain("job 8 (f.mp4): unknown key fps");
    expect(message).toContain("job 9 (g.png): a queue renders videos");
    expect(message).not.toContain("job 1 (a.mp4)");
  });

  it("refuses a file that is not a queue", () => {
    expect(() => readQueue(queueFile("{ nope"))).toThrow(/q\d+\.json: /);
    expect(() => readQueue(queueFile({ tasks: [] }))).toThrow(/a queue is \{ "jobs": \[\.\.\.\] \} or a list of jobs/);
    expect(() => readQueue(queueFile({ jobs: [] }))).toThrow(/the queue has no jobs/);
  });
});

const job = (out: string): QueueJob => ({ label: { file: "video.tsx", out }, file: "/v/video.tsx", out: `/v/${out}` });
const jobs = [job("a.mp4"), job("b.mp4"), job("c.mp4")];
const failOn = (out: string) => async (j: QueueJob) => {
  if (j.label.out === out) throw new Error("no such asset: logo");
};

describe("runQueue", () => {
  it("runs every job in order", async () => {
    const ran: string[] = [];
    const started: string[] = [];
    const report = await runQueue(jobs, {
      render: async (j) => {
        ran.push(j.label.out);
      },
      onStart: (j, i, count) => started.push(`${i + 1}/${count} ${j.label.out}`),
    });
    expect(ran).toEqual(["a.mp4", "b.mp4", "c.mp4"]);
    expect(started).toEqual(["1/3 a.mp4", "2/3 b.mp4", "3/3 c.mp4"]);
    expect(report).toMatchObject({ done: 3, failed: 0, skipped: 0 });
  });

  it("stops at the first failure and skips the rest", async () => {
    const report = await runQueue(jobs, { render: failOn("b.mp4") });
    expect(report.jobs.map((r) => r.status)).toEqual(["done", "failed", "skipped"]);
    expect(report.jobs[1]?.error).toBe("no such asset: logo");
  });

  it("runs every job with continueOnError", async () => {
    const report = await runQueue(jobs, { render: failOn("b.mp4"), continueOnError: true });
    expect(report.jobs.map((r) => r.status)).toEqual(["done", "failed", "done"]);
    expect(report).toMatchObject({ done: 2, failed: 1, skipped: 0 });
  });

  it("prints one line per job and the totals", async () => {
    let t = 0;
    const report = await runQueue(jobs, {
      render: failOn("b.mp4"),
      now: () => {
        t += 1500;
        return t;
      },
    });
    expect(formatQueue(report)).toBe(
      "1. a.mp4: done in 1.5s\n2. b.mp4: failed: no such asset: logo\n3. c.mp4: skipped\n" +
        "3 jobs: 1 done, 1 failed, 1 skipped (--continue-on-error runs them)\n",
    );
  });
});

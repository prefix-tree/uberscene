// `uberscene queue jobs.json`: several exports from one file, in order, with one summary at the end.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { z } from "zod";

import { CONTAINERS, type Container, QUALITIES, type QualityName, type VideoCodec } from "./encoding";
import { draftPath } from "./renderer";

const CODECS = ["avc", "vp9", "av1", "prores"] as const;

/** One job of a queue file: the same meaning and checks as the export's flags. */
const jobSchema = z
  .object({
    /** The video file, relative to the queue file. */
    file: z.string().min(1),
    /** Where to write, relative to the queue file; the extension picks the container unless format is set. */
    out: z.string().min(1),
    /** Props for the file's component. */
    props: z.record(z.string(), z.unknown()).optional(),
    /** Render only this part, in seconds. */
    from: z.number().min(0).optional(),
    to: z.number().positive().optional(),
    format: z.enum(CONTAINERS).optional(),
    codec: z.enum(CODECS).optional(),
    quality: z.enum(Object.keys(QUALITIES) as [QualityName, ...QualityName[]]).optional(),
    bitrate: z.number().positive().optional(),
    /** An asset manifest, relative to the queue file. */
    manifest: z.string().min(1).optional(),
    draft: z.boolean().optional(),
    silent: z.boolean().optional(),
  })
  .strict();

/** A queue file: `{ "jobs": [...] }`, or the list of jobs alone. */
const queueSchema = z.union([z.object({ jobs: z.array(z.unknown()) }).strict(), z.array(z.unknown())]);

/** A job as it runs: its paths absolute, and the names it was written with for messages. */
export interface QueueJob {
  /** The file and the out as the queue file wrote them. */
  readonly label: { readonly file: string; readonly out: string };
  readonly file: string;
  /** The out as given; a draft lands beside it as `<name>.draft.<ext>`, as `--draft` does. */
  readonly out: string;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly from?: number;
  readonly to?: number;
  readonly format?: Container;
  readonly codec?: VideoCodec;
  readonly quality?: QualityName;
  readonly bitrate?: number;
  readonly manifest?: string;
  readonly draft?: boolean;
  readonly silent?: boolean;
}

/**
 * Reads a queue file and checks every job before anything renders: the shape, that each file exists, values the
 * flags would refuse, and two jobs writing one file. Each problem names its job, so a typo in the third job is found
 * in a second, not after the second job's export.
 */
export function readQueue(path: string): QueueJob[] {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const queue = queueSchema.safeParse(data);
  if (!queue.success) throw new Error(`${path}: a queue is { "jobs": [...] } or a list of jobs`);
  const list = Array.isArray(queue.data) ? queue.data : queue.data.jobs;
  if (list.length === 0) throw new Error(`${path}: the queue has no jobs`);
  const base = dirname(resolve(path));
  const problems: string[] = [];
  const jobs: QueueJob[] = [];
  const outs = new Map<string, number>();
  for (const [i, raw] of list.entries()) {
    const out = typeof raw === "object" && raw !== null && "out" in raw ? String(raw.out) : undefined;
    const name = `job ${i + 1}${out ? ` (${out})` : ""}`;
    const problem = (message: string) => problems.push(`${name}: ${message}`);
    if (typeof raw === "object" && raw !== null && "still" in raw) {
      problem("a queue renders videos; write a still with --still on its own");
      continue;
    }
    const parsed = jobSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) problem(describeIssue(issue));
      continue;
    }
    const job = parsed.data;
    const file = resolve(base, job.file);
    if (!existsSync(file)) problem(`${job.file} does not exist`);
    if (job.manifest !== undefined && !existsSync(resolve(base, job.manifest)))
      problem(`the manifest ${job.manifest} does not exist`);
    if (job.quality !== undefined && job.bitrate !== undefined)
      problem("quality and bitrate both set the size; give one");
    if (job.from !== undefined && job.to !== undefined && job.to <= job.from)
      problem(`to (${job.to}) must be after from (${job.from})`);
    const written = job.draft ? draftPath(resolve(base, job.out)) : resolve(base, job.out);
    const earlier = outs.get(written);
    if (earlier !== undefined) problem(`job ${earlier} writes ${job.out} too; give each job its own out`);
    else outs.set(written, i + 1);
    jobs.push({
      label: { file: job.file, out: job.draft ? draftPath(job.out) : job.out },
      file,
      out: resolve(base, job.out),
      ...(job.props ? { props: job.props } : {}),
      ...(job.from !== undefined ? { from: job.from } : {}),
      ...(job.to !== undefined ? { to: job.to } : {}),
      ...(job.format ? { format: job.format } : {}),
      ...(job.codec ? { codec: job.codec } : {}),
      ...(job.quality ? { quality: job.quality } : {}),
      ...(job.bitrate !== undefined ? { bitrate: job.bitrate } : {}),
      ...(job.manifest !== undefined ? { manifest: resolve(base, job.manifest) } : {}),
      ...(job.draft ? { draft: true } : {}),
      ...(job.silent ? { silent: true } : {}),
    });
  }
  if (problems.length > 0) throw new Error(`${path}:\n  ${problems.join("\n  ")}`);
  return jobs;
}

function describeIssue(issue: z.core.$ZodIssue): string {
  const key = issue.path.join(".");
  if (issue.code === "unrecognized_keys")
    return `unknown ${issue.keys.length > 1 ? "keys" : "key"} ${issue.keys.join(", ")}`;
  if (issue.code === "invalid_value") return `${key} wants ${issue.values.join(", ")}`;
  if (issue.code === "invalid_type" && issue.input === undefined) return `${key} is missing`;
  return key ? `${key}: ${issue.message}` : issue.message;
}

/** How one job ended. */
interface QueueResult {
  readonly file: string;
  readonly out: string;
  readonly status: "done" | "failed" | "skipped";
  /** Wall time of a job that ran. */
  readonly seconds?: number;
  readonly error?: string;
}

export interface QueueReport {
  readonly jobs: readonly QueueResult[];
  readonly done: number;
  readonly failed: number;
  readonly skipped: number;
}

/**
 * Runs the jobs in order. The first failure stops the queue and the rest are skipped, unless `continueOnError`.
 * Each export is written atomically, so a failed job leaves no half file and keeps an older good one.
 */
export async function runQueue(
  jobs: readonly QueueJob[],
  options: {
    readonly render: (job: QueueJob) => Promise<void>;
    readonly continueOnError?: boolean;
    readonly onStart?: (job: QueueJob, index: number, count: number) => void;
    readonly now?: () => number;
  },
): Promise<QueueReport> {
  const now = options.now ?? (() => performance.now());
  const results: QueueResult[] = [];
  let stopped = false;
  for (const [i, job] of jobs.entries()) {
    const names = { file: job.label.file, out: job.label.out };
    if (stopped) {
      results.push({ ...names, status: "skipped" });
      continue;
    }
    options.onStart?.(job, i, jobs.length);
    const start = now();
    try {
      await options.render(job);
      results.push({ ...names, status: "done", seconds: (now() - start) / 1000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ ...names, status: "failed", seconds: (now() - start) / 1000, error: message });
      if (!options.continueOnError) stopped = true;
    }
  }
  const count = (status: QueueResult["status"]) => results.filter((r) => r.status === status).length;
  return { jobs: results, done: count("done"), failed: count("failed"), skipped: count("skipped") };
}

/** The summary: one line per job, then the totals. */
export function formatQueue(report: QueueReport): string {
  const lines = report.jobs.map((r, i) => {
    const head = `${i + 1}. ${r.out}`;
    if (r.status === "done") return `${head}: done in ${(r.seconds ?? 0).toFixed(1)}s`;
    if (r.status === "failed") return `${head}: failed: ${r.error ?? "unknown error"}`;
    return `${head}: skipped`;
  });
  const parts = [`${report.done} done`];
  if (report.failed > 0) parts.push(`${report.failed} failed`);
  if (report.skipped > 0)
    parts.push(`${report.skipped} skipped${report.failed > 0 ? " (--continue-on-error runs them)" : ""}`);
  return `${lines.join("\n")}\n${report.jobs.length} jobs: ${parts.join(", ")}\n`;
}

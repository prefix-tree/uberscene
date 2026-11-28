// `uberscene find`, `uberscene fetch` and `uberscene credits` on the command line.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { AssetManifest } from "@uberscene/sdk";

import { findManifest } from "../manifest-file";
import { fetchStock, findStock, stockCredits } from "./index";
import { stockSheet } from "./sheet";
import type { StockSearch } from "./types";

export interface StockFlags {
  readonly sound?: boolean | undefined;
  readonly limit?: string | undefined;
  readonly orientation?: string | undefined;
  readonly "min-duration"?: string | undefined;
  readonly sheet?: string | undefined;
  readonly json?: boolean | undefined;
  readonly fresh?: boolean | undefined;
  readonly id?: string | undefined;
  readonly manifest?: string | undefined;
  readonly dir?: string | undefined;
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly height?: string | undefined;
  readonly out?: string | undefined;
}

const say = (m: string) => process.stderr.write(`${m}\n`);

const num = (name: string, v: string | undefined): number | undefined => {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`--${name} wants a number, got "${v}"`);
  return n;
};

/** Runs `find`, `fetch` or `credits`; returns the exit code. */
export async function stockCommand(
  command: "find" | "fetch" | "credits",
  args: readonly string[],
  flags: StockFlags,
  usage: string,
): Promise<number> {
  if (command === "find") {
    const [library, ...words] = args;
    if (!library || words.length === 0) {
      process.stderr.write(usage);
      return 2;
    }
    if (flags.orientation !== undefined && flags.orientation !== "portrait" && flags.orientation !== "landscape")
      throw new Error(`--orientation is portrait or landscape, got "${flags.orientation}"`);
    const limit = num("limit", flags.limit);
    const minDuration = num("min-duration", flags["min-duration"]);
    const search: StockSearch = {
      query: words.join(" "),
      kind: flags.sound ? "audio" : "video",
      ...(limit !== undefined ? { limit } : {}),
      ...(flags.orientation ? { orientation: flags.orientation as "portrait" | "landscape" } : {}),
      ...(minDuration !== undefined ? { minDuration } : {}),
    };
    const found = await findStock(library, search, { ...(flags.fresh ? { fresh: true } : {}) });
    if (flags.json) process.stdout.write(`${JSON.stringify(found, null, 2)}\n`);
    else
      for (const [i, c] of found.entries())
        process.stdout.write(
          `${String(i + 1).padStart(3)}  ${c.ref.padEnd(28)} ${`${c.duration.toFixed(1)} s`.padStart(8)}  ${(c.width ? `${c.width}x${c.height}` : "").padEnd(10)} ${c.source.licence.padEnd(24)} ${c.source.author}\n`,
        );
    if (found.length === 0) say(`nothing found for "${search.query}"`);
    if (flags.sheet && found.length > 0) {
      const { width, height } = await stockSheet(found, resolve(flags.sheet));
      say(`${flags.sheet}: ${found.length} candidates, ${width}x${height}`);
    }
    return 0;
  }
  if (command === "fetch") {
    if (args.length !== 1) {
      process.stderr.write(usage);
      return 2;
    }
    const from = num("from", flags.from);
    const to = num("to", flags.to);
    const height = num("height", flags.height);
    const r = await fetchStock(args[0] as string, {
      ...(flags.id ? { id: flags.id } : {}),
      ...(flags.manifest ? { manifest: flags.manifest } : {}),
      ...(flags.dir ? { dir: flags.dir } : {}),
      ...(from !== undefined ? { from } : {}),
      ...(to !== undefined ? { to } : {}),
      ...(height !== undefined ? { height } : {}),
      log: say,
    });
    const e = r.entry;
    say(
      `${e.id}: ${e.kind}, ${e.duration} s${e.width ? `, ${e.width}x${e.height}` : ""} → ${r.file}\n  ${e.source?.licence} · ${e.source?.author} · ${e.source?.page}`,
    );
    return 0;
  }
  const manifestPath = resolve(flags.manifest ?? findManifest(process.cwd()).path ?? "uberscene.json");
  if (!existsSync(manifestPath)) throw new Error(`${manifestPath} does not exist`);
  const table = stockCredits(JSON.parse(readFileSync(manifestPath, "utf8")) as AssetManifest);
  if (!table) {
    say("no fetched assets in the manifest: credits come from `uberscene fetch`");
    return 0;
  }
  if (flags.out) {
    writeFileSync(resolve(flags.out), `# Credits\n\n${table}\n`);
    say(`${flags.out}: ${table.split("\n").length - 2} assets`);
  } else process.stdout.write(`${table}\n`);
  return 0;
}

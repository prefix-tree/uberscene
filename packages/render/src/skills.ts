// `uberscene skills install`: the agent skills that ship inside this package, written into a project, so an agent is
// taught the commands of the CLI that is installed and not those of another version. Two skills: `uberscene` (how to
// write, check and render a video) and `uberscene-setup` (how to install, check and upgrade UberScene itself), written
// side by side. The plugin marketplace stays a way to get them too; these cannot drift from the CLI.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Where an install records what it wrote, inside the skill's folder. */
const MARKER = ".uberscene-skill.json";
/** Claude Code reads a project's skills from here; other agents take `--dir`. */
export const DEFAULT_SKILL_DIR = join(".claude", "skills", "uberscene");
/** The skills this package ships: the one that makes videos, and the one that sets UberScene up. */
export const SKILL = "uberscene";
export const SETUP_SKILL = "uberscene-setup";

interface Marker {
  readonly version: string;
  /** Each file written, by its path in the folder, with the SHA-256 of what was written. */
  readonly files: Readonly<Record<string, string>>;
}

export interface SkillInstallOptions {
  /** The folder to write the skill into; default `.claude/skills/uberscene` under `cwd`. */
  readonly dir?: string;
  /** Replace files edited since the last install, or a folder this command did not write. */
  readonly force?: boolean;
  readonly cwd?: string;
  /** Where the skill is read from; default the one shipped with this package. */
  readonly source?: string;
  /** Which shipped skill to write: `uberscene` (the default) or `uberscene-setup`. */
  readonly skill?: typeof SKILL | typeof SETUP_SKILL;
}

export interface SkillInstallResult {
  readonly dir: string;
  readonly version: string;
  /** The version the folder held before, when this command wrote it. */
  readonly previous?: string;
  readonly files: readonly string[];
}

/** A skill shipped with this package: copied into `dist/skill` at build, read from the repository when run from source. */
function skillSource(name: string = SKILL): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const built = join(here, "skill", name);
  if (existsSync(join(built, "SKILL.md"))) return built;
  const repo = resolve(here, "..", "..", "..", "plugins", "uberscene", "skills", name);
  if (existsSync(join(repo, "SKILL.md"))) return repo;
  throw new Error(`the ${name} skill is not in this package (looked in ${built} and ${repo})`);
}

/** This package's version, which every UberScene package shares. */
export function packageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const dir of [resolve(here, ".."), resolve(here, "..", "..")]) {
    const file = join(dir, "package.json");
    if (existsSync(file)) {
      const pkg = JSON.parse(readFileSync(file, "utf8")) as { name?: string; version?: string };
      if (pkg.name === "@uberscene/render" && pkg.version) return pkg.version;
    }
  }
  return "0.0.0";
}

/** Every file under a folder, as paths relative to it, in a stable order. */
function filesIn(dir: string): string[] {
  const out: string[] = [];
  const walk = (at: string) => {
    for (const name of readdirSync(at).sort()) {
      const path = join(at, name);
      if (statSync(path).isDirectory()) walk(path);
      else out.push(relative(dir, path));
    }
  };
  walk(dir);
  return out;
}

const sha256 = (bytes: Buffer | string): string => createHash("sha256").update(bytes).digest("hex");

/**
 * Writes the skill into a project. A folder this command wrote before is updated when its files are as it left them;
 * one with edited files, or a folder it did not write, is left alone unless `force` is given, and the error names what
 * would change. Nothing it did not write is ever deleted: with `force`, the skill's own earlier files (those its marker
 * lists) are removed, and in a folder without a marker its files are written over the ones they share, beside the rest.
 */
export function installSkill(options: SkillInstallOptions = {}): SkillInstallResult {
  const cwd = options.cwd ?? process.cwd();
  const dir = resolve(cwd, options.dir ?? DEFAULT_SKILL_DIR);
  const source = options.source ?? skillSource(options.skill);
  const version = packageVersion();
  const markerPath = join(dir, MARKER);
  let previous: Marker | undefined;

  if (existsSync(dir) && readdirSync(dir).length > 0) {
    if (existsSync(markerPath)) {
      previous = JSON.parse(readFileSync(markerPath, "utf8")) as Marker;
      const edited = Object.entries(previous.files)
        .filter(([file, hash]) => !existsSync(join(dir, file)) || sha256(readFileSync(join(dir, file))) !== hash)
        .map(([file]) => file);
      const added = filesIn(dir).filter((f) => f !== MARKER && !(f in previous!.files));
      if ((edited.length > 0 || added.length > 0) && !options.force)
        throw new Error(
          `${dir} has changes since the skill was installed (${[...edited, ...added].join(", ")}); keep them, or run again with --force to replace the skill's own files (files you added are kept)`,
        );
      removeOwnFiles(dir, Object.keys(previous.files));
    } else if (!options.force) {
      throw new Error(
        `${dir} already holds files this command did not write; run again with --force to write the skill's files beside them (nothing there is deleted, a file of the same name is replaced)`,
      );
    }
  }

  const files = filesIn(source);
  const written: Record<string, string> = {};
  for (const file of files) {
    const bytes = readFileSync(join(source, file));
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), bytes);
    written[file] = sha256(bytes);
  }
  writeFileSync(markerPath, `${JSON.stringify({ version, files: written } satisfies Marker, null, 2)}\n`);
  return { dir, version, ...(previous ? { previous: previous.version } : {}), files };
}

/**
 * Writes both skills: `uberscene` into `dir` (default `.claude/skills/uberscene`), and `uberscene-setup` beside it, in
 * the same skills folder. The setup skill is written only when `dir` is a folder named `uberscene`, so that "beside it"
 * is a skills folder; with any other `dir` (the skills folder itself, the project) it is left out rather than written
 * somewhere nobody asked for, and the result says so by holding one skill.
 */
export function installSkills(options: Omit<SkillInstallOptions, "skill"> = {}): SkillInstallResult[] {
  const main = installSkill({ ...options, skill: SKILL });
  if (basename(main.dir) !== SKILL) return [main];
  const { source: _source, ...rest } = options;
  return [main, installSkill({ ...rest, dir: join(dirname(main.dir), SETUP_SKILL), skill: SETUP_SKILL })];
}

/**
 * Deletes the files an earlier install wrote, as its marker lists them, and then any folder of theirs that is left
 * empty. A listed path that would leave `dir` is skipped: the marker is a file anyone can edit.
 */
function removeOwnFiles(dir: string, files: readonly string[]): void {
  const parents = new Set<string>();
  for (const file of files) {
    const path = resolve(dir, file);
    if (relative(dir, path).startsWith("..") || isAbsolute(relative(dir, path))) continue;
    rmSync(path, { force: true });
    for (
      let at = dirname(path);
      at !== dir && relative(dir, at) && !relative(dir, at).startsWith("..");
      at = dirname(at)
    )
      parents.add(at);
  }
  // Deepest first, so a folder emptied by its children's removal goes too.
  for (const at of [...parents].sort((a, b) => b.length - a.length))
    if (existsSync(at) && readdirSync(at).length === 0) rmSync(at, { recursive: true, force: true });
}

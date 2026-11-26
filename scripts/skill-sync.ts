// Synced sections of the agent skill: a part of a page written by hand that is generated from the code instead, so
// the skill cannot teach an API the code no longer has. A section is two comments around the generated text:
//
//   <!-- sync: example the-file.tsx -->
//   ...generated, overwritten by `pnpm docs:gen`...
//   <!-- /sync -->
//
// The first word after `sync:` names a generator, the rest are its arguments. `pnpm docs:gen` fills every section;
// `pnpm docs:check` (in CI) fails when one differs from what its generator writes now, as it does for every other
// generated page. Everything outside the markers stays the author's.

/** Writes a section's text from its arguments; throws, with a message for the author, on arguments it cannot use. */
export type SyncGenerator = (args: readonly string[]) => string;

interface SyncedPage {
  /** The page with every section filled. */
  readonly text: string;
  /** What is wrong with the page's markers, each as `file:line: message`. */
  readonly problems: readonly string[];
  /** Each section's generator and arguments, in page order. */
  readonly sections: readonly { readonly kind: string; readonly args: readonly string[] }[];
}

const OPEN = /^<!-- sync: ?(.*?) ?-->$/;
const CLOSE = "<!-- /sync -->";

/** Fills every synced section of a page. A section a generator cannot write keeps its old text, and is a problem. */
export function fillSections(
  file: string,
  text: string,
  generators: Readonly<Record<string, SyncGenerator>>,
): SyncedPage {
  const lines = text.split("\n");
  const out: string[] = [];
  const problems: string[] = [];
  const sections: { kind: string; args: string[] }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    const open = OPEN.exec(line.trim());
    if (!open) {
      if (line.trim() === CLOSE) problems.push(`${file}:${i + 1}: ${CLOSE} with no section open`);
      out.push(line);
      continue;
    }
    const end = lines.findIndex((l, j) => j > i && (l.trim() === CLOSE || OPEN.test(l.trim())));
    if (end === -1 || (lines[end] as string).trim() !== CLOSE) {
      problems.push(`${file}:${i + 1}: section is not closed by ${CLOSE} before the next one or the end`);
      out.push(line);
      continue;
    }
    const [kind = "", ...args] = (open[1] as string).split(/\s+/).filter(Boolean);
    sections.push({ kind, args });
    const generate = generators[kind];
    let body: string | undefined;
    if (!generate)
      problems.push(`${file}:${i + 1}: no sync generator "${kind}" (${Object.keys(generators).join(", ")})`);
    else
      try {
        body = generate(args).trim();
      } catch (error) {
        problems.push(`${file}:${i + 1}: sync: ${kind}: ${(error as Error).message}`);
      }
    // The open marker keeps its indent, so a section can sit inside a list item; the text takes the same indent.
    const indent = /^\s*/.exec(line)?.[0] ?? "";
    out.push(line);
    if (body === undefined) out.push(...lines.slice(i + 1, end));
    else out.push(...body.split("\n").map((l) => (l ? indent + l : l)));
    out.push(lines[end] as string);
    i = end;
  }
  return { text: out.join("\n"), problems, sections };
}

/** A fenced code block, its language from the file's extension. */
export function fence(path: string, code: string): string {
  const ext = /\.([a-z]+)$/.exec(path)?.[1] ?? "";
  const lang = { mjs: "js", cjs: "js", yml: "yaml" }[ext] ?? ext;
  return `\`\`\`${lang}\n${code.replace(/\n+$/, "")}\n\`\`\``;
}

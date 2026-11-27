import { createRequire } from "node:module";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const ts = createRequire(join(root, "packages", "sdk", "package.json"))("typescript") as typeof import("typescript");

export interface ApiExport {
  readonly name: string;
  /** `function`, `class`, `const`, `type`, `interface`, `enum` or `namespace`. */
  readonly kind: string;
  /** The first sentence of its JSDoc, or empty. */
  readonly doc: string;
}

export interface ApiEntry {
  /** The import specifier (`@uberscene/kit/schema`). */
  readonly specifier: string;
  readonly exports: readonly ApiExport[];
}

/** Every public entry a package's `exports` names, except CSS and the JSX runtime. */
const ENTRIES: readonly { readonly pkg: string; readonly name: string }[] = [
  { pkg: "kit", name: "." },
  { pkg: "kit", name: "./schema" },
  { pkg: "sdk", name: "." },
  { pkg: "sdk", name: "./resolver" },
  { pkg: "player", name: "." },
  { pkg: "player", name: "./engine" },
  { pkg: "editor", name: "." },
  { pkg: "render", name: "." },
  { pkg: "graphics", name: "." },
  { pkg: "graphics", name: "./libraries" },
  { pkg: "graphics", name: "./three" },
  { pkg: "graphics", name: "./motion" },
];

function kindOf(symbol: import("typescript").Symbol): string {
  const f = symbol.flags;
  if (f & ts.SymbolFlags.Class) return "class";
  if (f & ts.SymbolFlags.Function) return "function";
  if (f & ts.SymbolFlags.Enum) return "enum";
  if (f & ts.SymbolFlags.Variable) return "const";
  if (f & ts.SymbolFlags.Interface) return "interface";
  if (f & ts.SymbolFlags.TypeAlias) return "type";
  if (f & ts.SymbolFlags.Module) return "namespace";
  return "other";
}

/** The first sentence of a JSDoc comment, on one line. A `.` or `:` inside a code span does not end it. */
function firstSentence(text: string): string {
  const flat = text.replace(/\s*\n\s*/g, " ").trim();
  let code = false;
  for (let i = 0; i < flat.length; i++) {
    const c = flat[i];
    if (c === "`") code = !code;
    else if (!code && (c === "." || c === ":") && (i + 1 === flat.length || /\s/.test(flat[i + 1] as string)))
      return flat.slice(0, i + 1).replace(/:$/, ".");
  }
  return flat;
}

interface PackageProgram {
  readonly checker: import("typescript").TypeChecker;
  /** Each public entry's module symbol, by its import specifier. */
  readonly entries: ReadonlyMap<string, import("typescript").Symbol>;
}

const programs = new Map<string, PackageProgram>();

/** A package's public entries, read by the TypeScript checker over the package's own tsconfig; built once. */
function packageProgram(pkg: string): PackageProgram {
  const cached = programs.get(pkg);
  if (cached) return cached;
  const dir = join(root, "packages", pkg);
  const manifest = createRequire(join(dir, "package.json"))("./package.json") as {
    name: string;
    exports: Record<string, string>;
  };
  const entries = ENTRIES.filter((e) => e.pkg === pkg).map((e) => ({
    specifier: e.name === "." ? manifest.name : `${manifest.name}/${e.name.slice(2)}`,
    file: join(dir, manifest.exports[e.name] as string),
  }));
  const config = ts.getParsedCommandLineOfConfigFile(
    join(dir, "tsconfig.json"),
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (d) => console.error(d.messageText) },
  );
  if (!config) throw new Error(`cannot read packages/${pkg}/tsconfig.json`);
  const program = ts.createProgram(
    entries.map((e) => e.file),
    config.options,
  );
  const checker = program.getTypeChecker();
  const modules = new Map<string, import("typescript").Symbol>();
  for (const entry of entries) {
    const source = program.getSourceFile(entry.file);
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    if (!moduleSymbol) throw new Error(`${entry.specifier}: ${entry.file} is not a module`);
    modules.set(entry.specifier, moduleSymbol);
  }
  const built = { checker, entries: modules };
  programs.set(pkg, built);
  return built;
}

/** The names each public entry exports, read by the TypeScript checker over each package's own tsconfig. */
export function readApiExports(): ApiEntry[] {
  const out: ApiEntry[] = [];
  for (const pkg of [...new Set(ENTRIES.map((e) => e.pkg))]) {
    const { checker, entries } = packageProgram(pkg);
    for (const [specifier, moduleSymbol] of entries) {
      const exports = checker
        .getExportsOfModule(moduleSymbol)
        .map((symbol) => {
          const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
          const doc = ts.displayPartsToString(target.getDocumentationComment(checker));
          return { name: symbol.name, kind: kindOf(target), doc: firstSentence(doc) };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "en"));
      out.push({ specifier, exports });
    }
  }
  return out;
}

/**
 * An export's declaration as its source writes it, with its JSDoc: a function's signature without its body (each
 * overload), an interface or a type whole, a constant as its name and type. What a synced section of the skill shows
 * as the API, so it is the code's own text.
 */
export function readDeclaration(specifier: string, name: string): string {
  const entry = ENTRIES.find((e) => specifier === `@uberscene/${e.pkg}${e.name === "." ? "" : e.name.slice(1)}`);
  if (!entry) throw new Error(`${specifier} is not a public entry`);
  const { checker, entries } = packageProgram(entry.pkg);
  const moduleSymbol = entries.get(specifier);
  if (!moduleSymbol) throw new Error(`${specifier} is not a public entry`);
  const symbol = checker.getExportsOfModule(moduleSymbol).find((s) => s.name === name);
  if (!symbol) throw new Error(`${specifier} does not export ${name}`);
  const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const declarations = target.getDeclarations() ?? [];
  const functions = declarations.filter(ts.isFunctionDeclaration);
  // An overloaded function: its overloads are the API, the implementation's signature is not.
  const shown = functions.length > 1 ? functions.filter((d) => !d.body) : declarations;
  const parts: string[] = [];
  for (const node of shown) {
    const source = node.getSourceFile();
    if (ts.isFunctionDeclaration(node)) {
      const end = node.body ? node.body.getStart(source) : node.getEnd();
      parts.push(jsDoc(node) + plain(source.text.slice(node.getStart(source), end).trim().replace(/;$/, "")));
    } else if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      parts.push(jsDoc(node) + plain(node.getText(source)));
    } else if (ts.isVariableDeclaration(node)) {
      const type = checker.typeToString(checker.getTypeAtLocation(node), node, ts.TypeFormatFlags.NoTruncation);
      parts.push(`${jsDoc(node.parent.parent)}const ${name}: ${type}`);
    } else throw new Error(`${specifier} ${name}: a ${ts.SyntaxKind[node.kind]} is not shown yet`);
  }
  return parts.join("\n");
}

/** A declaration's own JSDoc block as written, ending in a newline, or nothing. */
function jsDoc(node: import("typescript").Node): string {
  const source = node.getSourceFile();
  const ranges = ts.getLeadingCommentRanges(source.text, node.getFullStart()) ?? [];
  const last = ranges.at(-1);
  if (!last || !source.text.startsWith("/**", last.pos)) return "";
  // Each line of the block loses the indent the declaration had.
  const text = source.text.slice(last.pos, last.end);
  return `${text.replace(/\n[ \t]+\*/g, "\n *")}\n`;
}

/** Without `export` and `export default`: the reader imports it, and the keyword says nothing more. */
const plain = (text: string): string => text.replace(/^export (default )?/, "");

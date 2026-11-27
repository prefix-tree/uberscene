// The lint decision 0045 promised: no operator on a `Time` or a `TimeRange`. TypeScript refuses `+`, `-` and `*` on a
// class, but it allows `<`, `>`, `===` and `!==` on any two objects, and `Math.max(a, b)` takes anything: on a `Time`
// those compare object identity or throw when they run. This walks each package's program with the type checker and
// names every such use, so it fails in CI rather than in a video.
//
//   pnpm lint:time    (part of pnpm lint)
//   tsx packages/kit/scripts/time-operators.ts [package dir ...]
import { dirname, join, relative, resolve } from "node:path";

import ts from "typescript";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const PACKAGES = [
  "packages/kit",
  "packages/sdk",
  "packages/player",
  "packages/render",
  "packages/editor",
  "packages/editor/app",
  "packages/graphics",
];

const OPERATORS = new Set([
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.PlusToken,
  ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.AsteriskToken,
  ts.SyntaxKind.SlashToken,
  ts.SyntaxKind.PercentToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
]);

const ADVICE: Partial<Record<ts.SyntaxKind, string>> = {
  [ts.SyntaxKind.LessThanToken]: "isBefore",
  [ts.SyntaxKind.LessThanEqualsToken]: "isAtOrBefore",
  [ts.SyntaxKind.GreaterThanToken]: "isAfter",
  [ts.SyntaxKind.GreaterThanEqualsToken]: "isAtOrAfter",
  [ts.SyntaxKind.EqualsEqualsToken]: "equals",
  [ts.SyntaxKind.EqualsEqualsEqualsToken]: "equals",
  [ts.SyntaxKind.ExclamationEqualsToken]: "!a.equals(b)",
  [ts.SyntaxKind.ExclamationEqualsEqualsToken]: "!a.equals(b)",
  [ts.SyntaxKind.PlusToken]: "plus",
  [ts.SyntaxKind.MinusToken]: "minus",
};

/** Whether a type is (or may be) the kit's `Time` or `TimeRange` class. `null` and `undefined` parts don't count. */
function isTimeType(type: ts.Type): boolean {
  if (type.isUnion()) return type.types.some(isTimeType);
  const symbol = type.getSymbol();
  if (!symbol || (symbol.getName() !== "Time" && symbol.getName() !== "TimeRange")) return false;
  return (symbol.declarations ?? []).some((d) => d.getSourceFile().fileName.endsWith("/kit/src/time-value.ts"));
}

/** Whether `a === b` is a check for null or undefined, which is fine on a `Time | undefined`. */
const isNullish = (node: ts.Expression): boolean =>
  node.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(node) && node.text === "undefined");

function checkPackage(dir: string): string[] {
  const configPath = join(ROOT, dir, "tsconfig.json");
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (d) => {
        throw new Error(ts.flattenDiagnosticMessageText(d.messageText, "\n"));
      },
    },
  );
  if (!parsed) throw new Error(`cannot read ${configPath}`);
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const own = `${join(ROOT, dir)}/`;
  const found: string[] = [];
  const report = (node: ts.Node, what: string) => {
    const file = node.getSourceFile();
    const { line, character } = file.getLineAndCharacterOfPosition(node.getStart());
    found.push(`${relative(ROOT, file.fileName)}:${line + 1}:${character + 1} ${what}: ${node.getText().slice(0, 80)}`);
  };
  for (const file of program.getSourceFiles()) {
    if (!file.fileName.startsWith(own) || file.fileName.includes("/node_modules/")) continue;
    // The class's own tests show that the operators throw.
    if (file.fileName.endsWith("/kit/test/time-value.test.ts")) continue;
    const visit = (node: ts.Node): void => {
      if (ts.isBinaryExpression(node) && OPERATORS.has(node.operatorToken.kind)) {
        const sides = [node.left, node.right];
        if (!sides.some(isNullish) && sides.some((s) => isTimeType(checker.getTypeAtLocation(s)))) {
          const use = ADVICE[node.operatorToken.kind];
          report(node, `${node.operatorToken.getText()} on a Time${use ? `, use ${use}` : ""}`);
        }
      } else if (
        ts.isPrefixUnaryExpression(node) &&
        (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken) &&
        isTimeType(checker.getTypeAtLocation(node.operand))
      ) {
        report(node, "unary operator on a Time, use negate");
      } else if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "Math" &&
        node.arguments.some((a) => isTimeType(checker.getTypeAtLocation(a)))
      ) {
        report(node, `Math.${node.expression.name.text} on a Time, use Time.min, Time.max or a method`);
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return found;
}

const dirs = process.argv.length > 2 ? process.argv.slice(2).map((d) => relative(ROOT, resolve(d))) : PACKAGES;
const found = dirs.flatMap(checkPackage);
const unique = [...new Set(found)];
if (unique.length > 0) {
  console.error(unique.join("\n"));
  console.error(`\n${unique.length} operator use(s) on a Time or a TimeRange (decision 0045): use its methods.`);
  process.exit(1);
}
console.log(`No operators on a Time or a TimeRange in ${dirs.map((d) => dirname(`${d}/x`)).join(", ")}.`);

// The motion catalog's pages, from the cards (examples/showcase/motion-cards.ts): an index grouped by family, one page
// per technique, and the agent's reference with each technique's file. Used by scripts/gen-docs.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { MOTION_CARDS, MOTION_FAMILIES, type MotionCard } from "../examples/showcase/motion-cards";

const root = join(import.meta.dirname, "..");
const bySlug = new Map(MOTION_CARDS.map((c) => [c.slug, c]));
const families = Object.keys(MOTION_FAMILIES) as (keyof typeof MOTION_FAMILIES)[];

/** Every card, in family order. */
export function motionEntries(): MotionCard[] {
  for (const c of MOTION_CARDS)
    for (const s of c.pairs) if (!bySlug.has(s)) throw new Error(`motion card ${c.slug}: pairs names no card ${s}`);
  return [...MOTION_CARDS].sort((a, b) => families.indexOf(a.family) - families.indexOf(b.family));
}

/** The index: every technique as a card, grouped by family. */
export function motionIndex(attr: (text: string) => string): string {
  const entries = motionEntries();
  const lines = [
    "# Motion catalog",
    "",
    `Techniques of motion, each one short UberScene file in one look (paper, ink and one accent), so what differs is the motion alone. Hover a card to play it; each page has the file, the values it turns on and a prompt to give your agent. ${entries.length} techniques so far. Generated from \`examples/showcase/motion-cards.ts\` by \`pnpm docs:gen\`.`,
    "",
  ];
  for (const family of families) {
    const inFamily = entries.filter((e) => e.family === family);
    if (inFamily.length === 0) continue;
    lines.push(`## ${MOTION_FAMILIES[family]}`, "", '<div class="cc-cards">');
    for (const e of inFamily)
      lines.push(
        `<PreviewCard code hover title="${attr(e.name)}" link="/reference/motion/${e.slug}" src="previews/motion/${e.slug}" text="${attr(e.what)}" />`,
      );
    lines.push("</div>", "");
  }
  return lines.join("\n");
}

/** One technique's page: its clip above the file that made it, what it is for, its values and the prompt. */
export function motionPage(e: MotionCard): string {
  return [
    `# ${e.name}`,
    "",
    e.what,
    "",
    `<Example src="previews/motion/${e.slug}" alt="${e.name}">`,
    "",
    `<<< @/../examples/showcase/motion/${e.slug}.tsx`,
    "",
    "</Example>",
    "",
    `**What it conveys:** ${e.conveys}`,
    "",
    "## Use it when",
    "",
    ...e.useWhen.map((u) => `- ${u}`),
    "",
    "## Values",
    "",
    "| | Value | |",
    "|---|---|---|",
    ...e.params.map((p) => `| ${p.name} | \`${p.value.replaceAll("|", "\\|")}\` | ${p.note} |`),
    "",
    "## Ask your agent",
    "",
    `> ${e.prompt}`,
    "",
    ...(e.pairs.length
      ? [
          `**Goes with:** ${e.pairs.map((s) => `[${bySlug.get(s)?.name ?? s}](/reference/motion/${s})`).join(" · ")}`,
          "",
        ]
      : []),
    `[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)`,
    "",
  ].join("\n");
}

/** The agent's reference: each technique's text, values, prompt and the whole file, to copy from. */
export function motionReference(): string {
  const entries = motionEntries();
  const part = (e: MotionCard) =>
    [
      `## ${e.name} (\`${e.slug}\`)`,
      "",
      `${e.what} ${e.conveys}`,
      "",
      `Use it when: ${e.useWhen.join(" ")}`,
      "",
      ...e.params.map((p) => `- ${p.name}: \`${p.value}\`, ${p.note}`),
      "",
      `Ask: ${e.prompt}`,
      "",
      "```tsx",
      readFileSync(join(root, "examples", "showcase", "motion", `${e.slug}.tsx`), "utf8").trimEnd(),
      "```",
    ].join("\n");
  return [
    "# Motion catalog",
    "",
    `Techniques of motion, each a short, complete file in one look, to copy and adapt: pick one by name when a scene needs it. ${entries.length} techniques, grouped by family. Read [motion.md](motion.md) first for how scenes hand over at a cut. Generated from the code by \`scripts/gen-docs.ts\`; do not edit.`,
    "",
    ...families.flatMap((family) => {
      const inFamily = entries.filter((e) => e.family === family);
      if (!inFamily.length) return [];
      return [`# ${MOTION_FAMILIES[family]}`, "", ...inFamily.map(part), ""];
    }),
  ].join("\n");
}

/** The sidebar's groups: one per family, its techniques in it. */
export function motionSidebar(): { text: string; items: { text: string; link: string }[] }[] {
  const entries = motionEntries();
  return families
    .map((family) => ({
      text: MOTION_FAMILIES[family],
      items: entries
        .filter((e) => e.family === family)
        .map((e) => ({ text: e.name, link: `/reference/motion/${e.slug}` })),
    }))
    .filter((g) => g.items.length > 0);
}

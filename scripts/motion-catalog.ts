// The motion catalog's pages, from the cards (examples/showcase/motion-cards.ts) and the card text they are adapted
// from (vendor/awesome-ai-motion/cards.json): an index grouped by family, one page per technique, and the agent's
// reference with each technique's file. Used by scripts/gen-docs.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { MOTION_CARDS, type MotionCard } from "../examples/showcase/motion-cards";

const root = join(import.meta.dirname, "..");

interface LibraryCard {
  readonly slug: string;
  readonly no: string;
  readonly family: string;
  readonly name: string;
  readonly what: string;
  readonly conveys: string;
  readonly useWhen: readonly string[];
  readonly pairsWith: readonly string[];
}
interface Library {
  readonly source: string;
  readonly families: Readonly<Record<string, { readonly name: string; readonly description: string }>>;
  readonly cards: readonly LibraryCard[];
}

const library = JSON.parse(readFileSync(join(root, "vendor", "awesome-ai-motion", "cards.json"), "utf8")) as Library;
const bySlug = new Map(library.cards.map((c) => [c.slug, c]));
const adapted = new Set(MOTION_CARDS.map((c) => c.slug));

/** A family's name in sentence case: "ENTRANCE & EXIT" becomes "Entrance & exit". */
const familyName = (key: string): string => {
  const name = library.families[key]?.name ?? key;
  return name.charAt(0) + name.slice(1).toLowerCase().replace("3d", "3D");
};

/** A card's text: the library's, or its own. */
export interface MotionEntry {
  readonly card: MotionCard;
  readonly name: string;
  readonly family: string;
  readonly what: string;
  readonly conveys: string;
  readonly useWhen: readonly string[];
  readonly pairsWith: readonly string[];
  /** The library's number, for a card adapted from it. */
  readonly no?: string;
}

/** Every card with its text, in the library's family order. */
export function motionEntries(): MotionEntry[] {
  const entries = MOTION_CARDS.map((card): MotionEntry => {
    if (card.own) return { card, ...card.own, pairsWith: [] };
    const lib = bySlug.get(card.slug);
    if (!lib) throw new Error(`motion card ${card.slug}: no card of that slug in vendor/awesome-ai-motion/cards.json`);
    return {
      card,
      name: lib.name,
      family: lib.family,
      what: lib.what,
      conveys: lib.conveys,
      useWhen: lib.useWhen,
      pairsWith: lib.pairsWith,
      no: lib.no,
    };
  });
  const order = Object.keys(library.families);
  return entries.sort((a, b) => order.indexOf(a.family) - order.indexOf(b.family));
}

const credit = (e: MotionEntry): string =>
  e.no
    ? `Adapted from Nº ${e.no} of [awesome-ai-motion](${library.source}/tree/main/effects/${e.card.slug}) (MIT): its name, definition and uses. The file, its values and the prompt are UberScene's.`
    : "One of UberScene's own, from the agent skill's motion doctrine.";

/** The index: every adapted technique as a card, grouped by family. */
export function motionIndex(attr: (text: string) => string): string {
  const entries = motionEntries();
  const lines = [
    "# Motion catalog",
    "",
    `Techniques of motion, each one short UberScene file in one look (paper, ink and one accent), so what differs is the motion alone. Hover a card to play it; each page has the file, the values it turns on and a prompt to give your agent. ${entries.length} techniques so far, most adapted from the 637 of [awesome-ai-motion](${library.source}) (MIT). Generated from \`examples/showcase/motion-cards.ts\` by \`pnpm docs:gen\`.`,
    "",
  ];
  for (const family of Object.keys(library.families)) {
    const inFamily = entries.filter((e) => e.family === family);
    if (inFamily.length === 0) continue;
    lines.push(`## ${familyName(family)}`, "", '<div class="cc-cards">');
    for (const e of inFamily)
      lines.push(
        `<PreviewCard code hover title="${attr(e.name)}" link="/reference/motion/${e.card.slug}" src="previews/motion/${e.card.slug}" text="${attr(e.what)}" />`,
      );
    lines.push("</div>", "");
  }
  return lines.join("\n");
}

/** One technique's page: its clip above the file that made it, what it is for, its values and the prompt. */
export function motionPage(e: MotionEntry): string {
  const pairs = e.pairsWith.filter((s) => adapted.has(s));
  return [
    `# ${e.name}`,
    "",
    e.what,
    "",
    `<Example src="previews/motion/${e.card.slug}" alt="${e.name}">`,
    "",
    `<<< @/../examples/showcase/motion/${e.card.slug}.tsx`,
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
    ...e.card.params.map((p) => `| ${p.name} | \`${p.value.replaceAll("|", "\\|")}\` | ${p.note} |`),
    "",
    "## Ask your agent",
    "",
    `> ${e.card.prompt}`,
    "",
    ...(pairs.length
      ? [`**Goes with:** ${pairs.map((s) => `[${bySlug.get(s)?.name ?? s}](/reference/motion/${s})`).join(" · ")}`, ""]
      : []),
    credit(e),
    "",
    `[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)`,
    "",
  ].join("\n");
}

/** The agent's reference: each technique's text, values, prompt and the whole file, to copy from. */
export function motionReference(): string {
  const entries = motionEntries();
  const parts = entries.map((e) =>
    [
      `## ${e.name} (\`${e.card.slug}\`)`,
      "",
      `${e.what} ${e.conveys}`,
      "",
      `Use it when: ${e.useWhen.join(" ")}`,
      "",
      ...e.card.params.map((p) => `- ${p.name}: \`${p.value}\`, ${p.note}`),
      "",
      `Ask: ${e.card.prompt}`,
      "",
      "```tsx",
      readFileSync(join(root, "examples", "showcase", "motion", `${e.card.slug}.tsx`), "utf8").trimEnd(),
      "```",
    ].join("\n"),
  );
  return [
    "# Motion catalog",
    "",
    `Techniques of motion, each a short, complete file in one look, to copy and adapt: pick one by name when a scene needs it. ${entries.length} techniques, grouped by family; most are adapted from awesome-ai-motion (MIT), ${library.source}. Read [motion.md](motion.md) first for how scenes hand over at a cut. Generated from the code by \`scripts/gen-docs.ts\`; do not edit.`,
    "",
    ...Object.keys(library.families).flatMap((family) => {
      const inFamily = entries.filter((e) => e.family === family);
      if (!inFamily.length) return [];
      return [`# ${familyName(family)}`, "", ...inFamily.map((e) => parts[entries.indexOf(e)] as string), ""];
    }),
  ].join("\n");
}

/** The sidebar's groups: one per family, its techniques in it. */
export function motionSidebar(): { text: string; items: { text: string; link: string }[] }[] {
  const entries = motionEntries();
  return Object.keys(library.families)
    .map((family) => ({
      text: familyName(family),
      items: entries
        .filter((e) => e.family === family)
        .map((e) => ({ text: e.name, link: `/reference/motion/${e.card.slug}` })),
    }))
    .filter((g) => g.items.length > 0);
}

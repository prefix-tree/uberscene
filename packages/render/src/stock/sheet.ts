// A contact sheet of search results, to choose from: a frame of each video (a card for each sound), numbered as the
// search listed them, with its ref, length, size, author and licence. Drawn in the export's Chrome.
import { writeFileSync } from "node:fs";
import { extname } from "node:path";

import { findChrome } from "../web/chrome";
import { FLAGS } from "../web/engine";
import type { StockCandidate } from "./types";

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** The sheet's page. */
export function sheetHtml(candidates: readonly StockCandidate[], columns: number): string {
  const cells = candidates.map((c, i) => {
    const size = c.width ? `${c.width}×${c.height}` : "";
    const picture = c.thumbnail
      ? `<img src="${esc(c.thumbnail)}">`
      : `<div class="sound">♪ ${c.duration.toFixed(1)} s</div>`;
    return `<figure>${picture}<figcaption><b>${i + 1}</b> ${esc(c.ref)}<br>${c.duration.toFixed(1)} s ${size} · ${esc(c.source.author)} · ${esc(c.source.licence)}<br><i>${esc(c.source.title)}</i></figcaption></figure>`;
  });
  return `<!doctype html><meta charset="utf-8"><style>
    body { margin: 0; padding: 16px; background: #0b0d12; color: #d6deeb; font: 13px/1.35 system-ui, sans-serif; width: ${columns * 336}px; }
    main { display: grid; grid-template-columns: repeat(${columns}, 320px); gap: 16px; }
    figure { margin: 0; }
    img, .sound { width: 320px; height: 200px; object-fit: contain; background: #161a24; border-radius: 6px; display: block; }
    .sound { display: grid; place-items: center; font-size: 28px; color: #7d8597; }
    figcaption { padding-top: 6px; overflow-wrap: anywhere; }
    b { color: #ffc400; } i { color: #7d8597; }
  </style><main>${cells.join("")}</main>`;
}

/** Draws the sheet to a PNG or JPEG. Returns its size. */
export async function stockSheet(
  candidates: readonly StockCandidate[],
  out: string,
  { columns = 4 }: { columns?: number } = {},
): Promise<{ width: number; height: number }> {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ headless: true, args: FLAGS, executablePath: await findChrome() });
  try {
    const page = await browser.newPage({
      viewport: { width: Math.min(columns, Math.max(1, candidates.length)) * 336 + 32, height: 400 },
    });
    await page.setContent(sheetHtml(candidates, Math.min(columns, Math.max(1, candidates.length))), {
      waitUntil: "networkidle",
    });
    const jpeg = /\.jpe?g$/i.test(extname(out));
    const shot = await page.screenshot({
      fullPage: true,
      type: jpeg ? "jpeg" : "png",
      ...(jpeg ? { quality: 85 } : {}),
    });
    writeFileSync(out, shot);
    const size = await page.evaluate(() => ({ width: document.body.scrollWidth, height: document.body.scrollHeight }));
    return size;
  } finally {
    await browser.close();
  }
}

// `uberscene video.tsx --check-sync`: how the picture sits on the music. It reads the resolved timeline only: no
// browser, no media. The numbers are the SDK's `syncReport`; this prints them as a compiler prints its findings.
import { type ResolvedState, type SyncReport, syncReport } from "@uberscene/sdk";

export type { SyncIssue, SyncPoint, SyncReport } from "@uberscene/sdk";

/** Every cut and every start on screen against its nearest beat, and the ones that miss. */
export function checkSync(state: ResolvedState): SyncReport {
  return syncReport(state);
}

/** The report as text: the music, each point with its beat and its distance, each issue with its fix, a summary. */
export function formatSync(file: string, report: SyncReport): string {
  const lines: string[] = [];
  const sounds = soundLines(report);
  if (report.music.length === 0) {
    const issues = report.issues.flatMap((i) => [`${file}: ${i.rule}: ${i.message}`, `  fix: ${i.fix}`]);
    return `${[
      `${file}: no music with beats plays in this video. Add the song with \`uberscene add\`, which finds its beats.`,
      ...sounds,
      ...issues,
    ].join("\n")}\n`;
  }
  for (const m of report.music)
    lines.push(
      `music: ${m.clip}  ${m.tempo !== undefined ? `${Math.round(m.tempo * 100) / 100} BPM  ` : ""}a beat every ${m.beatSeconds.toFixed(2)} s  beat:${m.first} to beat:${m.last}  ${m.from.toFixed(2)}–${m.to.toFixed(2)} s  (${m.grid === "grid" ? "beats on a grid" : "beats found in the sound"})`,
    );
  for (const p of report.points) {
    const { beat } = p;
    const distance =
      beat.offsetMs === 0 ? "" : `  ${Math.abs(beat.offsetMs)} ms ${beat.offsetMs > 0 ? "after" : "before"} it`;
    lines.push(
      `  ${p.time.toFixed(2).padStart(7)}  ${p.kind.padEnd(5)}  ${(p.from ? `${p.from}→${p.id}` : p.id).padEnd(24)}  ${p.status.padEnd(4)}  ${beat.clip}@beat:${beat.i}${distance}${p.anchored ? "  (tied to the beat)" : ""}`,
    );
  }
  lines.push(...sounds);
  for (const i of report.issues) lines.push(`${file}: ${i.rule}: ${i.message}`, `  fix: ${i.fix}`);
  const s = report.summary;
  lines.push(
    `${s.on} of ${s.points} cuts and starts on the beat, ${s.near} just off it, ${s.off} elsewhere; ${s.anchored} tied to a beat${s.outsideMusic > 0 ? `; ${s.outsideMusic} while no music plays` : ""}. ${report.issues.length} sync issue${report.issues.length === 1 ? "" : "s"}.`,
  );
  return `${lines.join("\n")}\n`;
}

/** The sound effects against their cuts, and how many land on one; nothing when there are none. */
function soundLines(report: SyncReport): string[] {
  if (report.sounds.length === 0) return [];
  const lines = ["sounds on the effects tracks, by where their attack is heard:"];
  for (const s of report.sounds) {
    const where = s.cut
      ? `${s.cut.label}${s.cut.offsetMs === 0 ? "" : `  ${Math.abs(s.cut.offsetMs)} ms ${s.cut.offsetMs > 0 ? "after" : "before"} it`}`
      : "no cut";
    lines.push(`  ${s.time.toFixed(2).padStart(7)}  sound  ${s.id.padEnd(24)}  ${s.status.padEnd(4)}  ${where}`);
  }
  const on = report.sounds.filter((s) => s.status === "on").length;
  const near = report.sounds.filter((s) => s.status === "near").length;
  lines.push(`${on} of ${report.sounds.length} sounds on a cut, ${near} just off one.`);
  return lines;
}

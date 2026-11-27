// The source of a film in an editor window: line numbers, syntax colours, the lines of what is on screen lit, scrolled
// so the lit line stays in view. Drawn inside a <Layer>; `t` is the layer's seconds.
import type { CSSProperties } from "react";

/** The page the window fades into at its foot. */
const FADE_TO = "#0b0d12";

export const MONO = `"JetBrains Mono", ui-monospace, monospace`;

/** A line of the source lit while what it writes is on screen: from `from` to `to`, in seconds of the film. */
export interface LitLine {
  readonly line: number;
  readonly from: number;
  readonly to: number;
  /**
   * A range of characters on the line, from the first to the one after the last: lit as a word (a chord name, a
   * note) in a filled box, without lighting the line or moving the window.
   */
  readonly cols?: readonly [number, number] | undefined;
}

const C = {
  panel: "#0f1219",
  bar: "#161a24",
  edge: "#232838",
  text: "#d6deeb",
  number: "#4b5263",
  tag: "#82aaff",
  attr: "#c792ea",
  string: "#ecc48d",
  value: "#f78c6c",
  keyword: "#c792ea",
  comment: "#637777",
  punct: "#89ddff",
  lit: "rgba(255, 196, 0, 0.16)",
  litMark: "#ffc400",
  litStrong: "rgba(255, 196, 0, 0.3)",
};

const KEYWORDS = new Set([
  "import",
  "export",
  "from",
  "const",
  "let",
  "function",
  "return",
  "default",
  "type",
  "interface",
  "if",
  "else",
  "for",
  "of",
  "as",
  "new",
  "true",
  "false",
  "null",
  "undefined",
]);

/** One line cut into coloured pieces: comments, strings, JSX tags, attribute names, numbers, keywords, punctuation. */
function tokens(line: string): { text: string; color: string }[] {
  const out: { text: string; color: string }[] = [];
  const re =
    /(\/\/.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|(<\/?[A-Za-z][\w.]*)|([A-Za-z_$][\w$-]*)(?==)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([{}()[\]<>/=,;:.?!&|+*%-]+)|(\s+)/g;
  let m: RegExpExecArray | null = re.exec(line);
  while (m !== null) {
    const [whole, comment, str, tag, attr, num, word, punct] = m;
    const color = comment
      ? C.comment
      : str
        ? C.string
        : tag
          ? C.tag
          : attr
            ? C.attr
            : num
              ? C.value
              : word
                ? KEYWORDS.has(word)
                  ? C.keyword
                  : /^[A-Z]/.test(word)
                    ? C.tag
                    : C.text
                : punct
                  ? C.punct
                  : C.text;
    out.push({ text: whole, color });
    m = re.exec(line);
  }
  return out;
}

const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

/**
 * The line to keep in the middle of the window at second `t`: the latest lit line to come on screen, reached with an
 * eased glide of `glide` seconds from the one before; with nothing lit, a slow drift through the file.
 */
export function focusAt(t: number, lit: readonly LitLine[], lines: number, length: number, glide = 0.45): number {
  const starts = [...lit].sort((a, b) => a.from - b.from).filter((l) => l.from <= t);
  if (starts.length === 0)
    return lit.length
      ? Math.max(0, [...lit].sort((a, b) => a.from - b.from)[0]!.line - 3)
      : (t / Math.max(length, 1)) * lines;
  const now = starts[starts.length - 1]!;
  const before = starts[starts.length - 2]?.line ?? Math.max(0, now.line - 3);
  const k = easeInOut(Math.min(1, (t - now.from) / glide));
  return before + (now.line - before) * k;
}

export function CodeView({
  code,
  lit,
  t,
  length,
  file,
  x,
  y,
  w,
  h,
  size = 20,
  hold = 0.3,
  fade = 0,
  strong = false,
}: {
  code: string;
  lit: readonly LitLine[];
  t: number;
  length: number;
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
  size?: number;
  /** Where in the window the lit line is held, as a share of its height from the top. */
  hold?: number;
  /** Pixels at the bottom of the window that fade into the page (the part a phone's UI covers). */
  fade?: number;
  /** For a phone: the lit line stands out more, and the lines around it step back. */
  strong?: boolean;
}) {
  const lines = code.replace(/\s+$/, "").split("\n");
  const lead = Math.round(size * 1.45);
  const bar = 46;
  const body = h - bar;
  const lines_ = lit.filter((l) => !l.cols);
  const focus = focusAt(t, lines_, lines.length, length);
  const scroll = Math.max(0, Math.min(lines.length * lead - body + lead, focus * lead - body * hold));
  const on = new Set(lines_.filter((l) => l.from <= t && t < l.to).map((l) => l.line));
  const words = lit.filter((l) => l.cols && l.from <= t && t < l.to);
  /** Where the code starts on a line, after the mark and the line number, and how wide a character is. */
  const gutter = (strong ? 8 : 4) + 52 + 16;
  const advance = size * 0.6;
  const first = Math.max(0, Math.floor(scroll / lead) - 1);
  const last = Math.min(lines.length, first + Math.ceil(body / lead) + 3);
  const box: CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width: w,
    height: h,
    background: C.panel,
    border: `2px solid ${C.edge}`,
    borderRadius: 18,
    overflow: "hidden",
    boxSizing: "border-box",
  };
  return (
    <div style={box}>
      <div
        style={{
          height: bar,
          background: C.bar,
          borderBottom: `2px solid ${C.edge}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 18px",
          font: `500 ${size}px ${MONO}`,
          color: C.text,
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c, display: "inline-block" }} />
        ))}
        <span style={{ marginLeft: 12 }}>{file}</span>
        <span style={{ marginLeft: "auto", color: C.number }}>{lines.length} lines</span>
      </div>
      {fade > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: fade,
            zIndex: 2,
            background: `linear-gradient(to bottom, rgba(11, 13, 18, 0), ${FADE_TO})`,
          }}
        />
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: bar, bottom: 0, overflow: "hidden" }}>
        {lines.slice(first, last).map((text, i) => {
          const n = first + i;
          const lit = on.has(n);
          return (
            <div
              key={n}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: n * lead - scroll + 10,
                height: lead,
                display: "flex",
                alignItems: "center",
                background: lit ? (strong ? C.litStrong : C.lit) : "transparent",
                opacity: strong && on.size > 0 && !lit ? 0.45 : 1,
                font: `500 ${size}px ${MONO}`,
                whiteSpace: "pre",
              }}
            >
              <span
                style={{
                  width: strong ? 8 : 4,
                  flexShrink: 0,
                  alignSelf: "stretch",
                  background: lit ? C.litMark : "transparent",
                }}
              />
              <span
                style={{
                  width: 52,
                  flexShrink: 0,
                  textAlign: "right",
                  color: lit ? C.litMark : C.number,
                  marginRight: 16,
                }}
              >
                {n + 1}
              </span>
              <span>
                {tokens(text).map((tok, j) => (
                  <span key={j} style={{ color: tok.color }}>
                    {tok.text}
                  </span>
                ))}
              </span>
              {words
                .filter((w) => w.line === n)
                .map((w) => {
                  const [a, b] = w.cols as readonly [number, number];
                  return (
                    <span
                      key={`${a}-${b}`}
                      style={{
                        position: "absolute",
                        left: gutter + a * advance - 5,
                        top: 3,
                        bottom: 3,
                        padding: "0 5px",
                        display: "flex",
                        alignItems: "center",
                        borderRadius: 6,
                        background: C.litMark,
                        color: C.panel,
                        font: `700 ${size}px ${MONO}`,
                      }}
                    >
                      {text.slice(a, b)}
                    </span>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

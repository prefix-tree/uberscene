// Colours that change over time. A key list on a shape's `fill` or `stroke.color` moves between colours in OKLab, a
// space made so that equal steps look equal: red to blue passes through a clear purple, not the muddy grey a mix of
// the sRGB numbers gives. Parsing is done here and not by a canvas, so the resolver, the export and the tests (in
// Node, with no canvas) read a colour the same way the preview does.

/** A colour in sRGB, each channel 0 to 1, with its alpha. */
export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/** A colour in OKLab: lightness `l`, and the two axes `a` (green to red) and `b` (blue to yellow). */
export interface Oklab {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

// The CSS named colours, as `name` then six hex digits, packed to keep the table short.
const NAMED_PACKED =
  "aliceblue f0f8ff antiquewhite faebd7 aqua 00ffff aquamarine 7fffd4 azure f0ffff beige f5f5dc bisque ffe4c4 " +
  "black 000000 blanchedalmond ffebcd blue 0000ff blueviolet 8a2be2 brown a52a2a burlywood deb887 cadetblue 5f9ea0 " +
  "chartreuse 7fff00 chocolate d2691e coral ff7f50 cornflowerblue 6495ed cornsilk fff8dc crimson dc143c cyan 00ffff " +
  "darkblue 00008b darkcyan 008b8b darkgoldenrod b8860b darkgray a9a9a9 darkgreen 006400 darkgrey a9a9a9 " +
  "darkkhaki bdb76b darkmagenta 8b008b darkolivegreen 556b2f darkorange ff8c00 darkorchid 9932cc darkred 8b0000 " +
  "darksalmon e9967a darkseagreen 8fbc8f darkslateblue 483d8b darkslategray 2f4f4f darkslategrey 2f4f4f " +
  "darkturquoise 00ced1 darkviolet 9400d3 deeppink ff1493 deepskyblue 00bfff dimgray 696969 dimgrey 696969 " +
  "dodgerblue 1e90ff firebrick b22222 floralwhite fffaf0 forestgreen 228b22 fuchsia ff00ff gainsboro dcdcdc " +
  "ghostwhite f8f8ff gold ffd700 goldenrod daa520 gray 808080 green 008000 greenyellow adff2f grey 808080 " +
  "honeydew f0fff0 hotpink ff69b4 indianred cd5c5c indigo 4b0082 ivory fffff0 khaki f0e68c lavender e6e6fa " +
  "lavenderblush fff0f5 lawngreen 7cfc00 lemonchiffon fffacd lightblue add8e6 lightcoral f08080 lightcyan e0ffff " +
  "lightgoldenrodyellow fafad2 lightgray d3d3d3 lightgreen 90ee90 lightgrey d3d3d3 lightpink ffb6c1 " +
  "lightsalmon ffa07a lightseagreen 20b2aa lightskyblue 87cefa lightslategray 778899 lightslategrey 778899 " +
  "lightsteelblue b0c4de lightyellow ffffe0 lime 00ff00 limegreen 32cd32 linen faf0e6 magenta ff00ff maroon 800000 " +
  "mediumaquamarine 66cdaa mediumblue 0000cd mediumorchid ba55d3 mediumpurple 9370db mediumseagreen 3cb371 " +
  "mediumslateblue 7b68ee mediumspringgreen 00fa9a mediumturquoise 48d1cc mediumvioletred c71585 " +
  "midnightblue 191970 mintcream f5fffa mistyrose ffe4e1 moccasin ffe4b5 navajowhite ffdead navy 000080 " +
  "oldlace fdf5e6 olive 808000 olivedrab 6b8e23 orange ffa500 orangered ff4500 orchid da70d6 palegoldenrod eee8aa " +
  "palegreen 98fb98 paleturquoise afeeee palevioletred db7093 papayawhip ffefd5 peachpuff ffdab9 peru cd853f " +
  "pink ffc0cb plum dda0dd powderblue b0e0e6 purple 800080 rebeccapurple 663399 red ff0000 rosybrown bc8f8f " +
  "royalblue 4169e1 saddlebrown 8b4513 salmon fa8072 sandybrown f4a460 seagreen 2e8b57 seashell fff5ee " +
  "sienna a0522d silver c0c0c0 skyblue 87ceeb slateblue 6a5acd slategray 708090 slategrey 708090 snow fffafa " +
  "springgreen 00ff7f steelblue 4682b4 tan d2b48c teal 008080 thistle d8bfd8 tomato ff6347 turquoise 40e0d0 " +
  "violet ee82ee wheat f5deb3 white ffffff whitesmoke f5f5f5 yellow ffff00 yellowgreen 9acd32";

let named: Map<string, string> | undefined;
function namedHex(name: string): string | undefined {
  if (!named) {
    named = new Map();
    const parts = NAMED_PACKED.split(" ");
    for (let i = 0; i + 1 < parts.length; i += 2) named.set(parts[i]!, parts[i + 1]!);
  }
  return named.get(name);
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

function fromHex(hex: string): Rgba | null {
  const h =
    hex.length === 3 || hex.length === 4
      ? [...hex].map((c) => c + c).join("")
      : hex.length === 6 || hex.length === 8
        ? hex
        : null;
  if (!h || !/^[0-9a-f]+$/i.test(h)) return null;
  const at = (i: number) => Number.parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: at(0), g: at(2), b: at(4), a: h.length === 8 ? at(6) : 1 };
}

/** One channel of `rgb()`: a number 0 to 255, or a percentage. */
function channel(v: string): number | null {
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return clamp01(v.endsWith("%") ? n / 100 : n / 255);
}

function alphaOf(v: string | undefined): number | null {
  if (v === undefined) return 1;
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return clamp01(v.endsWith("%") ? n / 100 : n);
}

/** `hsl()` to sRGB, the CSS way. */
function fromHsl(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const c = s * Math.min(l, 1 - l);
  const f = (n: number) => l - c * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
}

/**
 * A CSS colour as sRGB with alpha: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()` (commas or spaces, an
 * alpha after `/`), `hsl()`/`hsla()`, `transparent` and the named colours. Null for anything else (a theme token not
 * replaced, a gradient).
 */
export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase();
  if (s.startsWith("#")) return fromHex(s.slice(1));
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const hex = namedHex(s);
  if (hex) return fromHex(hex);
  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(s);
  if (!fn) return null;
  const [body, slash] = fn[2]!.split("/").map((p) => p.trim()) as [string, string | undefined];
  const args = body.split(/[\s,]+/).filter(Boolean);
  // The alpha is a fourth argument (`rgba(0, 0, 0, 0.5)`) or comes after a slash (`rgb(0 0 0 / 50%)`), not both.
  if (!(args.length === 3 || (args.length === 4 && slash === undefined))) return null;
  const a = alphaOf(slash ?? args[3]);
  if (a === null) return null;
  if (fn[1]!.startsWith("rgb")) {
    const [r, g, b] = args.slice(0, 3).map(channel) as [number | null, number | null, number | null];
    return r === null || g === null || b === null ? null : { r, g, b, a };
  }
  const h = Number.parseFloat(args[0]!);
  const sat = Number.parseFloat(args[1]!);
  const light = Number.parseFloat(args[2]!);
  if (![h, sat, light].every(Number.isFinite)) return null;
  const [r, g, b] = fromHsl(((h % 360) + 360) % 360, clamp01(sat / 100), clamp01(light / 100));
  return { r, g, b, a };
}

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** An sRGB colour in OKLab (Björn Ottosson's matrices), alpha left aside. */
export function toOklab(c: Rgba): Oklab {
  const r = toLinear(c.r),
    g = toLinear(c.g),
    b = toLinear(c.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** An OKLab colour back in sRGB, each channel clamped to 0..1, with alpha `alpha`. */
export function fromOklab(c: Oklab, alpha = 1): Rgba {
  const l = (c.l + 0.3963377774 * c.a + 0.2158037573 * c.b) ** 3;
  const m = (c.l - 0.1055613458 * c.a - 0.0638541728 * c.b) ** 3;
  const s = (c.l - 0.0894841775 * c.a - 1.291485548 * c.b) ** 3;
  return {
    r: clamp01(fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: clamp01(fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    b: clamp01(fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
    a: clamp01(alpha),
  };
}

/** A colour as CSS: `#rrggbb` when opaque, `rgba(r, g, b, a)` when not. */
export function formatColor(c: Rgba): string {
  const byte = (v: number) => Math.round(clamp01(v) * 255);
  if (c.a >= 1) return `#${[c.r, c.g, c.b].map((v) => byte(v).toString(16).padStart(2, "0")).join("")}`;
  return `rgba(${byte(c.r)}, ${byte(c.g)}, ${byte(c.b)}, ${Math.round(clamp01(c.a) * 1000) / 1000})`;
}

/**
 * The colour `t` of the way from `from` to `to` (0 is `from`, 1 is `to`), moved in OKLab, with alpha moved in a
 * straight line and the colour weighted by it, so a fade to `transparent` keeps its hue instead of passing through
 * black. Null when either cannot be read (`parseColor`), for the caller to step instead.
 */
export function mixColor(from: string, to: string, t: number): string | null {
  const a = parseColor(from);
  const b = parseColor(to);
  if (!a || !b) return null;
  const alpha = a.a + (b.a - a.a) * t;
  const la = toOklab(a);
  const lb = toOklab(b);
  // Weighted by alpha (premultiplied), so a fully transparent end lends no colour of its own.
  const wa = a.a * (1 - t);
  const wb = b.a * t;
  const w = wa + wb;
  const mix = (x: number, y: number) => (w > 0 ? (x * wa + y * wb) / w : x + (y - x) * t);
  return formatColor(fromOklab({ l: mix(la.l, lb.l), a: mix(la.a, lb.a), b: mix(la.b, lb.b) }, alpha));
}

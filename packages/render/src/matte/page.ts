// The page `uberscene matte` runs in the export's Chrome: it reads the footage frame by frame, runs the matting model
// on each (ONNX Runtime for the web, its WASM threads on the page's cores), draws its alpha grey and encodes those
// frames to VP9, one matte frame for each frame of the footage at the same time. Written as one inline module, served
// from memory, so it needs no build step; it loads mediabunny and ONNX Runtime from the server beside it.

/** What the command asks the page to do. */
export interface MatteJob {
  /** How the model is fed: its registry entry, less what only Node needs. */
  readonly model: {
    readonly input: string;
    readonly output: string;
    readonly size?: readonly [number, number] | undefined;
    readonly normalize?:
      | {
          readonly scaleToMax?: boolean | undefined;
          readonly mean: readonly number[];
          readonly std: readonly number[];
        }
      | undefined;
    readonly stretch?: boolean | undefined;
    readonly downsampleRatio?: string | undefined;
    readonly recurrent?:
      | { readonly inputs: readonly string[]; readonly outputs: readonly string[]; readonly warmup: number }
      | undefined;
  };
  /** WASM threads; the page caps it at its cores. */
  readonly threads: number;
  /** Seconds between the subject boxes it samples. */
  readonly subjectEvery: number;
}

/** What the page reports when it is done. */
export interface MatteSummary {
  readonly frames: number;
  readonly width: number;
  readonly height: number;
  /** The footage's frame rate, as its timestamps give it. */
  readonly fps: number;
  /** Seconds the model took per frame, on average, warm-up left out. */
  readonly perFrame: number;
  /** The share of pixels with alpha between 0.05 and 0.95, on average and at most. */
  readonly soft: { readonly mean: number; readonly max: number };
  /** The mean absolute change of alpha from one frame to the next, on average and at its worst frame. */
  readonly change: { readonly mean: number; readonly max: number; readonly at: number };
  /** The share of pixels with alpha above 0.5, on average. */
  readonly coverage: number;
  /** The box of alpha above 0.5, as fractions of the frame, every `subjectEvery` seconds. */
  readonly subjects: readonly {
    readonly at: number;
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  }[];
  /** The ONNX Runtime backend that ran it. */
  readonly backend: string;
  /** Bytes of the encoded matte, to read with `read`. */
  readonly bytes: number;
}

declare global {
  interface Window {
    __matte?: {
      run(job: MatteJob): Promise<MatteSummary>;
      read(offset: number, size: number): string;
    };
    __matteError?: string;
  }
}

/** The page: the paths it loads its two libraries from are the server's (`/lib/...`), the footage `/footage`, the model `/model`. */
export const MATTE_PAGE = `<!doctype html>
<meta charset="utf-8">
<title>uberscene matte</title>
<script type="module">
import * as mb from "/lib/mediabunny.mjs";
import * as ort from "/lib/ort/ort.min.mjs";

let out = new Uint8Array();

async function run(job) {
  ort.env.wasm.wasmPaths = location.origin + "/lib/ort/";
  ort.env.wasm.numThreads = Math.max(1, Math.min(job.threads, navigator.hardwareConcurrency || 1));
  const session = await ort.InferenceSession.create("/model", { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  const m = job.model;
  const input = new mb.Input({ source: new mb.UrlSource("/footage"), formats: mb.ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error("the footage has no video track");
  const W = track.displayWidth, H = track.displayHeight;
  const stats = await track.computePacketStats(120);
  const fps = stats.averagePacketRate || 30;
  const [iw, ih] = m.size ?? [W, H];

  // The frame as the model takes it, and the matte as the encoder takes it.
  const frame = new OffscreenCanvas(iw, ih);
  const fctx = frame.getContext("2d", { willReadFrequently: true });
  const small = new OffscreenCanvas(iw, ih);
  const sctx = small.getContext("2d");
  const matte = new OffscreenCanvas(W, H);
  const mctx = matte.getContext("2d");
  mctx.imageSmoothingQuality = "high";

  const output = new mb.Output({ format: new mb.WebMOutputFormat(), target: new mb.BufferTarget() });
  const source = new mb.CanvasSource(matte, { codec: "vp9", bitrate: mb.QUALITY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  const ratio = m.downsampleRatio ? Math.min(0.7, 480 / Math.max(W, H)) : 0;
  let state = m.recurrent ? m.recurrent.inputs.map(() => new ort.Tensor("float32", new Float32Array(1), [1, 1, 1, 1])) : [];
  const feeds = (tensor) => {
    const f = { [m.input]: tensor };
    if (m.downsampleRatio) f[m.downsampleRatio] = new ort.Tensor("float32", new Float32Array([ratio]), [1]);
    if (m.recurrent) m.recurrent.inputs.forEach((name, i) => (f[name] = state[i]));
    return f;
  };
  const step = async (tensor) => {
    const r = await session.run(feeds(tensor));
    if (m.recurrent) state = m.recurrent.outputs.map((name) => r[name]);
    return r[m.output];
  };

  const n = iw * ih;
  const rgb = new Float32Array(3 * n);
  const grey = sctx.createImageData(iw, ih);
  let prev = null;
  let frames = 0, ran = 0, spent = 0, softSum = 0, softMax = 0, coverSum = 0;
  let changeSum = 0, changeN = 0, changeMax = 0, changeAt = 0, nextSubject = 0;
  const subjects = [];

  if (!(await track.canDecode())) throw new Error("this browser cannot decode the footage's video codec");
  for await (const sample of new mb.VideoSampleSink(track).samples()) {
    const t = sample.timestamp;
    const d = sample.duration || 1 / fps;
    sample.draw(fctx, 0, 0, iw, ih);
    sample.close();
    const px = fctx.getImageData(0, 0, iw, ih).data;
    let top = 255;
    if (m.normalize?.scaleToMax) { top = 1; for (let i = 0; i < px.length; i += 4) top = Math.max(top, px[i], px[i + 1], px[i + 2]); }
    const mean = m.normalize?.mean ?? [0, 0, 0], std = m.normalize?.std ?? [1, 1, 1];
    for (let i = 0, p = 0; p < n; i += 4, p++) {
      rgb[p] = (px[i] / top - mean[0]) / std[0];
      rgb[n + p] = (px[i + 1] / top - mean[1]) / std[1];
      rgb[2 * n + p] = (px[i + 2] / top - mean[2]) / std[2];
    }
    const tensor = new ort.Tensor("float32", rgb, [1, 3, ih, iw]);
    // A model that keeps state starts cold: it sees the first frame a few times, so it has settled by frame 0.
    if (frames === 0 && m.recurrent) for (let w = 0; w < m.recurrent.warmup; w++) await step(tensor);
    const a = performance.now();
    const alpha = await step(tensor);
    spent += performance.now() - a; ran++;
    const data = alpha.data;
    let lo = 0, hi = 1;
    if (m.stretch) { lo = Infinity; hi = -Infinity; for (let p = 0; p < n; p++) { lo = Math.min(lo, data[p]); hi = Math.max(hi, data[p]); } }
    const span = Math.max(hi - lo, 1e-6);
    let soft = 0, cover = 0, change = 0, x0 = iw, y0 = ih, x1 = -1, y1 = -1;
    const now = new Float32Array(n);
    for (let p = 0; p < n; p++) {
      const v = Math.min(1, Math.max(0, (data[p] - lo) / span));
      now[p] = v;
      if (v > 0.05 && v < 0.95) soft++;
      if (v > 0.5) { cover++; const x = p % iw, y = (p / iw) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (prev) change += Math.abs(v - prev[p]);
      const g = Math.round(v * 255), j = p * 4;
      grey.data[j] = g; grey.data[j + 1] = g; grey.data[j + 2] = g; grey.data[j + 3] = 255;
    }
    softSum += soft / n; softMax = Math.max(softMax, soft / n); coverSum += cover / n;
    if (prev) { const c = change / n; changeSum += c; changeN++; if (c > changeMax) { changeMax = c; changeAt = t; } }
    prev = now;
    if (t >= nextSubject && x1 >= 0) {
      subjects.push({ at: t, x: x0 / iw, y: y0 / ih, w: (x1 + 1 - x0) / iw, h: (y1 + 1 - y0) / ih });
      nextSubject = t + job.subjectEvery;
    }
    sctx.putImageData(grey, 0, 0);
    mctx.drawImage(small, 0, 0, W, H);
    await source.add(t, d);
    frames++;
    if (frames % 10 === 0) console.log("matte-progress " + frames + " " + (spent / ran / 1000).toFixed(3));
  }
  await output.finalize();
  out = new Uint8Array(output.target.buffer);
  return {
    frames, width: W, height: H, fps,
    perFrame: ran ? spent / ran / 1000 : 0,
    soft: { mean: frames ? softSum / frames : 0, max: softMax },
    change: { mean: changeN ? changeSum / changeN : 0, max: changeMax, at: changeAt },
    coverage: frames ? coverSum / frames : 0,
    subjects,
    backend: "wasm (" + ort.env.wasm.numThreads + " threads)",
    bytes: out.length,
  };
}

function read(offset, size) {
  let s = "";
  const part = out.subarray(offset, offset + size);
  for (let i = 0; i < part.length; i += 0x8000) s += String.fromCharCode.apply(null, part.subarray(i, i + 0x8000));
  return btoa(s);
}

window.__matte = { run, read };
</script>
`;

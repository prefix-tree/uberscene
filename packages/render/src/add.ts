// `uberscene add talk.mp4`: one manifest entry per media file, probed from the file itself, with the words of the
// transcript beside it (`talk.json`, `talk.vtt` or `talk.srt`) found by convention. The manifest stays the one place
// words live, so the preview and the export always agree on `word:N`. A `.cube` file is a LUT, checked and listed.
import { existsSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";

import { ALL_FORMATS, AudioSampleSink, FilePathSource, Input } from "mediabunny";

import { type AssetEntry, type AssetManifest, parseCube, parseTranscript } from "@uberscene/sdk";

import { type BeatTrack, beatGrid, detectBeats } from "./beats";
import { imageSize } from "./image-size";
import { findManifest, MANIFEST_FILE, OLD_MANIFEST_FILE } from "./manifest-file";

const IMAGE = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
/** Transcripts beside the media, best first: JSON from a speech-to-text tool has word times; subtitles do not. */
const TRANSCRIPTS = [".json", ".vtt", ".srt"] as const;

export interface AddOptions {
  /**
   * The manifest to write. Default: the nearest `uberscene.json` from `cwd` upward; a `manifest.json` already in
   * `cwd` or beside the media; otherwise a new `uberscene.json` in `cwd`.
   */
  readonly manifest?: string;
  /** The folder the lookup starts in; default the process's. */
  readonly cwd?: string;
  /** The asset id; default the file name without its extension. */
  readonly id?: string;
  /** A transcript file other than the one beside the media. */
  readonly transcript?: string;
  /**
   * Find the beats (`beat:N`). Default: for a sound file with no transcript, which is most likely music; `true` for
   * a video's sound too, `false` never.
   */
  readonly beats?: boolean;
  /** Set the beats as a grid at this tempo instead of finding them, from `firstBeat`. */
  readonly bpm?: number;
  /** With `bpm`: the time of the first beat, in seconds. Default 0. */
  readonly firstBeat?: number;
}

export interface AddResult {
  readonly manifest: string;
  readonly entry: AssetEntry;
  /** The transcript file read, if any. */
  readonly transcript?: string;
  readonly estimated: boolean;
  readonly warnings: readonly string[];
}

/** Probes the media file, reads its transcript, and writes its entry into the manifest. */
export async function addAsset(media: string, options: AddOptions = {}): Promise<AddResult> {
  if (!existsSync(media)) throw new Error(`${media} does not exist`);
  const id = options.id ?? basename(media, extname(media));
  const manifestPath = options.manifest ?? manifestFor(media, options.cwd ?? process.cwd());
  const manifest: AssetManifest = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as AssetManifest)
    : { assets: {} };
  const probed = await probe(media);
  const warnings: string[] = [];

  if (probed.kind === "lut" && options.transcript) throw new Error(`${basename(media)} is a LUT; it has no transcript`);
  const transcriptFile =
    probed.kind === "lut"
      ? undefined
      : (options.transcript ??
        TRANSCRIPTS.map((ext) => join(dirname(media), `${basename(media, extname(media))}${ext}`)).find(
          (f) => resolve(f) !== resolve(manifestPath) && existsSync(f),
        ));
  let transcript: AssetEntry["transcript"];
  let estimated = false;
  if (transcriptFile) {
    if (!existsSync(transcriptFile)) throw new Error(`${transcriptFile} does not exist`);
    const parsed = parseTranscript(readFileSync(transcriptFile, "utf8"));
    transcript = { words: parsed.words };
    estimated = parsed.estimated;
    const late = parsed.words.filter((w) => w.end > probed.duration + 0.05).length;
    if (probed.kind !== "image" && late > 0)
      warnings.push(
        `${late} word${late === 1 ? "" : "s"} in ${basename(transcriptFile)} end after the media does (${probed.duration} s): is it the transcript of ${basename(media)}?`,
      );
  }

  const previous = manifest.assets?.[id];
  let beats: BeatTrack | undefined;
  if (options.bpm !== undefined) {
    if (probed.kind !== "audio" && probed.kind !== "video")
      throw new Error(`${basename(media)} has no sound to give beats`);
    beats = beatGrid(options.bpm, options.firstBeat ?? 0, probed.duration);
  } else if (options.beats ?? (probed.kind === "audio" && !transcript && !previous?.transcript)) {
    if (probed.audio) {
      beats = await findBeats(media);
      if (beats.beats.length === 0)
        warnings.push(`found no beats in ${basename(media)}; set them with --bpm <tempo> --first-beat <seconds>`);
    }
  }
  // Fields this command does not own (shots, silences, subjects, waveform) stay as they were.
  const entry: AssetEntry = {
    ...previous,
    ...probed,
    id,
    ...(transcript ? { transcript } : previous?.transcript ? { transcript: previous.transcript } : {}),
    ...(beats && beats.beats.length > 0 ? { beats: beats.beats, tempo: beats.tempo } : {}),
  };
  const next = { ...manifest, assets: { ...manifest.assets, [id]: entry } };
  await writeFile(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  return {
    manifest: manifestPath,
    entry,
    ...(transcriptFile ? { transcript: transcriptFile } : {}),
    estimated,
    warnings,
  };
}

/** Decodes the file's first sound track to mono and finds its beats. */
async function findBeats(path: string): Promise<BeatTrack> {
  const input = new Input({ source: new FilePathSource(path), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) return { tempo: 0, beats: [] };
    const sampleRate = await track.getSampleRate();
    const chunks: Float32Array[] = [];
    let length = 0;
    const plane = { data: new Float32Array(0) };
    for await (const sample of new AudioSampleSink(track).samples()) {
      const frames = sample.numberOfFrames;
      const mono = new Float32Array(frames);
      if (plane.data.length < frames) plane.data = new Float32Array(frames);
      for (let ch = 0; ch < sample.numberOfChannels; ch++) {
        sample.copyTo(plane.data, { planeIndex: ch, format: "f32-planar" });
        for (let i = 0; i < frames; i++)
          mono[i] = (mono[i] as number) + (plane.data[i] as number) / sample.numberOfChannels;
      }
      chunks.push(mono);
      length += frames;
      sample.close();
    }
    const all = new Float32Array(length);
    let at = 0;
    for (const c of chunks) {
      all.set(c, at);
      at += c.length;
    }
    return detectBeats(all, sampleRate);
  } finally {
    input.dispose?.();
  }
}

/** The manifest `add` writes when none is named. */
function manifestFor(media: string, cwd: string): string {
  const found = findManifest(cwd);
  if (found.path) return found.path;
  const beside = join(dirname(media), OLD_MANIFEST_FILE);
  return existsSync(beside) ? beside : join(cwd, MANIFEST_FILE);
}

type Probed = Pick<AssetEntry, "kind" | "duration" | "fps" | "width" | "height" | "audio">;

/** What the manifest needs from a media file: its kind, length, picture size and rate, and sound. */
async function probe(path: string): Promise<Probed> {
  if (extname(path).toLowerCase() === ".cube") {
    try {
      parseCube(await readFile(path, "utf8"));
    } catch (error) {
      throw new Error(`cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return { kind: "lut", duration: 0 };
  }
  if (IMAGE.has(extname(path).toLowerCase())) {
    const size = imageSize(await readFile(path), path);
    return { kind: "image", duration: 0, ...size };
  }
  const input = new Input({ source: new FilePathSource(path), formats: ALL_FORMATS });
  try {
    const video = await input.getPrimaryVideoTrack();
    const audios = await input.getAudioTracks();
    const first = audios[0];
    // A video is as long as its picture (an audio track often runs a few ms past it); a sound file, as its sound.
    const duration = round(await (video ? video.computeDuration() : input.computeDuration()), 3);
    const audio = first
      ? {
          audio: {
            sampleRate: await first.getSampleRate(),
            channels: await first.getNumberOfChannels(),
            streams: audios.length,
          },
        }
      : {};
    if (!video) {
      if (!first) throw new Error("it has no video or audio track");
      return { kind: "audio", duration, ...audio };
    }
    const stats = await video.computePacketStats(120);
    return {
      kind: "video",
      duration,
      fps: round(stats.averagePacketRate, 2),
      width: await video.getDisplayWidth(),
      height: await video.getDisplayHeight(),
      ...audio,
    };
  } catch (error) {
    throw new Error(`cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    input.dispose?.();
  }
}

const round = (n: number, places: number): number => Math.round(n * 10 ** places) / 10 ** places;

/** One line for the terminal: `talk: video, 10.2 s, 1920x1080 at 30 fps, 312 words from talk.json`. */
export function describeAdded(result: AddResult): string {
  const e = result.entry;
  const parts: string[] = [e.kind];
  if (e.kind !== "image" && e.kind !== "lut") parts.push(`${e.duration} s`);
  if (e.width && e.height) parts.push(`${e.width}x${e.height}${e.fps ? ` at ${e.fps} fps` : ""}`);
  if (e.kind === "video") parts.push(e.audio ? "with sound" : "no sound");
  if (result.transcript && e.transcript)
    parts.push(
      `${e.transcript.words.length} words ${result.estimated ? "estimated from" : "from"} ${basename(result.transcript)}`,
    );
  if (e.beats?.length) parts.push(`${e.beats.length} beats at ${e.tempo} BPM (beat:0 to beat:${e.beats.length - 1})`);
  return `${e.id}: ${parts.join(", ")}`;
}

/** The element that plays the asset, to paste into the video: `<Clip id="talk" src="asset:talk" />`. A LUT has none. */
export function snippetOf(result: AddResult): string | null {
  const e = result.entry;
  if (e.kind === "lut") return null;
  return `<${e.kind === "audio" ? "Audio" : "Clip"} id="${e.id}" src="asset:${e.id}" />`;
}

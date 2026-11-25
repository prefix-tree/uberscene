// The crossing scene (examples/3d/crossing.js) played as media in the Player: crossing-clip.tsx lists the file as a
// `scene` asset and cuts it with <Clip>s. The media resolver hands the Player the file as an editor would; the scene
// engine runs it and draws each frame the clips ask for. The test seeks it and reads the composition's pixels.
/// <reference types="vite/client" />
import { createRef, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Player, type PlayerRef } from "@uberscene/player";
import { type AssetManifest, loadModule, runModule } from "@uberscene/sdk";
import { collect, resolve } from "@uberscene/sdk/resolver";

import sceneSource from "../../../../../examples/3d/crossing.js?raw";
import source from "../../../../../examples/3d/crossing-clip.tsx?raw";
import { installFreeCodeLibraries, installSceneFiles } from "../../../src/libraries";

const imports = installFreeCodeLibraries();
installSceneFiles((s) => runModule(s, { imports }));

declare global {
  interface Window {
    __ready?: boolean;
    __seek(t: number): Promise<void>;
    /** The composition's canvas as RGBA bytes, base64. */
    __pixels(): string;
    /** An image (a data URL) as RGBA bytes, base64. */
    __decode(url: string): Promise<string>;
  }
}

const video = loadModule(source, { imports });
const manifest = (video as unknown as { manifest: AssetManifest }).manifest;
const element = video.default({}) as ReactElement;
const state = resolve(collect(element), manifest);
const media = { resolve: async () => ({ kind: "blob" as const, blob: new Blob([sceneSource]) }) };
const ref = createRef<PlayerRef>();
createRoot(document.getElementById("root")!).render(
  <Player ref={ref} state={state} element={element} media={media} fit="none" controls={false} />,
);

const frames = (n: number): Promise<void> =>
  new Promise((r) => {
    const step = (): void => {
      if (--n <= 0) r();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

window.__seek = async (t) => {
  await ref.current!.seekTo(t);
  await frames(3);
};

function rgba(source: CanvasImageSource, width: number, height: number): string {
  const probe = document.createElement("canvas");
  probe.width = width;
  probe.height = height;
  const ctx = probe.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  const data = ctx.getImageData(0, 0, width, height).data;
  let s = "";
  for (let i = 0; i < data.length; i += 0x8000) s += String.fromCharCode(...data.subarray(i, i + 0x8000));
  return btoa(s);
}

window.__pixels = () => {
  const c = document.querySelector<HTMLCanvasElement>(`canvas[data-kind="composition"]`)!;
  return rgba(c, c.width, c.height);
};

window.__decode = async (url) => {
  const img = new Image();
  img.src = url;
  await img.decode();
  return rgba(img, img.naturalWidth, img.naturalHeight);
};

const wait = (): void => {
  if (ref.current && document.querySelector(`canvas[data-kind="composition"]`)) window.__ready = true;
  else requestAnimationFrame(wait);
};
wait();

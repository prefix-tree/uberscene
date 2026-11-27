// The crossing edit from examples/3d in the Player, loaded from its text as an editor loads a file: the video file and
// the scene module it imports. The test seeks it and reads the composition canvas, where the scene clip is drawn.
/// <reference types="vite/client" />
import { createRef, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Player, type PlayerRef } from "@uberscene/player";
import { loadModule } from "@uberscene/sdk";
import { collect, resolve } from "@uberscene/sdk/resolver";

import sceneSource from "../../../../../examples/3d/crossing.scene.js?raw";
import source from "../../../../../examples/3d/crossing.tsx?raw";
import { installFreeCodeLibraries } from "../../../src/libraries";

const imports = installFreeCodeLibraries();

declare global {
  interface Window {
    __ready?: boolean;
    __seek(t: number): Promise<void>;
    /** The composition canvas as RGBA bytes, base64. */
    __pixels(): string;
    /** An image (a data URL) as RGBA bytes, base64. */
    __decode(url: string): Promise<string>;
  }
}

const video = loadModule(source, { imports, files: { "crossing.scene.js": sceneSource } });
const element = video.default({}) as ReactElement;
const state = resolve(collect(element), { assets: {} });
const ref = createRef<PlayerRef>();
createRoot(document.getElementById("root")!).render(
  <Player ref={ref} state={state} element={element} media={{}} fit="none" controls={false} />,
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
  await frames(2);
};

function rgba(image: CanvasImageSource, width: number, height: number): string {
  const probe = document.createElement("canvas");
  probe.width = width;
  probe.height = height;
  const ctx = probe.getContext("2d")!;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, width, height).data;
  let s = "";
  for (let i = 0; i < data.length; i += 0x8000) s += String.fromCharCode(...data.subarray(i, i + 0x8000));
  return btoa(s);
}

window.__pixels = () => {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-kind="composition"]')!;
  return rgba(canvas, canvas.width, canvas.height);
};

window.__decode = async (url) => {
  const img = new Image();
  img.src = url;
  await img.decode();
  return rgba(img, img.naturalWidth, img.naturalHeight);
};

const wait = async (): Promise<void> => {
  if (ref.current) {
    await window.__seek(3);
    window.__ready = true;
    return;
  }
  requestAnimationFrame(() => void wait());
};
void wait();

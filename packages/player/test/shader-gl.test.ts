// The WebGL resources a shader runner holds: a shader that fails to build is built once and leaves nothing behind,
// and a runner, painter or compositor that is done gives its context back (a browser keeps only about 16).

import { CanvasPainter } from "../src/render/painter";
import { ShaderRunner } from "../src/render/shaders";
import { FakeFrameSource, fakeResolver, recorderCanvas } from "./helpers/fakes";
import { DEFAULT_MANIFEST, makeState } from "./helpers/state";
import { AssetSources, Compositor, ManualClock } from "./internal";

/** Just enough of a WebGL 2 context to build programs, counting what is made, deleted and given back. */
function fakeGl() {
  const counts = { shaders: 0, deletedShaders: 0, programs: 0, deletedPrograms: 0, compiles: 0, lost: 0 };
  const sources = new Map<object, string>();
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    createBuffer: () => ({}),
    bindBuffer: () => undefined,
    bufferData: () => undefined,
    createShader: () => {
      counts.shaders++;
      return {};
    },
    shaderSource: (shader: object, text: string) => sources.set(shader, text),
    compileShader: () => {
      counts.compiles++;
    },
    getShaderParameter: (shader: object) => !sources.get(shader)?.includes("TYPO"),
    getShaderInfoLog: () => "ERROR: 0:1: 'TYPO' : syntax error",
    deleteShader: () => {
      counts.deletedShaders++;
    },
    createProgram: () => {
      counts.programs++;
      return {};
    },
    attachShader: () => undefined,
    bindAttribLocation: () => undefined,
    linkProgram: () => undefined,
    getProgramParameter: () => true,
    getProgramInfoLog: () => "",
    deleteProgram: () => {
      counts.deletedPrograms++;
    },
    getExtension: (name: string) =>
      name === "WEBGL_lose_context"
        ? {
            loseContext: () => {
              counts.lost++;
            },
          }
        : null,
  };
  const createCanvas = () => ({ width: 4, height: 4, getContext: () => gl }) as unknown as OffscreenCanvas;
  return { gl, counts, createCanvas };
}

type Internals = {
  context(): unknown;
  programFor(
    gl: unknown,
    kind: string,
    source: string,
    d: readonly unknown[],
    f: boolean,
    t: readonly string[],
  ): unknown;
};

describe("a shader that does not compile", () => {
  it("is compiled once, however many frames ask for it, and leaves no shader or program behind", () => {
    const { counts, createCanvas } = fakeGl();
    const runner = new ShaderRunner(4, 4, createCanvas) as unknown as Internals;
    const gl = runner.context();
    for (let frame = 0; frame < 60; frame++)
      expect(() => runner.programFor(gl, "effect", "void main() { TYPO }", [], true, [])).toThrow(/does not compile/);
    expect(counts.compiles).toBe(2);
    expect(counts.deletedShaders).toBe(counts.shaders);
    expect(counts.deletedPrograms).toBe(counts.programs);
  });

  it("keeps a program that does build", () => {
    const { counts, createCanvas } = fakeGl();
    const runner = new ShaderRunner(4, 4, createCanvas) as unknown as Internals;
    const gl = runner.context();
    const a = runner.programFor(gl, "effect", "void main() {}", [], true, []);
    expect(runner.programFor(gl, "effect", "void main() {}", [], true, [])).toBe(a);
    expect(counts.programs).toBe(1);
    expect(counts.deletedPrograms).toBe(0);
  });
});

describe("a WebGL context", () => {
  it("is given back when its runner is disposed, and the runner draws nothing after", () => {
    const { counts, createCanvas } = fakeGl();
    const runner = new ShaderRunner(4, 4, createCanvas);
    expect(runner.available).toBe(true);
    runner.dispose();
    expect(counts.lost).toBe(1);
    expect(runner.available).toBe(false);
    runner.dispose();
    expect(counts.lost).toBe(1);
  });

  it("is given back when its painter is disposed", () => {
    const { counts, createCanvas } = fakeGl();
    const painter = new CanvasPainter(4, 4, createCanvas);
    expect((painter as unknown as { runner(): ShaderRunner }).runner().available).toBe(true);
    painter.dispose();
    expect(counts.lost).toBe(1);
  });

  it("is given back by a compositor when it is disposed, and when a new size replaces its painter", () => {
    const sources = new AssetSources({
      media: fakeResolver([]),
      manifest: DEFAULT_MANIFEST,
      clock: new ManualClock(),
      onError: () => {},
      frameSourceFactory: (id) => new FakeFrameSource(id),
    });
    const state = makeState({ tracks: [{ id: "main", items: [] }] });
    const comp = new Compositor(state, { sources, createCanvas: recorderCanvas });
    const painterOf = () => (comp as unknown as { painter: CanvasPainter }).painter;
    const disposed: CanvasPainter[] = [];
    const watch = (p: CanvasPainter) => {
      const own = p.dispose.bind(p);
      p.dispose = () => {
        disposed.push(p);
        own();
      };
    };
    const first = painterOf();
    watch(first);
    const resized = { ...state, composition: { ...state.composition, width: 1280, height: 720 } };
    comp.setState(resized);
    expect(disposed).toEqual([first]);
    const second = painterOf();
    watch(second);
    comp.dispose();
    expect(disposed).toEqual([first, second]);
  });
});

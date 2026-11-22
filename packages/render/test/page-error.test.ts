// The error an export reports when a page's work fails: a failed media fetch is told as the resolver's message for
// that asset; anything else stays itself, so a missing asset under --continue does not hide a bug in the file.
import { describe, expect, it } from "vitest";

import { pageError } from "../src/web/engine";

const media = [
  'no media file for asset "logo" in /work/media',
  'no media file for asset "bars" in /work/media (it is not in the manifest either)',
];

describe("pageError", () => {
  it("tells a failed media fetch as the resolver's message for that asset", () => {
    const fetch = new Error("page.evaluate: Error: Error fetching /media/bars: 500 Internal Server Error");
    const told = pageError(fetch, media) as Error;
    expect(told.message).toBe(`${media[1]}; also ${media[0]}`);
    expect(told.cause).toBe(fetch);
  });

  it("names every missing asset whichever fetch fails first", () => {
    const bars = pageError(new Error("Error fetching /media/bars: 500"), media) as Error;
    const logo = pageError(new Error("Error fetching /media/logo: 500"), media) as Error;
    for (const told of [bars, logo]) {
      expect(told.message).toContain('asset "bars"');
      expect(told.message).toContain('asset "logo"');
    }
    expect(logo.message.startsWith(media[0] as string)).toBe(true);
  });

  it("decodes the asset id from the URL", () => {
    const fetch = new Error("Error fetching /media/my%20clip: 500 Internal Server Error");
    expect((pageError(fetch, ['no media file for asset "my clip" in /m']) as Error).message).toBe(
      'no media file for asset "my clip" in /m',
    );
  });

  it("keeps a frame that timed out, with the media failure as its cause", () => {
    const timeout = new Error("frame 412 (13.73 s) did not finish within 60 s: stuck in settle");
    const told = pageError(timeout, media) as Error;
    expect(told).toBe(timeout);
    expect(told.message).toContain("did not finish");
    expect((told.cause as Error).message).toBe(media[0]);
  });

  it("keeps an error in the file's code", () => {
    const bug = new Error("page.evaluate: TypeError: Cannot read properties of undefined (reading 'title')");
    expect((pageError(bug, media) as Error).message).toContain("Cannot read properties of undefined");
  });

  it("changes nothing when no media failed", () => {
    const bug = new Error("something else");
    expect(pageError(bug, [])).toBe(bug);
    expect((bug as Error).cause).toBeUndefined();
  });
});

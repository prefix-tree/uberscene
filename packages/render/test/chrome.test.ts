// The export runs on one Chrome milestone: any other is refused before a page opens, with what to do instead.
import { afterEach, describe, expect, it } from "vitest";

import { anyChrome, CHROME_MILESTONE, otherChromeWarning, wrongChrome } from "../src/web/chrome";

describe("wrongChrome", () => {
  it("accepts any build of the pinned milestone", () => {
    expect(wrongChrome(`${CHROME_MILESTONE}.0.8080.0`, "/opt/chrome")).toBeNull();
    expect(wrongChrome(`${CHROME_MILESTONE}.0.7999.12`, "/opt/chrome")).toBeNull();
  });

  it("refuses an older or newer milestone, naming the binary, its version and the way out", () => {
    for (const version of ["153.0.8010.12", `${Number(CHROME_MILESTONE) + 1}.0.8200.0`]) {
      const message = wrongChrome(version, "/opt/chrome");
      expect(message).toContain(`Chrome ${CHROME_MILESTONE} only`);
      expect(message).toContain(`/opt/chrome is Chrome ${version}`);
      expect(message).toContain("uberscene browser install");
    }
  });

  it("refuses a version it cannot read", () => {
    expect(wrongChrome("unknown", "/opt/chrome")).toContain("is Chrome unknown");
  });

  it("names the way to draw on it anyway", () => {
    expect(wrongChrome("153.0.8010.12", "/opt/chrome")).toContain("UBERSCENE_ANY_CHROME=1");
  });
});

describe("UBERSCENE_ANY_CHROME", () => {
  const before = process.env.UBERSCENE_ANY_CHROME;
  afterEach(() => {
    if (before === undefined) delete process.env.UBERSCENE_ANY_CHROME;
    else process.env.UBERSCENE_ANY_CHROME = before;
  });

  it("is off unless set to 1", () => {
    delete process.env.UBERSCENE_ANY_CHROME;
    expect(anyChrome()).toBe(false);
    process.env.UBERSCENE_ANY_CHROME = "true";
    expect(anyChrome()).toBe(false);
    process.env.UBERSCENE_ANY_CHROME = "1";
    expect(anyChrome()).toBe(true);
  });

  it("warns with the version it draws on and the one the export is tested on", () => {
    const warning = otherChromeWarning("153.0.8010.12", "/opt/chrome");
    expect(warning).toContain("Chrome 153.0.8010.12 (/opt/chrome)");
    expect(warning).toContain(`tested on Chrome ${CHROME_MILESTONE}`);
  });
});

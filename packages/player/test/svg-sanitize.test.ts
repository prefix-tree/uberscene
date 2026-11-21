// @vitest-environment jsdom
// The cleaned markup as the page reads it: put into the document by its HTML parser, which reads <foreignobject>,
// <IFRAME> and HREF as the real element and attribute. Nothing that runs code or loads a document may come out.
import { prepareSvg } from "../src/overlays/svg";

const box = { width: 100, height: 50 };
const HOSTILE = [
  '<foreignobject><IFRAME srcdoc="&lt;script&gt;parent.hit=1&lt;/script&gt;"/></foreignobject>',
  "<ForeignObject><div xmlns='http://www.w3.org/1999/xhtml'><iframe src='javascript:parent.hit=1'/></div></ForeignObject>",
  "<SCRIPT>parent.hit = 1</SCRIPT>",
  "<svg:script>parent.hit = 1</svg:script>",
  '<image href="x" ONLOAD="parent.hit = 1" width="1" height="1"/>',
  '<a HREF="javascript:parent.hit=1"><rect width="1" height="1"/></a>',
  '<OBJECT data="x"/><Embed src="x"/>',
];

describe("an SVG's cleaned markup in the page", () => {
  it.each(HOSTILE)("holds nothing that runs: %s", (part) => {
    const host = document.createElement("div");
    host.innerHTML = prepareSvg(`<svg viewBox="0 0 10 10">${part}<rect width="10" height="10"/></svg>`, {
      box,
    }).markup;
    expect(host.querySelectorAll("script, iframe, frame, object, embed, foreignObject, foreignobject")).toHaveLength(0);
    for (const el of host.querySelectorAll("*"))
      for (const attr of el.attributes) {
        expect(attr.name).not.toMatch(/^on|^src|srcdoc/i);
        expect(attr.value).not.toMatch(/javascript:/i);
      }
    expect(host.querySelector("rect")).not.toBeNull();
  });
});

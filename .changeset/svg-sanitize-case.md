---
"@uberscene/player": patch
---

An SVG from someone else can no longer run script on the page. Its cleaning matched tag and attribute names by exact
spelling, while the page's HTML parser reads `<foreignobject>`, `<IFRAME>` and `HREF` as the real thing: an SVG with
`<foreignobject><IFRAME srcdoc="…">` or a `javascript:` link in `HREF` kept them. Names are now compared in lower
case without their namespace prefix, `src`, `srcdoc` and form actions are dropped, and a `<STYLE>` element or `STYLE`
attribute is cleaned as the lower-case ones are.

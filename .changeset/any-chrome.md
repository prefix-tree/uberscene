---
"@uberscene/render": patch
---

`UBERSCENE_ANY_CHROME=1` lets the export run on a Chrome of another milestone, named by `UBERSCENE_CHROMIUM`, where Chrome 157 cannot be downloaded (a sandbox with a fixed Chromium). The export warns and draws; text may differ a little from the tests and from other machines. Without it, another milestone is refused as before, and the refusal now names this way out.

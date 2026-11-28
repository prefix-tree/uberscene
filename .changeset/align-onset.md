---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/render": minor
---

`<Audio align="onset">` places a sound by its attack: its start moves earlier by the time to the onset `uberscene add`
measured, so a hit with a quiet lead-in lands on the frame (`NO_ONSET` when the onset is not measured). The sync check
also lists each sound on an `effects` track against its nearest cut, and reports one a few frames off it
(`sound-off-cut`), with the fix.

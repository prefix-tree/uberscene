---
"@uberscene/render": minor
---

`renderStrudel({ code, cps, seconds })` renders a Strudel score to sound, offline in the export's Chrome, each event on the time its pattern gives it; `masterGain` and `writeStrudelWav` master it to a loudness under a ceiling and write it as a WAV (decision 0042). Strudel is AGPL-3.0-or-later and is not a dependency: the first render shows its licence and, once accepted (or with `UBERSCENE_ACCEPT_LICENCE=strudel`), installs the pinned packages (core, mini, tonal for `chord()` and `.voicing()`, transpiler, superdough) into `~/.cache/uberscene/strudel` and bundles them there.

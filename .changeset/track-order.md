---
"@uberscene/player": minor
---

Tracks draw in the order the file writes them, footage included. An overlay track written between two footage tracks (a card over the interview, under a cut-out speaker) is now over the footage beneath it and under the footage above; it used to draw over all footage. The player gives each run of footage tracks a canvas of its own (`trackBands`, `attachCanvas(canvas, band)`), so a file with its footage in one run draws as before. An `<Adjustment>` changes the footage on both sides of such a card. The check warns when a blended clip cannot reach the footage beneath an overlay track.

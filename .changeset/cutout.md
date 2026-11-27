---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": minor
"@uberscene/render": patch
---

`cutout` on a `<Clip>` cuts the subject out of its background with a matte: a greyscale video of the same frames, white where the subject is, named on the footage's manifest entry (`"matte": "talk.matte"`). Where the matte is black the clip is transparent, so what is under it shows, the same in the preview and the export. The matte follows the clip's trims, speed, freezes, crop and box, and the cut is made before `effects`. `{ shrink, feather }` pulls the edge in and softens it. A cutout with no matte is an error that says how to add one, and `uberscene lint` reports it as `cutout-without-matte`. Export caches key on the matte too.

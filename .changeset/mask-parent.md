---
"@uberscene/sdk": patch
---

`mask/create` is offered and accepted only on an element that takes a `<Mask>` as a child: footage, a nested
sequence, a title, a shape, an SVG, a sticker. It was offered on every element that is drawn, a `<Layer>` and an
`<Adjustment>` among them, where the mask was dropped when the file was read again; there it is now refused with
`INVALID_PARAMS`.

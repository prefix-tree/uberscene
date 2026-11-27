---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": minor
---

A `<Shape>` takes keys on its own values, so it can grow, change colour, draw its line on and change shape.

- `width`, `height`, `stroke.thickness` and `stroke.dashOffset` take keys and generators, as `transform` does.
- `fill` (a colour) and `stroke.color` take keys of colours, moved through OKLab, so red to blue passes through a clear purple. A theme token works as a key.
- `points` takes keys of point lists; two keys with as many points move point by point.
- The key actions (`key/add` and the others) accept these paths on a shape and check the value. A cut (`clip/split`) through a colour or a morph keeps what is drawn there.
- New in `@uberscene/kit/schema`: `parseColor`, `toOklab`, `fromOklab`, `formatColor`, `mixColor`, and `curveAt` takes a blend kind (`blendFor(property)` picks it). Its default is unchanged: two strings still step.

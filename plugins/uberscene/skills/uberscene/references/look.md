# Look: one look, chosen on purpose

Read this before you write the theme of a new video. A look nobody chose is the theme's defaults, and defaults are
what makes a video look generated.

## Where the look comes from

Take it from the first of these that exists, in this order:

1. **The person's own material**: a brand guide, a design file, their site, a video of theirs they like. Take the
   colours, the fonts and the corner radius from it, exactly.
2. **The product or subject itself**: the app's real screens, the packaging, the place. The video looks like the
   thing it's about.
3. **A reference the person names** ("like Apple's keynotes", "like a 90s VHS tape"). Turn it into numbers (below).
4. **Only then a theme**: `midnight`, `paper`, `neon`, `pastel`, `mono` or `bold`, branded with the person's colour.

Ask for the brand when there is none and the video is for a company. Don't guess a logo's colours from memory.

## Turn words into values

People describe a look in adjectives. Turn each into values before writing any element:

| They say | Theme | Type | Motion | Picture |
|---|---|---|---|---|
| premium, elegant | `paper` or `midnight`, one muted accent | a serif or a light sans, wide `letterSpacing` on small caps | `calm`, eases `easeOutCubic` and longer, 0.6-0.9 s | slow push-ins, soft `vignette`, low `grain` |
| modern, clean | `mono` or `paper`, one bright accent | a grotesk (Inter, Geist), weights 400 and 600 | `snappy`, 0.3-0.5 s | hard cuts, lots of empty space, no effects |
| bold, loud | `bold`, two strong colours | condensed display caps, big (hero words 60-90 % of the width) | `snappy`, punches on the beat | fast cuts (0.5-1.5 s), `contrast` up |
| playful | `pastel` or `bold` | a rounded sans | `bouncy`, `easeOutBack` entrances | shapes, `Sticker`s, squash and stretch |
| cinematic | `midnight`, desaturated | a serif or a thin sans, small | `editorial`, long holds | letterbox bars (two `<Shape>`s), `grain`, a LUT, `whiteBalance` warm or cool |
| technical, developer | `midnight` or `mono` | a mono for labels (`$mono`), a sans for headings | `snappy` | terminals, code, diagrams that draw themselves |

Write the result as one look line in the plan ([story.md](story.md)): ground, accent, fonts, motion, picture.

## Rules of a calm look

- **One accent, rationed.** One colour that means "look here", on the one thing that matters in each frame. Everything
  else is the ground, the text colour and one muted grey.
- **Tokens, never literals.** Colours as `$primary`, `$accent`, `$text`, `$muted`; fonts as `$heading`, `$body`,
  `$mono`; corners as `$radius`. Then the person re-brands it by changing the theme, and nothing else.
- **Two fonts at most**, and pick them by looking: `uberscene fonts --for headline --sheet fonts.png --text "THEIR
  WORDS"`.
- **One hero per frame.** Give the main thing at least 40 % of the frame. Don't centre everything: a left-aligned
  title with space on the right reads as designed; everything in the middle reads as a template.
- **Room at the edges.** Keep text inside the title-safe area (`--check-layout` holds it there) and important pictures
  inside action-safe.
- **Flat beats busy.** A gradient full of glow says nothing. Use footage, a real screen or a flat colour.
- **Contrast for reading.** Text on footage gets a scrim (`<Layer ground>` or a title `background`) or a shadow. Light
  text on a light sky is unreadable at phone size.
- **Colour the picture once.** Grade in one place, an `<Adjustment>` over the whole cut or the same `effects` on every
  clip, so shots match. Correct first (`exposure`, `whiteBalance`), then the look (`lut`, `vibrance`).

## Leave it re-brandable

Whatever a person might change goes in `schema`: the product name, the colours (`knob.color()`), the logo
(`knob.image()`), the call to action. The video should be re-brandable without touching a single element.

## What a default looks like

After every `look`, name the defaults you see and replace them; add each to the plan's banned line so it doesn't come
back:

- the theme's palette, unchanged;
- every title in the same preset at the same size, centred;
- every element entering with the same fade;
- a solid black or white frame with a title in the middle;
- one stock font for everything;
- effects stacked because they're there (`glow` + `shadow` + `vignette` on one title).

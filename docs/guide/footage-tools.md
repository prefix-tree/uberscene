# Keying, blurs and pins

The everyday work on footage: take out a green screen, hide a face or a screen, put a recording into a screen filmed
at an angle, and add a camera look or a texture. Each is an entry of a clip's `effects`, and runs as a shader, the
same in the preview and the export.

## Green screen

[`colorKey`](/reference/effects/colorKey) makes the key colour transparent, so the tracks beneath show through. Put
the background on a track below the keyed clip:

```tsx
<Track id="background">
  <Clip id="studio" src="asset:studio" />
</Track>
<Track id="presenter">
  <Clip id="talk" src="asset:greenscreen"
    effects={[{ type: "colorKey", color: "#18c43a", tolerance: 0.3, softness: 0.1, spill: 0.6 }]} />
</Track>
```

To tune a key:

1. Pick `color` from the screen in the footage, not pure green.
2. Raise `tolerance` until the screen is gone.
3. Raise `softness` until hair and edges stop looking cut out.
4. Set `spill` (0 to 1) to remove the green light the screen bounces onto the subject.

It compares colour, not brightness, so the shadowed and lit parts of the screen go together.

## Cut out a person

Footage with no green screen needs a matte: a greyscale video of the same frames, white where the person is and black
where the background is. `uberscene matte` makes one with a matting model, writes it beside the footage, and names it
on the footage's manifest entry; then set `cutout` on the clip:

```bash
npm i -D onnxruntime-web
npx uberscene matte talk.mp4 --accept-licence
```

```text
talk.matte.webm: 878 frames, 1920x1080, matte of talk as talk.matte in uberscene.json
  rvm-resnet50 (GPL-3.0), wasm (4 threads): 0.72 s a frame, 706 s in all
  soft edge 1.2% (most 1.6%), change between frames 0.1% (most 27.9% at 1.67 s), subject 27.2% of the picture
```

```tsx
<Track id="cards" layout="free">
  <Shape id="card" start={0} duration={6} type="rectangle" fill="#1d4ed8" ground width={1920} height={1080}
    box={{ x: 960, y: 540, origin: "center" }} />
</Track>
<Track id="speaker" layout="free">
  <Clip id="talk-cut" src="asset:talk" start={0} in="word:12" out="word:30.end" cutout
    effects={[{ type: "grayscale" }, { type: "contrast", amount: 1.2 }]} />
</Track>
```

- Where the matte is black the clip is transparent, so the tracks drawn before it show. Tracks draw in the order the
  file writes them, footage included, so the card's track comes first. `ground` tells the layout check the card is
  something to sit on, not a callout.
- The matte follows the clip: the same trims, speed, freezes, `reverse`, crop and `box`. Each matte frame is read at
  the same source time as the footage's.
- The cut is made before `effects`, so a black-and-white grade changes the person and not what shows through.
- `cutout` with `shrink: 2, feather: 1` tidies the edge, in pixels of the composition: `shrink` pulls the edge in (to
  lose a rim of the old background), `feather` softens it.
- A clip with `cutout` and no matte is an error that says what to add; `uberscene lint` reports it as
  `cutout-without-matte`.

### Making the matte

`uberscene matte` runs the model on every frame in Chrome, with ONNX Runtime for the web, and writes
`<name>.matte.webm`: one grey frame for each frame of the footage, at its size and rate. It adds the matte to the
manifest as `<id>.matte`, and sets `matte`, `matteModel` (which model made it) and `subjects` (where the person is,
every half second, which `--check-layout` uses) on the footage. A matte already there is kept unless `--force`.

| Model | Licence | On 4 CPU cores, 1080p | Edges |
|---|---|---|---|
| `rvm-resnet50` (default) | GPL-3.0 | about 0.6 s a frame | the best: hair kept, clean around hands |
| `rvm-mobilenet` | GPL-3.0 | about 0.25 s a frame | close to it, a little rougher |
| `u2net-human` | Apache-2.0 | about 1.5 s a frame | clean, but hair as a smooth blob |

UberScene lists these models, it does not ship them. The first use of one shows its licence and downloads it from its
own source into `~/.cache/uberscene/models` (or `UBERSCENE_MODEL_CACHE`), checked against its SHA-256. Running a model
and using its mattes carries no conditions; passing the model file on does, under its licence. On a terminal it asks
once; `--accept-licence` (or `UBERSCENE_ACCEPT_LICENCE=<name>`) accepts it for scripts and agents. `uberscene matte
models` lists them, `--model <name>` picks one, and `UBERSCENE_MODEL_REGISTRY` adds your own, as a JSON file of the
same shape as the package's `models.json`.

What it prints says what it cannot show you: a **soft edge** above about 5% is a blurry matte; a large **change between
frames** at one moment is a flicker to look at there, or a cut in the footage (above, the take cuts from a title
card to the speaker at 1.67 s); a **subject** under 1% of the picture means it found no one.
What makes a good matte, and the faults to look for on white and on a colour, is in the skill's interview reference.

## Hiding a face, a plate or a screen

[`regionBlur`](/reference/effects/regionBlur) blurs inside a box. Give the box keys to follow what it hides:

```tsx
<Clip id="street" src="asset:street"
  effects={[{
    type: "regionBlur",
    box: [{ at: 0, value: [0.42, 0.66, 0.12, 0.06] }, { at: 2.5, value: [0.3, 0.7, 0.14, 0.07] }],
    radius: 10,
    roundness: 0.3,
  }]} />
```

| Param | Does |
|---|---|
| `box` | `[x, y, width, height]`, as fractions of the frame from its top left. |
| `radius` | The blur: the Gaussian's standard deviation in pixels, as CSS `blur()` reads it. |
| `feather` | Fades the blur in over that many pixels inside the edge. |
| `roundness` | 0 to 1: rounds the corners up to a circle or a pill. |
| `inverted` | Blurs everything except the box. |

::: tip
To hide something, make the box larger than it, so nothing recognisable sits in the feathered edge.
:::

For a coarse mosaic instead of a blur, use [`pixelate`](#stylize) with a `box`.

## A recording in a screen

[`cornerPin`](/reference/effects/cornerPin) maps the picture onto four corners, so a screen recording sits in a
screen filmed at an angle. Put the recording on a track above the shot of the device:

```tsx
<Track id="shot">
  <Clip id="laptop" src="asset:laptop-on-desk" />
</Track>
<Track id="screen">
  <Clip id="demo" src="asset:screen-recording"
    effects={[{
      type: "cornerPin",
      topLeft: [0.31, 0.22],
      topRight: [0.68, 0.25],
      bottomRight: [0.66, 0.6],
      bottomLeft: [0.33, 0.58],
    }]} />
</Track>
```

The corners are `topLeft`, `topRight`, `bottomRight` and `bottomLeft`, each `[x, y]` as fractions of the frame. The
picture is warped in perspective, as a flat screen seen at an angle is, and outside its four corners it is
transparent. When the camera moves, give each corner keys.

## Follow something that moves

Every param takes [keys](./animation#effects) in place of its value, lists included: each key's `value` is a whole box
or corner. A box or a corner moves smoothly between two keys, which is how a blur follows a face or a pin follows a
screen.

## Camera looks

These imitate what a lens or a fast camera move does to the picture.

[`zoomBlur`](/reference/effects/zoomBlur) smears the picture toward `center` (`[x, y]`), more the further from it.

| Param | Does |
|---|---|
| `center` | `[x, y]`: the point it smears toward. |
| `length` | Up to that many pixels of smear at the corners. Key it down from a high value for a punch-in. |
| `samples` | Up to 64: trades smoothness for speed. |

[`chromaticAberration`](/reference/effects/chromaticAberration) splits red and blue apart, as a lens fringes.

| Param | Does |
|---|---|
| `distance` | How far apart, in pixels. |
| `angle` | The direction, in degrees clockwise from up. The default 90 is across. |
| `radial` | Splits outward from `center` instead, growing toward the edges. |

## Stylize

These turn footage into print, mosaic or an old screen.

[`halftone`](/reference/effects/halftone) prints the picture as dots on a screen of `size`-pixel cells turned by
`angle`. `amount` mixes the print over the picture.

| `type` | Prints |
|---|---|
| `"mono"` | `ink` on `paper`, by brightness. |
| `"cmyk"` | Four inks, each on its own screen at the classic angles, as a magazine page is printed. |

[`pixelate`](/reference/effects/pixelate) turns the picture into a mosaic of `size`-pixel cells. Give it a `box` and
only that part is pixelated, so it hides a face or a plate the way [`regionBlur`](/reference/effects/regionBlur)
does, but as a coarse mosaic:

```tsx
<Clip id="street" src="asset:street" effects={[{ type: "pixelate", size: 18, box: [0.62, 0.1, 0.2, 0.35], feather: 6 }]} />
```

[`scanlines`](/reference/effects/scanlines) lays dark bands over the picture, for an old screen.

| Param | Does |
|---|---|
| `spacing` | A band every that many pixels. |
| `coverage` | How much of `spacing` each dark band covers, 0 to 1. |
| `intensity` | How dark a band is. |
| `speed` | Rolls the bands by that many pixels a second. |
| `angle` | Turns them. |

## Light and texture

These lay light or moving texture over the picture.

[`lightLeak`](/reference/effects/lightLeak) washes soft blooms of `color` over the picture, wandering as the video
plays and only ever lightening it. `evolution` sets how fast they wander; change `seed` for another pattern. On an
`<Adjustment>` it covers everything beneath, cuts and titles included:

```tsx
<Track id="look" layout="free">
  <Adjustment id="leak" start={0} duration={12} effects={[{ type: "lightLeak", intensity: 0.5, color: "#ff9a4d" }]} />
</Track>
```

[`fractalNoise`](/reference/effects/fractalNoise) draws clouds of noise that change in place over time: about `size`
pixels across, with `octaves` layers of finer detail. `blend` and `opacity` set how they meet the picture:

| `blend` | Gives |
|---|---|
| `screen` | Mist or smoke over footage. |
| `overlay` or `softLight` | A texture. |
| `normal`, on a full-frame `<Shape>` | A moving background. |

::: details Export cost
These looks change the picture's pixels, so they cost more to export without a GPU than a colour effect does. A CMYK
`halftone` and `fractalNoise` with many octaves are the heaviest.
:::

## Where there is no WebGL

These effects need WebGL, which every browser the player runs in has, and the export always has. Where it is missing
they are left out, with a warning.

## Next

- [Colour and grading](./colour): correct and grade the picture.
- [Transitions](./transitions): blend one clip into the next.
- [Effects and transitions](/reference/effects/): every effect and its params.

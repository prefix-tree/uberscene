# Motion catalog

Techniques of motion, each a short, complete file in one look, to copy and adapt: pick one by name when a scene needs it. 27 techniques, grouped by family. Read [motion.md](motion.md) first for how scenes hand over at a cut. Generated from the code by `scripts/gen-docs.ts`; do not edit.

# Principles

## Easing (`easing-curves`)

How a move speeds up and slows down between its keys, instead of running at one speed. Weight and intent: a thing that eases into place looks placed, one at constant speed looks mechanical.

Use it when: Any move from one place to another. A move looks robotic and you can't say why.

- easing: `"easeOutQuart"`, on the first key: fast off the mark, slow into place
- duration: `1 s`, between the two keys on `box.x`

Ask: Move the square across with keys on box.x and easing easeOutQuart, beside one that moves linearly.

```tsx
import { Composition, Shape, Track } from "@uberscene/kit";

// Ease out: fast off the mark, gentle into place. The top square moves at an even speed; the bottom one eases out.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";
const MUTED = "#c9c2b6";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="shapes" layout="free">
        <Shape
          id="linear"
          type="rectangle"
          start={0}
          duration={3}
          width={56}
          height={56}
          cornerRadius={8}
          fill={MUTED}
          box={{
            y: 130,
            origin: "center",
            x: [
              { at: 0.4, value: 120 },
              { at: 1.4, value: 520 },
            ],
          }}
        />
        <Shape
          id="eased"
          type="rectangle"
          start={0}
          duration={3}
          width={56}
          height={56}
          cornerRadius={8}
          fill={ACCENT}
          box={{
            y: 230,
            origin: "center",
            x: [
              { at: 0.4, value: 120, easing: "easeOutQuart" },
              { at: 1.4, value: 520 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
```
## Anticipation (`anticipation`)

A small move the opposite way before the real one, like a hand drawn back before a throw. That something is about to happen, and how much force it takes.

Use it when: A big move that would otherwise start from nowhere. A jump, a throw or a launch.

- pull back: `40 px over 0.4 s`, the opposite way first, easeOutCubic
- move: `340 px over 0.5 s`, then the real move, easeOutQuart

Ask: Before the square moves right, pull it 40 px left for 0.4 s, then send it right with easeOutQuart.

```tsx
import { Composition, Shape, Track } from "@uberscene/kit";

// Anticipation: a small pull back before the move, so the eye knows it is coming.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="shapes" layout="free">
        <Shape
          id="runner"
          type="rectangle"
          start={0}
          duration={3}
          width={64}
          height={64}
          cornerRadius={8}
          fill={ACCENT}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0.4, value: 200, easing: "easeOutCubic" },
              { at: 0.8, value: 160, easing: "easeOutQuart" },
              { at: 1.3, value: 500 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
```
## Overshoot (`spring-overshoot`)

An entrance that goes a little past its place and settles back. Life and energy: the thing arrives with some spring in it.

Use it when: Popping in a card, a badge or a button. A result that should land with a little bounce.

- easing: `"easeOutBack"`, passes its size and settles back
- scale: `0 to 1 over 0.6 s`, keys on `transform.scale`

Ask: Pop the card in with a scale key from 0 to 1 and easing easeOutBack.

```tsx
import { Composition, Shape, Track } from "@uberscene/kit";

// Overshoot: an entrance that passes its size and settles back, for something that should feel alive.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="shapes" layout="free">
        <Shape
          id="pop"
          type="rectangle"
          start={0}
          duration={3}
          width={120}
          height={120}
          cornerRadius={14}
          fill={ACCENT}
          box={{ x: 320, y: 180, origin: "center" }}
          transform={{
            scale: [
              { at: 0.3, value: 0.01, easing: "easeOutBack" },
              { at: 0.9, value: 1 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
```
## Squash and stretch (`squash-stretch`)

A shape stretches while it moves fast and flattens when it hits, keeping its volume. That the thing is soft and has weight, and how hard it hit.

Use it when: A ball, a drop or anything that bounces. A small bounce that feels stiff.

- stretch: `{ x: 0.86, y: 1.16 }`, just before impact
- squash: `{ x: 1.35, y: 0.68 }`, on impact, about 0.1 s
- anchor: `{ x: 0.5, y: 1 }`, scales from the ball's bottom, on the floor

Ask: Drop the ball with keys on box.y (easeInQuad down, easeOutQuad up), and key its scale per axis: stretch as it falls, squash on impact, from an anchor at its bottom.

```tsx
import { Composition, Shape, Track } from "@uberscene/kit";

// Squash and stretch: a ball that stretches as it falls and squashes on impact, so it reads as soft and heavy.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="shapes" layout="free">
        <Shape
          id="floor"
          type="rectangle"
          start={0}
          duration={3}
          width={360}
          height={4}
          fill={INK}
          box={{ x: 320, y: 302, origin: "center" }}
        />
        <Shape
          id="ball"
          type="circle"
          start={0}
          duration={3}
          width={70}
          height={70}
          fill={ACCENT}
          box={{
            x: 320,
            origin: "bottom",
            y: [
              { at: 0.3, value: 110, easing: "easeInQuad" },
              { at: 0.8, value: 300 },
              { at: 0.95, value: 300, easing: "easeOutQuad" },
              { at: 1.45, value: 160, easing: "easeInQuad" },
              { at: 1.95, value: 300 },
            ],
          }}
          transform={{
            anchor: { x: 0.5, y: 1 },
            scale: [
              { at: 0.3, value: { x: 1, y: 1 } },
              { at: 0.74, value: { x: 0.86, y: 1.16 } },
              { at: 0.82, value: { x: 1.35, y: 0.68 } },
              { at: 0.97, value: { x: 1, y: 1 } },
              { at: 1.9, value: { x: 0.92, y: 1.08 } },
              { at: 1.99, value: { x: 1.2, y: 0.82 } },
              { at: 2.12, value: { x: 1, y: 1 } },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
```
## Follow-through (`follow-through`)

Parts of a thing keep going after the lead stops, and arrive a little later. That the pieces are loose and attached, not one rigid block.

Use it when: A group that moves together: dots, a tail, a row of tags. A stop that looks too abrupt.

- lead: `easeOutQuart, 0.8 s`, the first part
- followers: `easeOutBack, +0.18 s each`, arrive later and settle past their place

Ask: Move the three dots right together; end each follower 0.18 s after the one before, with easeOutBack.

```tsx
import { Composition, Shape, Track } from "@uberscene/kit";

// Follow-through: the lead arrives first and the parts behind it settle a beat later, as if dragged.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="shapes" layout="free">
        <Shape
          id="part1"
          type="circle"
          start={0}
          duration={3}
          width={70}
          height={70}
          fill={ACCENT}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0.4, value: 140, easing: "easeOutQuart" },
              { at: 1.2, value: 500 },
            ],
          }}
        />
        <Shape
          id="part2"
          type="circle"
          start={0}
          duration={3}
          width={48}
          height={48}
          fill={INK}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0.4, value: 84, easing: "easeOutBack" },
              { at: 1.38, value: 444 },
            ],
          }}
        />
        <Shape
          id="part3"
          type="circle"
          start={0}
          duration={3}
          width={30}
          height={30}
          fill={INK}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0.4, value: 28, easing: "easeOutBack" },
              { at: 1.56, value: 388 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
```
## Stagger (`stagger`)

The same entrance on several things, each starting a beat after the one before. Order: the eye reads the items one by one instead of all at once.

Use it when: A list, a grid of cards, a row of logos. Several things would otherwise appear in one block.

- step: `0.08 s`, between one card's start and the next
- entrance: `rise 60 px and fade in, 0.6 s`, the same for every card, easeOutQuart

Ask: Bring the five cards in one after another, 0.08 s apart, each rising 60 px with easeOutQuart.

```tsx
import { Composition, Shape, Track } from "@uberscene/kit";

// Stagger: the same entrance, started one after another, so a group arrives as a wave.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="shapes" layout="free">
        <Shape
          id="card1"
          type="rectangle"
          start={0}
          duration={3}
          width={60}
          height={60}
          cornerRadius={8}
          fill={INK}
          box={{
            x: 160,
            origin: "center",
            y: [
              { at: 0.3, value: 240, easing: "easeOutQuart" },
              { at: 0.9, value: 180 },
            ],
          }}
          transform={{
            opacity: [
              { at: 0.3, value: 0 },
              { at: 0.6, value: 1 },
            ],
          }}
        />
        <Shape
          id="card2"
          type="rectangle"
          start={0}
          duration={3}
          width={60}
          height={60}
          cornerRadius={8}
          fill={INK}
          box={{
            x: 240,
            origin: "center",
            y: [
              { at: 0.38, value: 240, easing: "easeOutQuart" },
              { at: 0.98, value: 180 },
            ],
          }}
          transform={{
            opacity: [
              { at: 0.38, value: 0 },
              { at: 0.68, value: 1 },
            ],
          }}
        />
        <Shape
          id="card3"
          type="rectangle"
          start={0}
          duration={3}
          width={60}
          height={60}
          cornerRadius={8}
          fill={ACCENT}
          box={{
            x: 320,
            origin: "center",
            y: [
              { at: 0.46, value: 240, easing: "easeOutQuart" },
              { at: 1.06, value: 180 },
            ],
          }}
          transform={{
            opacity: [
              { at: 0.46, value: 0 },
              { at: 0.76, value: 1 },
            ],
          }}
        />
        <Shape
          id="card4"
          type="rectangle"
          start={0}
          duration={3}
          width={60}
          height={60}
          cornerRadius={8}
          fill={INK}
          box={{
            x: 400,
            origin: "center",
            y: [
              { at: 0.54, value: 240, easing: "easeOutQuart" },
              { at: 1.14, value: 180 },
            ],
          }}
          transform={{
            opacity: [
              { at: 0.54, value: 0 },
              { at: 0.84, value: 1 },
            ],
          }}
        />
        <Shape
          id="card5"
          type="rectangle"
          start={0}
          duration={3}
          width={60}
          height={60}
          cornerRadius={8}
          fill={INK}
          box={{
            x: 480,
            origin: "center",
            y: [
              { at: 0.62, value: 240, easing: "easeOutQuart" },
              { at: 1.22, value: 180 },
            ],
          }}
          transform={{
            opacity: [
              { at: 0.62, value: 0 },
              { at: 0.92, value: 1 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
```
## Pause before the payoff (`pause-before-payoff`)

The action happens, the frame holds still for half a second, then the result lands. A dramatic comma: the viewer has a moment to expect the result, so it lands harder.

Use it when: A tap, a click or a reveal whose result is the point of the scene. Going straight from action to result feels rushed.

- pause: `0.5 s`, between the press (1.0 s) and the result (1.6 s); 0.3 to 0.75 s works
- result: `easeOutBack`, the payoff overshoots a little

Ask: After the pointer presses the button, hold for 0.5 s, then pop the star in with easeOutBack.

```tsx
import { Composition, Shape, Track } from "@uberscene/kit";

// The pause before the payoff: action, a half-second of stillness, then the result lands.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";
const MUTED = "#c9c2b6";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="shapes" layout="free">
        <Shape
          id="button"
          type="rectangle"
          start={0}
          duration={3}
          width={140}
          height={52}
          cornerRadius={26}
          fill={INK}
          box={{ x: 220, y: 180, origin: "center" }}
          transform={{
            scale: [
              { at: 0.95, value: 1, easing: "easeOutQuad" },
              { at: 1.02, value: 0.9, easing: "easeOutQuad" },
              { at: 1.15, value: 1 },
            ],
          }}
        />
        <Shape
          id="pointer"
          type="circle"
          start={0}
          duration={3}
          width={26}
          height={26}
          fill={MUTED}
          box={{
            x: [
              { at: 0.2, value: 80, easing: "easeInOutCubic" },
              { at: 0.95, value: 225 },
            ],
            y: [
              { at: 0.2, value: 300, easing: "easeInOutCubic" },
              { at: 0.95, value: 186 },
            ],
          }}
        />
        <Shape
          id="result"
          type="star"
          start={0}
          duration={3}
          width={120}
          height={120}
          fill={ACCENT}
          box={{ x: 450, y: 180, origin: "center" }}
          transform={{
            scale: [
              { at: 1.6, value: 0.01, easing: "easeOutBack" },
              { at: 2.1, value: 1 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
```

# Type

## Word by word (`word-rise-fade`)

A line that comes in one word at a time, each rising a little as it fades in. Pace: the line is read at the speed it is said.

Use it when: A headline or a quote with time to land. Captions that follow speech.

- animation: `{ type: "wordByWord", in: 1.2, stagger: 0.14 }`, on the `<Title>`

Ask: Bring the line in word by word: animation={{ type: "wordByWord", in: 1.2, stagger: 0.14 }}.

```tsx
import { Composition, Title, Track } from "@uberscene/kit";

// Word by word: a line that arrives one word at a time, paced for reading.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="text" layout="free">
        <Title
          id="line"
          start={0}
          duration={3}
          style={{ size: 44, weight: 800, color: INK }}
          box={{ x: 320, y: 180, origin: "center" }}
          animation={{ type: "wordByWord", in: 1.2, stagger: 0.14 }}
        >
          Every frame on the clock
        </Title>
      </Track>
    </Composition>
  );
}
```
## Typewriter (`typewriter`)

Text that appears one letter at a time, as if typed. Someone writing it now: a prompt, a search, a message.

Use it when: Showing a prompt or a search being entered. A line that should feel live.

- animation: `{ type: "typewriter", in: 1.6 }`, letters appear one by one

Ask: Type the prompt out letter by letter with animation={{ type: "typewriter", in: 1.6 }}.

```tsx
import { Composition, Title, Track } from "@uberscene/kit";

// Typewriter: letters appear one by one, for code, a prompt or a search.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="text" layout="free">
        <Title
          id="prompt"
          start={0}
          duration={3}
          style={{ size: 40, weight: 800, color: INK }}
          box={{ x: 320, y: 180, origin: "center" }}
          animation={{ type: "typewriter", in: 1.6 }}
        >
          make the cup green
        </Title>
      </Track>
    </Composition>
  );
}
```
## Hits on the beat (`kinetic-beats`)

A word that punches up on each hit of the music and settles back between them. Rhythm: the type and the sound feel like one thing.

Use it when: A word or a title over music with clear hits. Promos and openers cut to a track.

- punch: `1.35 for 0.05 s`, on each beat, then back to 1 with easeOutQuart
- beats: `0.5, 1.3 and 2.1 s`, anchor them to the music's hits

Ask: Punch the word to 1.35 scale on each beat and settle it back with easeOutQuart.

```tsx
import { Composition, Title, Track } from "@uberscene/kit";

// Scale punch: a word that jumps on each beat and settles, to land a rhythm.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="text" layout="free">
        <Title
          id="beat"
          start={0}
          duration={3}
          style={{ size: 96, weight: 800, color: ACCENT }}
          box={{ x: 320, y: 180, origin: "center" }}
          transform={{
            scale: [
              { at: 0.45, value: 1 },
              { at: 0.5, value: 1.35, easing: "easeOutQuart" },
              { at: 0.8, value: 1 },
              { at: 1.25, value: 1 },
              { at: 1.3, value: 1.35, easing: "easeOutQuart" },
              { at: 1.6, value: 1 },
              { at: 2.05, value: 1 },
              { at: 2.1, value: 1.35, easing: "easeOutQuart" },
              { at: 2.4, value: 1 },
            ],
          }}
        >
          NOW
        </Title>
      </Track>
    </Composition>
  );
}
```
## Count up (`count-up`)

A number that runs up from zero to its value and holds. Size and growth: the viewer feels the number get big.

Use it when: A statistic, a total or a milestone. A number that would otherwise sit flat on screen.

- to: `12400`, the value it counts to and holds
- suffix, label: `"+", "cups poured"`, what sits beside and under it

Ask: Show a Counter that counts to 12400 with suffix "+" and label "cups poured".

```tsx
import { Composition, Counter, Track } from "@uberscene/kit";

// A counter: a number that counts up to its value and holds, for a result.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="text" layout="free">
        <Counter id="cups" start={0.2} duration={2.8} to={12400} suffix="+" label="cups poured" size={110} />
      </Track>
    </Composition>
  );
}
```

# Camera

## Push in (`push-in`)

The shot grows slowly, as if the camera moves toward the subject. Focus and tension: this matters, look closer.

Use it when: A held shot that needs some life. Leading into a key line or a detail.

- scale: `1 to 1.2 over 3 s`, keys on the clip's `transform.scale`, easeInOutSine

Ask: Push in slowly on the shot: scale it from 1 to 1.2 across the clip with easeInOutSine.

```tsx
import { Clip, Composition } from "@uberscene/kit";

// A push-in: the frame closes slowly on the subject, for focus or tension.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip
        id="shot"
        src="asset:redCup"
        in={18}
        out={21}
        fit="cover"
        transform={{
          scale: [
            { at: 0, value: 1, easing: "easeInOutSine" },
            { at: 3, value: 1.2 },
          ],
        }}
      />
    </Composition>
  );
}
```
## Pan (`pan`)

The frame travels across a picture larger than itself. Space: there is more here than one frame shows.

Use it when: A wide image, a landscape or a long screenshot. Revealing something at one side of the shot.

- box: `960 × 540`, larger than the frame, so there is picture to travel over
- box.x: `0 to -320 over 3 s`, easeInOutSine

Ask: Give the clip a box larger than the frame and pan across it with keys on box.x.

```tsx
import { Clip, Composition } from "@uberscene/kit";

// A pan: the frame travels across a wider picture, to show more than fits.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip
        id="shot"
        src="asset:redCup"
        in={18}
        out={21}
        fit="cover"
        box={{
          width: 960,
          height: 540,
          y: -90,
          x: [
            { at: 0, value: 0, easing: "easeInOutSine" },
            { at: 3, value: -320 },
          ],
        }}
      />
    </Composition>
  );
}
```
## Parallax (`parallax`)

Layers move the same way at different speeds: near ones fast, far ones slow. Depth in a flat picture.

Use it when: Graphics or cut-out layers that look flat. An opener or a title over layered art.

- distances: `60, 160 and 320 px`, far, middle and near layers, over the same 3 s

Ask: Move three rows of shapes the same way over 3 s: the far row 60 px, the middle 160, the near 320.

```tsx
import { Composition, Shape, Track } from "@uberscene/kit";

// Parallax: near things move further than far things, so a flat frame reads as deep.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";
const MUTED = "#c9c2b6";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="layers" layout="free">
        <Shape
          id="far1"
          type="circle"
          start={0}
          duration={3}
          width={30}
          height={30}
          fill={MUTED}
          box={{
            y: 110,
            origin: "center",
            x: [
              { at: 0, value: 120, easing: "easeInOutSine" },
              { at: 3, value: 60 },
            ],
          }}
        />
        <Shape
          id="far2"
          type="circle"
          start={0}
          duration={3}
          width={30}
          height={30}
          fill={MUTED}
          box={{
            y: 110,
            origin: "center",
            x: [
              { at: 0, value: 320, easing: "easeInOutSine" },
              { at: 3, value: 260 },
            ],
          }}
        />
        <Shape
          id="far3"
          type="circle"
          start={0}
          duration={3}
          width={30}
          height={30}
          fill={MUTED}
          box={{
            y: 110,
            origin: "center",
            x: [
              { at: 0, value: 520, easing: "easeInOutSine" },
              { at: 3, value: 460 },
            ],
          }}
        />
        <Shape
          id="mid1"
          type="circle"
          start={0}
          duration={3}
          width={48}
          height={48}
          fill={INK}
          box={{
            y: 190,
            origin: "center",
            x: [
              { at: 0, value: 120, easing: "easeInOutSine" },
              { at: 3, value: -40 },
            ],
          }}
        />
        <Shape
          id="mid2"
          type="circle"
          start={0}
          duration={3}
          width={48}
          height={48}
          fill={INK}
          box={{
            y: 190,
            origin: "center",
            x: [
              { at: 0, value: 320, easing: "easeInOutSine" },
              { at: 3, value: 160 },
            ],
          }}
        />
        <Shape
          id="mid3"
          type="circle"
          start={0}
          duration={3}
          width={48}
          height={48}
          fill={INK}
          box={{
            y: 190,
            origin: "center",
            x: [
              { at: 0, value: 520, easing: "easeInOutSine" },
              { at: 3, value: 360 },
            ],
          }}
        />
        <Shape
          id="near1"
          type="circle"
          start={0}
          duration={3}
          width={72}
          height={72}
          fill={ACCENT}
          box={{
            y: 280,
            origin: "center",
            x: [
              { at: 0, value: 120, easing: "easeInOutSine" },
              { at: 3, value: -200 },
            ],
          }}
        />
        <Shape
          id="near2"
          type="circle"
          start={0}
          duration={3}
          width={72}
          height={72}
          fill={ACCENT}
          box={{
            y: 280,
            origin: "center",
            x: [
              { at: 0, value: 320, easing: "easeInOutSine" },
              { at: 3, value: 0 },
            ],
          }}
        />
        <Shape
          id="near3"
          type="circle"
          start={0}
          duration={3}
          width={72}
          height={72}
          fill={ACCENT}
          box={{
            y: 280,
            origin: "center",
            x: [
              { at: 0, value: 520, easing: "easeInOutSine" },
              { at: 3, value: 200 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
```
## Rack focus (`rack-focus`)

The sharp part of the picture moves from one thing to another while the first goes soft. Where to look now: attention passes from one subject to the next.

Use it when: Bringing a title or a card in front of footage. Two subjects at different depths.

- background blur: `0 to 8 px`, the clip's `blur` effect, keyed
- card blur: `10 to 0 px`, over the same 0.7 s, easeInOutSine

Ask: Move focus from the shot to the card: key the clip's blur from 0 to 8 while the card's goes from 10 to 0.

```tsx
import { Clip, Composition, Shape, Track } from "@uberscene/kit";

// A rack focus: sharpness moves from the background to a card in front, to move attention without a cut.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip
        id="shot"
        src="asset:redCup"
        in={18}
        out={21}
        fit="cover"
        effects={[
          {
            type: "blur",
            radius: [
              { at: 0.9, value: 0, easing: "easeInOutSine" },
              { at: 1.6, value: 8 },
            ],
          },
        ]}
      />
      <Track id="front" layout="free">
        <Shape
          id="card"
          type="rectangle"
          start={0}
          duration={3}
          width={220}
          height={120}
          cornerRadius={14}
          fill={PAPER}
          box={{ x: 320, y: 180, origin: "center" }}
          effects={[
            {
              type: "blur",
              radius: [
                { at: 0.9, value: 10, easing: "easeInOutSine" },
                { at: 1.6, value: 0 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
```
## Picture in picture (`picture-in-picture`)

A small shot pops into a corner over the main one. Two views at once: a detail or a reaction alongside the main action.

Use it when: A reaction, a screen or a close-up that belongs with the main shot. A talking head over a demo.

- box: `200 × 112, bottom right`, with 12 px rounded corners
- scale: `0 to 1, easeOutBack`, the pop in

Ask: Pop a 200 × 112 inset into the bottom right corner with rounded corners and an easeOutBack scale.

```tsx
import { Clip, Composition, Track } from "@uberscene/kit";

// Picture in picture: a small shot pops into a corner over the main one, for a reaction or a detail.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip id="wide" src="asset:redCup" in={18} out={21} fit="cover" />
      <Track id="inset" layout="free">
        <Clip
          id="detail"
          src="asset:redCup"
          start={0}
          in={32}
          out={35}
          fit="cover"
          box={{ x: 600, y: 330, width: 200, height: 112, origin: "bottomRight" }}
          transform={{
            borderRadius: 12,
            scale: [
              { at: 0.5, value: 0.01, easing: "easeOutBack" },
              { at: 1, value: 1 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
```

# Cuts

## Whip pan (`whip-pan`)

A fast sideways move that blurs one shot into the next. Energy and speed: we jump to the next place without losing momentum.

Use it when: Fast cuts between places or products. A cut that needs to feel quick, not soft.

- transition: `"push", 0.3 s`, short, so it reads as a whip
- direction: `"left"`, the film's main direction

Ask: Join the two shots with a 0.3 s push transition, direction "left".

```tsx
import { Clip, Composition, Transition } from "@uberscene/kit";

// A whip pan: one shot is pushed out fast by the next, sideways, as a quick change of place.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip id="a" src="asset:redCup" in={18} out={19.6} fit="cover" />
      <Transition id="whip" type="push" duration={0.3} params={{ direction: "left" }} />
      <Clip id="b" src="asset:redCup" in={32} out={33.7} fit="cover" />
    </Composition>
  );
}
```
## Matched push (`matched-push`)

Both shots grow through a hard cut, so the camera seems to keep pushing forward. One continuous move across two shots: going deeper into the same thought.

Use it when: Cutting between two shots of one idea. A transition would slow the piece down.

- outgoing: `1 to 1.25 over the last 0.4 s`, easeInQuart: speeding up into the cut
- incoming: `0.85 to 1 over the first 0.4 s`, easeOutQuart: still moving after it

Ask: Cut from the first shot to the second while both grow: key the first's scale up with easeInQuart into the cut, and the second's from 0.85 with easeOutQuart.

```tsx
import { Clip, Composition } from "@uberscene/kit";

// A matched push across a cut: both shots grow through the cut, so the camera seems to keep moving.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip
        id="a"
        src="asset:redCup"
        in={18}
        out={19.5}
        fit="cover"
        transform={{
          scale: [
            { at: 1.1, value: 1, easing: "easeInQuart" },
            { at: 1.5, value: 1.25 },
          ],
        }}
      />
      <Clip
        id="b"
        src="asset:redCup"
        in={30}
        out={31.5}
        fit="cover"
        transform={{
          scale: [
            { at: 0, value: 0.85, easing: "easeOutQuart" },
            { at: 0.4, value: 1 },
          ],
        }}
      />
    </Composition>
  );
}
```
## Match on action (`match-on-action`)

The cut lands mid-move, and the next shot picks up the same move in the same direction. Continuity: two shots read as one action.

Use it when: Cutting between scenes that both move. A cut that should be felt, not seen.

- leaving: `320 to 40 px, easeInQuart`, fast at the cut
- arriving: `600 to 320 px, easeOutQuart`, already moving the same way

Ask: Cut while the subject moves left: it speeds out of the first scene, and the next scene's subject arrives moving left.

```tsx
import { Composition, Shape, Track } from "@uberscene/kit";

// A cut on motion: the subject leaves fast one way and the next one arrives already moving the same way.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="main">
        <Shape
          id="leaving"
          type="circle"
          duration={1.5}
          width={90}
          height={90}
          fill={INK}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0.6, value: 320, easing: "easeInQuart" },
              { at: 1.5, value: 40 },
            ],
          }}
        />
        <Shape
          id="arriving"
          type="rectangle"
          duration={1.5}
          width={90}
          height={90}
          cornerRadius={12}
          fill={ACCENT}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0, value: 600, easing: "easeOutQuart" },
              { at: 0.6, value: 320 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
```
## Iris (`iris-mask`)

The next shot opens out of a growing circle. A new chapter, or a playful jump to the next scene.

Use it when: Chapter breaks and openers. A light, cartoon-like tone.

- transition: `"iris", 0.8 s`, the next shot opens from a circle

Ask: Open the second shot from a circle with an 0.8 s iris transition.

```tsx
import { Clip, Composition, Transition } from "@uberscene/kit";

// An iris: the next shot opens from a circle, for a chapter or a reveal.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip id="a" src="asset:redCup" in={18} out={19.8} fit="cover" />
      <Transition id="open" type="iris" duration={0.8} />
      <Clip id="b" src="asset:redCup" in={32} out={33.8} fit="cover" />
    </Composition>
  );
}
```
## Match cut (`match-cut`)

A shape at the end of one scene becomes the same shape, same size and place, in the next. A link between two ideas: this is like that.

Use it when: Two scenes with a shared form: a circle, a line, a logo. Joining ideas without a transition.

- shape: `same size, same place`, the first scene's circle becomes the next one's

Ask: End the first scene on a circle and start the next on a circle of the same size in the same place.

```tsx
import { Composition, Shape, Track } from "@uberscene/kit";

// A match cut: the next scene starts with the same shape in the same place, so the change reads as one move.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Track id="main">
        <Shape
          id="before"
          type="circle"
          duration={1.5}
          width={120}
          height={120}
          fill={ACCENT}
          box={{ x: 320, y: 180, origin: "center" }}
          transform={{
            scale: [
              { at: 0, value: 0.6, easing: "easeOutCubic" },
              { at: 1.5, value: 1 },
            ],
          }}
        />
        <Shape
          id="after"
          type="circle"
          duration={1.5}
          width={120}
          height={120}
          fill={INK}
          box={{ x: 320, y: 180, origin: "center" }}
          transform={{
            scale: [
              { at: 0, value: 1, easing: "easeOutCubic" },
              { at: 1.5, value: 1.4 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
```
## Dip to black (`dip-to-color`)

The picture fades to black, then the next shot fades up from it. Time passing, or the end of one part.

Use it when: A jump in time or place. Closing a section before the next.

- transition: `"dipToBlack", 0.8 s`, or dipToWhite

Ask: Join the shots with an 0.8 s dipToBlack transition, for time passing.

```tsx
import { Clip, Composition, Transition } from "@uberscene/kit";

// A dip to black: the picture goes dark and comes back on the next shot, for time passing.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip id="a" src="asset:redCup" in={18} out={19.8} fit="cover" />
      <Transition id="night" type="dipToBlack" duration={0.8} />
      <Clip id="b" src="asset:redCup" in={32} out={33.8} fit="cover" />
    </Composition>
  );
}
```

# Footage

## Recolour reveal (`recolor-reveal`)

One colour of the picture turns into another while you watch. A before and after in one shot: this is what changed.

Use it when: Showing a change of colour, brand or product option. A before and after on the same footage.

- from, to: `"#c3292a", "#2f9e4f"`, the `recolor` effect
- amount: `0 to 1 over 0.6 s`, keys, easeInOutCubic

Ask: Turn the red cup green with a recolor effect whose amount keys from 0 to 1.

```tsx
import { Clip, Composition } from "@uberscene/kit";

// A recolour reveal: one colour turns into another while you watch, for a before and after.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip
        id="shot"
        src="asset:redCup"
        in={18}
        out={21}
        fit="cover"
        effects={[
          {
            type: "recolor",
            from: "#c3292a",
            to: "#2f9e4f",
            amount: [
              { at: 1, value: 0, easing: "easeInOutCubic" },
              { at: 1.6, value: 1 },
            ],
          },
        ]}
      />
    </Composition>
  );
}
```
## Speed ramp (`speed-ramp`)

The shot slows down around its key moment and speeds back up. The moment that matters, stretched so it can be seen.

Use it when: A pour, a jump, a splash: one instant worth watching. Action footage that passes too fast.

- speed: `1, 0.3, 0.3, 1`, keys at 0, 0.7, 1.5 and 2.1 s, easeInOutQuad

Ask: Slow the shot to 0.3 speed around its key moment and back to 1 with keys on speed.

```tsx
import { Clip, Composition } from "@uberscene/kit";

// A speed ramp: the shot slows into a moment and speeds out of it, to dwell without a freeze.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip
        id="shot"
        src="asset:redCup"
        in={18}
        out={20.4}
        fit="cover"
        speed={[
          { at: 0, value: 1, easing: "easeInOutQuad" },
          { at: 0.7, value: 0.3 },
          { at: 1.5, value: 0.3, easing: "easeInOutQuad" },
          { at: 2.1, value: 1 },
        ]}
      />
    </Composition>
  );
}
```
## Freeze with a label (`freeze-frame-dressing`)

The picture holds on one frame while a label names what is in it. Stop and look: this is the thing.

Use it when: Introducing a person or a product in action. Pointing at one detail of a moving shot.

- freezes: `{ start: 0.9, duration: 1.2, source: 18.9 }`, one held frame
- label: `<Title>`, for the hold: starts and ends with the freeze

Ask: Hold one frame for 1.2 s with freezes, and show a label for exactly that time.

```tsx
import { Clip, Composition, Title, Track } from "@uberscene/kit";

// A freeze: one frame holds while a note points at it, then the shot plays on.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip
        id="shot"
        src="asset:redCup"
        in={18}
        out={20}
        fit="cover"
        freezes={[{ start: 0.9, duration: 1.2, source: 18.9 }]}
      />
      <Track id="text" layout="free">
        <Title
          id="note"
          start={0.9}
          duration={1.2}
          style={{ size: 36, weight: 800, color: PAPER, background: ACCENT }}
          box={{ x: 320, y: 300, width: 130, height: 56, origin: "center" }}
          enter={{ type: "fade", duration: 0.2 }}
          exit={{ type: "fade", duration: 0.2 }}
        >
          Hold
        </Title>
      </Track>
    </Composition>
  );
}
```
## Before and after split (`split-compare`)

Two versions of a shot side by side, with a divider that slides between them. The difference, shown directly rather than described.

Use it when: A grade, a fix or a filter. Any edit whose result is best seen against the original.

- after: `the same clip, recoloured`, on a track above the before
- crop.width: `0.15, 0.85, 0.5`, keys; a divider shape's box.x follows the same keys

Ask: Lay the after version over the before, crop it from the left with keys on crop.width, and move a divider with it.

```tsx
import { Clip, Composition, Shape, Track } from "@uberscene/kit";

// A split compare: one shot before and after, with a divider that sweeps across to show both.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip id="before" src="asset:redCup" in={18} out={21} fit="cover" />
      <Track id="after" layout="free">
        <Clip
          id="green"
          src="asset:redCup"
          start={0}
          in={18}
          out={21}
          fit="cover"
          effects={[{ type: "recolor", from: "#c3292a", to: "#2f9e4f" }]}
          transform={{
            crop: {
              width: [
                { at: 0.3, value: 0.15, easing: "easeInOutSine" },
                { at: 1.6, value: 0.85, easing: "easeInOutSine" },
                { at: 2.8, value: 0.5 },
              ],
            },
          }}
        />
        <Shape
          id="divider"
          type="rectangle"
          start={0}
          duration={3}
          width={4}
          height={360}
          fill={PAPER}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0.3, value: 96, easing: "easeInOutSine" },
              { at: 1.6, value: 544, easing: "easeInOutSine" },
              { at: 2.8, value: 320 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
```
## Wipe reveal (`clip-reveal`)

The shot is uncovered from one edge to the other. Arrival: here it is, revealed in one sweep.

Use it when: Bringing in a shot or a product image. A cleaner entrance than a fade.

- crop.width: `0 to 1 over 1 s`, keys, easeInOutQuart: opens from the left

Ask: Reveal the shot from the left with keys on its crop.width from 0 to 1.

```tsx
import { Clip, Composition } from "@uberscene/kit";

// A crop reveal: the shot opens from a sliver to the full frame, as a clean wipe without a transition.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip
        id="shot"
        src="asset:redCup"
        in={18}
        out={21}
        fit="cover"
        transform={{
          crop: {
            width: [
              { at: 0.3, value: 0, easing: "easeInOutQuart" },
              { at: 1.3, value: 1 },
            ],
          },
        }}
      />
    </Composition>
  );
}
```

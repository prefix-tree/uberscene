# Motion catalog

Techniques of motion, each a short, complete file in one look, to copy and adapt: pick one by name when a scene needs it. 27 techniques, grouped by family; most are adapted from awesome-ai-motion (MIT), https://github.com/gongnyang/awesome-ai-motion. Read [motion.md](motion.md) first for how scenes hand over at a cut. Generated from the code by `scripts/gen-docs.ts`; do not edit.

# Principles

## Easing (`easing-curves`)

Easing changes velocity over the course of an animation while keeping its distance and duration constant. Adds weight to starts and stops; ease-out responds quickly and then settles smoothly.

Use it when: Compare the perceived speed of otherwise identical movements. Make UI motion respond quickly and stop smoothly.

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

A brief movement in the opposite direction prepares the viewer for the main action. Signals the direction of travel and a buildup of force, making sudden motion easier to follow.

Use it when: Signal the launch direction of a character or icon. Prepare the viewer's attention before a large movement.

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
## Spring & Overshoot (`spring-overshoot`)

An object briefly exceeds its target scale before returning and settling. Shows inertia and restoring force as the object settles.

Use it when: Reveal a small object or settle it into a selected state. Explain overshoot and recovery with a graph.

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
## Squash & Stretch (`squash-stretch`)

An object stretches as it gains speed and squashes on impact while keeping the product of its axis scales constant. Conveys elasticity, weight, and the force of impact.

Use it when: Show the impact of a ball or flexible character. Add elasticity to a small bounce.

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

An attached extremity continues moving through inertia after the main body stops, then settles later. Conveys flexibility and inertia, showing that force remains after the main body stops.

Use it when: Show inertia in a flag or tail attached to a body. Add weight and flexibility to an abrupt stop.

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

Multiple elements appear in sequence with a consistent delay between them. Communicates element order and their relationship as a group.

Use it when: Show the reading order of a grid or list. Spread out the entrance of multiple elements.

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
## Pause Before the Payoff (`pause-before-payoff`)

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

# Entrance & exit

## Clip Reveal (`clip-reveal`)

The visible region inside a boundary widens to reveal content from one side. Content opens along its edge and guides the reading direction.

Use it when: When a title or image opens upward like a shutter When bars or lines are revealed with a direction

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

# Emphasis

## Recolour Reveal (`recolor-reveal`)

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

# Typography

## Word Rise Fade (`word-rise-fade`)

Words rise slightly while shedding blur, settling into place one after another. A calm, orderly sentence build where reading order is visible as word order.

Use it when: When revealing a one or two line explainer caption or subtitle softly For the calm brand-tone opening line of a video

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

A sentence appears one character at a time at regular intervals while a cursor follows the insertion point. Communicates the process of writing and sequential text input.

Use it when: Show a short input sentence being composed. Show a typing state in a conversational UI.

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
## Kinetic Beats (`kinetic-beats`)

Words hit the center at a large scale on regular beats and quickly settle. Communicates a three-step rhythm and emphasizes the final action.

Use it when: Compress a sequence into short verbs. Focus attention on the final key action.

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

# Transitions

## Whip Pan (`whip-pan`)

A rapid horizontal sweep with horizontal blur and sharp deceleration settles into the next scene. Moves attention to the next information as if the camera rapidly pans.

Use it when: Move quickly from a question to a result. Maintain speed and direction across consecutive scenes.

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
## Matched Push (`matched-push`)

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
## Match on Action (`match-on-action`)

Objects or camera before and after a cut move in the same screen direction and speed flow, so two scenes read as one action. The cut goes unnoticed and the action carries through, making the transition feel like natural flow.

Use it when: A thrown object in scene A enters scene B from the same side. Build continuity of action across different screens.

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
## Shape Mask Transition (`iris-mask`)

A circular mask expands from a point to reveal the next scene. Shows new information spreading across the screen from a shared origin.

Use it when: Transition from a question to its answer. Open a detail scene from a selected point.

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
## Match Cut (`match-cut`)

Matching shapes at the same position and size connect two scenes across a cut. Connects a sentence to data by matching its final period to a chart dot.

Use it when: Connect different scenes through objects with matching shapes. Keep the viewer's gaze in place when moving from explanation to data.

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
## Dip to Color (`dip-to-color`)

The outgoing scene fades into a flat color, then the next scene rises out of that same color. A section or chapter break: a pause before the next idea.

Use it when: Mark clearly where a chapter or section changes. Cut between two mismatched scenes through a single color field.

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
## Speed Ramp (`speed-ramp`)

Vary playback speed to slow down the peak of an action and accelerate surrounding movement. Concentrates attention on the action peak and changes rhythm.

Use it when: Spend more time on the peak of an action. Accelerate repetitive parts of a product demonstration.

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
## Freeze Frame Dressing (`freeze-frame-dressing`)

Motion freezes on the beat and paper, tape, and labels stick around the frozen subject. A marker that says this moment matters: a magazine cover or documentary intro shot.

Use it when: Introduce a person or product for the first time. Make a decisive moment memorable.

- freezes: `{ start: 0.9, duration: 1.2, source: 18.9 }`, one held frame
- label: `a `<Title>` for the hold`, starts and ends with the freeze

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

# Camera

## Push-in (`push-in`)

A camera move that slowly approaches a fixed focal point in a sentence or scene. Increases the emphasis on and attention to a key word.

Use it when: When focusing on a key word after showing the full sentence When showing an important part of a product or subject up close

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

A camera move that scans a wide scene in one direction while keeping the scale constant. Shows the sequence and flow of stages arranged across a space.

Use it when: When scanning a long process diagram in sequence When stopping on the final subject in a horizontal scene

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

A motion effect that creates depth by moving nearer layers faster and distant layers more slowly as the camera moves. Creates a sense of distance and space between flat elements.

Use it when: When showing the distance between foreground and background When moving elements at multiple depths in a scrolling scene

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
## Rack Focus (`rack-focus`)

A focus shift that swaps sharpness between foreground and background subjects without changing their positions. Shifts visual priority from the foreground subject to the background subject.

Use it when: When transferring attention between foreground and background When changing the relative emphasis of two subjects without moving the scene

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
## Picture in Picture (`picture-in-picture`)

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

# Data

## Count-up (`count-up`)

An animation in which a number increases from 0 to its target value while decelerating. Communicates numerical accumulation and the final magnitude.

Use it when: When showing numerical accumulation and the final magnitude When counting tokens from 0 to 939 and then revealing the token unit

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

# Explainer

## Split Compare (`split-compare`)

An animation that overlays before and after states of the same subject and compares them with a moving vertical divider. Reveals changes in the same subject as the divider moves.

Use it when: When comparing a subject before and after processing When directly comparing the locations where changes occur

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

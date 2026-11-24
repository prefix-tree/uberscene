// The motion catalog: techniques of motion, each a card with a short UberScene file that shows it (motion/<slug>.tsx).
// Most are adapted from awesome-ai-motion (MIT), whose card text is in vendor/awesome-ai-motion/cards.json: the
// name, what it is, what it conveys and when to use it come from there, and the file, its params and the prompt are
// UberScene's. A card with `own` is one of UberScene's, from the skill's motion doctrine, with its text here.
// `pnpm docs:gen` turns these into the site's Motion pages and the skill's references/motion-catalog.md.

/** One value the technique turns on, as the file writes it. */
export interface MotionParam {
  readonly name: string;
  readonly value: string;
  readonly note: string;
}

/** The text of a card that is UberScene's own rather than the library's. */
interface OwnCard {
  readonly name: string;
  /** One of the library's families (`vendor/awesome-ai-motion/cards.json`). */
  readonly family: string;
  readonly what: string;
  readonly conveys: string;
  readonly useWhen: readonly string[];
}

export interface MotionCard {
  /** The file's name in motion/, and the library's slug when the card is adapted from it. */
  readonly slug: string;
  readonly params: readonly MotionParam[];
  /** What to ask an agent for, in a sentence it can act on. */
  readonly prompt: string;
  readonly own?: OwnCard;
}

export const MOTION_CARDS: readonly MotionCard[] = [
  {
    slug: "easing-curves",
    params: [
      { name: "easing", value: '"easeOutQuart"', note: "on the first key: fast off the mark, slow into place" },
      { name: "duration", value: "1 s", note: "between the two keys on `box.x`" },
    ],
    prompt: "Move the square across with keys on box.x and easing easeOutQuart, beside one that moves linearly.",
  },
  {
    slug: "anticipation",
    params: [
      { name: "pull back", value: "40 px over 0.4 s", note: "the opposite way first, easeOutCubic" },
      { name: "move", value: "340 px over 0.5 s", note: "then the real move, easeOutQuart" },
    ],
    prompt: "Before the square moves right, pull it 40 px left for 0.4 s, then send it right with easeOutQuart.",
  },
  {
    slug: "spring-overshoot",
    params: [
      { name: "easing", value: '"easeOutBack"', note: "passes its size and settles back" },
      { name: "scale", value: "0 to 1 over 0.6 s", note: "keys on `transform.scale`" },
    ],
    prompt: "Pop the card in with a scale key from 0 to 1 and easing easeOutBack.",
  },
  {
    slug: "squash-stretch",
    params: [
      { name: "stretch", value: "{ x: 0.86, y: 1.16 }", note: "just before impact" },
      { name: "squash", value: "{ x: 1.35, y: 0.68 }", note: "on impact, about 0.1 s" },
      { name: "anchor", value: "{ x: 0.5, y: 1 }", note: "scales from the ball's bottom, on the floor" },
    ],
    prompt:
      "Drop the ball with keys on box.y (easeInQuad down, easeOutQuad up), and key its scale per axis: stretch as it falls, squash on impact, from an anchor at its bottom.",
  },
  {
    slug: "follow-through",
    params: [
      { name: "lead", value: "easeOutQuart, 0.8 s", note: "the first part" },
      { name: "followers", value: "easeOutBack, +0.18 s each", note: "arrive later and settle past their place" },
    ],
    prompt: "Move the three dots right together; end each follower 0.18 s after the one before, with easeOutBack.",
  },
  {
    slug: "stagger",
    params: [
      { name: "step", value: "0.08 s", note: "between one card's start and the next" },
      { name: "entrance", value: "rise 60 px and fade in, 0.6 s", note: "the same for every card, easeOutQuart" },
    ],
    prompt: "Bring the five cards in one after another, 0.08 s apart, each rising 60 px with easeOutQuart.",
  },
  {
    slug: "pause-before-payoff",
    own: {
      name: "Pause Before the Payoff",
      family: "principles",
      what: "The action happens, the frame holds still for half a second, then the result lands.",
      conveys: "A dramatic comma: the viewer has a moment to expect the result, so it lands harder.",
      useWhen: [
        "A tap, a click or a reveal whose result is the point of the scene.",
        "Going straight from action to result feels rushed.",
      ],
    },
    params: [
      { name: "pause", value: "0.5 s", note: "between the press (1.0 s) and the result (1.6 s); 0.3 to 0.75 s works" },
      { name: "result", value: "easeOutBack", note: "the payoff overshoots a little" },
    ],
    prompt: "After the pointer presses the button, hold for 0.5 s, then pop the star in with easeOutBack.",
  },
  {
    slug: "word-rise-fade",
    params: [{ name: "animation", value: '{ type: "wordByWord", in: 1.2, stagger: 0.14 }', note: "on the `<Title>`" }],
    prompt: 'Bring the line in word by word: animation={{ type: "wordByWord", in: 1.2, stagger: 0.14 }}.',
  },
  {
    slug: "typewriter",
    params: [{ name: "animation", value: '{ type: "typewriter", in: 1.6 }', note: "letters appear one by one" }],
    prompt: 'Type the prompt out letter by letter with animation={{ type: "typewriter", in: 1.6 }}.',
  },
  {
    slug: "kinetic-beats",
    params: [
      { name: "punch", value: "1.35 for 0.05 s", note: "on each beat, then back to 1 with easeOutQuart" },
      { name: "beats", value: "0.5, 1.3 and 2.1 s", note: "anchor them to the music's hits" },
    ],
    prompt: "Punch the word to 1.35 scale on each beat and settle it back with easeOutQuart.",
  },
  {
    slug: "count-up",
    params: [
      { name: "to", value: "12400", note: "the value it counts to and holds" },
      { name: "suffix, label", value: '"+", "cups poured"', note: "what sits beside and under it" },
    ],
    prompt: 'Show a Counter that counts to 12400 with suffix "+" and label "cups poured".',
  },
  {
    slug: "push-in",
    params: [
      { name: "scale", value: "1 to 1.2 over 3 s", note: "keys on the clip's `transform.scale`, easeInOutSine" },
    ],
    prompt: "Push in slowly on the shot: scale it from 1 to 1.2 across the clip with easeInOutSine.",
  },
  {
    slug: "pan",
    params: [
      { name: "box", value: "960 × 540", note: "larger than the frame, so there is picture to travel over" },
      { name: "box.x", value: "0 to -320 over 3 s", note: "easeInOutSine" },
    ],
    prompt: "Give the clip a box larger than the frame and pan across it with keys on box.x.",
  },
  {
    slug: "parallax",
    params: [
      { name: "distances", value: "60, 160 and 320 px", note: "far, middle and near layers, over the same 3 s" },
    ],
    prompt: "Move three rows of shapes the same way over 3 s: the far row 60 px, the middle 160, the near 320.",
  },
  {
    slug: "whip-pan",
    params: [
      { name: "transition", value: '"push", 0.3 s', note: "short, so it reads as a whip" },
      { name: "direction", value: '"left"', note: "the film's main direction" },
    ],
    prompt: 'Join the two shots with a 0.3 s push transition, direction "left".',
  },
  {
    slug: "rack-focus",
    params: [
      { name: "background blur", value: "0 to 8 px", note: "the clip's `blur` effect, keyed" },
      { name: "card blur", value: "10 to 0 px", note: "over the same 0.7 s, easeInOutSine" },
    ],
    prompt: "Move focus from the shot to the card: key the clip's blur from 0 to 8 while the card's goes from 10 to 0.",
  },
  {
    slug: "matched-push",
    own: {
      name: "Matched Push",
      family: "transitions",
      what: "Both shots grow through a hard cut, so the camera seems to keep pushing forward.",
      conveys: "One continuous move across two shots: going deeper into the same thought.",
      useWhen: ["Cutting between two shots of one idea.", "A transition would slow the piece down."],
    },
    params: [
      { name: "outgoing", value: "1 to 1.25 over the last 0.4 s", note: "easeInQuart: speeding up into the cut" },
      { name: "incoming", value: "0.85 to 1 over the first 0.4 s", note: "easeOutQuart: still moving after it" },
    ],
    prompt:
      "Cut from the first shot to the second while both grow: key the first's scale up with easeInQuart into the cut, and the second's from 0.85 with easeOutQuart.",
  },
  {
    slug: "match-on-action",
    params: [
      { name: "leaving", value: "320 to 40 px, easeInQuart", note: "fast at the cut" },
      { name: "arriving", value: "600 to 320 px, easeOutQuart", note: "already moving the same way" },
    ],
    prompt:
      "Cut while the subject moves left: it speeds out of the first scene, and the next scene's subject arrives moving left.",
  },
  {
    slug: "iris-mask",
    params: [{ name: "transition", value: '"iris", 0.8 s', note: "the next shot opens from a circle" }],
    prompt: "Open the second shot from a circle with an 0.8 s iris transition.",
  },
  {
    slug: "match-cut",
    params: [
      { name: "shape", value: "same size, same place", note: "the first scene's circle becomes the next one's" },
    ],
    prompt: "End the first scene on a circle and start the next on a circle of the same size in the same place.",
  },
  {
    slug: "dip-to-color",
    params: [{ name: "transition", value: '"dipToBlack", 0.8 s', note: "or dipToWhite" }],
    prompt: "Join the shots with an 0.8 s dipToBlack transition, for time passing.",
  },
  {
    slug: "recolor-reveal",
    own: {
      name: "Recolour Reveal",
      family: "emphasis",
      what: "One colour of the picture turns into another while you watch.",
      conveys: "A before and after in one shot: this is what changed.",
      useWhen: ["Showing a change of colour, brand or product option.", "A before and after on the same footage."],
    },
    params: [
      { name: "from, to", value: '"#c3292a", "#2f9e4f"', note: "the `recolor` effect" },
      { name: "amount", value: "0 to 1 over 0.6 s", note: "keys, easeInOutCubic" },
    ],
    prompt: "Turn the red cup green with a recolor effect whose amount keys from 0 to 1.",
  },
  {
    slug: "speed-ramp",
    params: [{ name: "speed", value: "1, 0.3, 0.3, 1", note: "keys at 0, 0.7, 1.5 and 2.1 s, easeInOutQuad" }],
    prompt: "Slow the shot to 0.3 speed around its key moment and back to 1 with keys on speed.",
  },
  {
    slug: "freeze-frame-dressing",
    params: [
      { name: "freezes", value: "{ start: 0.9, duration: 1.2, source: 18.9 }", note: "one held frame" },
      { name: "label", value: "a `<Title>` for the hold", note: "starts and ends with the freeze" },
    ],
    prompt: "Hold one frame for 1.2 s with freezes, and show a label for exactly that time.",
  },
  {
    slug: "split-compare",
    params: [
      { name: "after", value: "the same clip, recoloured", note: "on a track above the before" },
      { name: "crop.width", value: "0.15, 0.85, 0.5", note: "keys; a divider shape's box.x follows the same keys" },
    ],
    prompt:
      "Lay the after version over the before, crop it from the left with keys on crop.width, and move a divider with it.",
  },
  {
    slug: "picture-in-picture",
    own: {
      name: "Picture in Picture",
      family: "camera",
      what: "A small shot pops into a corner over the main one.",
      conveys: "Two views at once: a detail or a reaction alongside the main action.",
      useWhen: ["A reaction, a screen or a close-up that belongs with the main shot.", "A talking head over a demo."],
    },
    params: [
      { name: "box", value: "200 × 112, bottom right", note: "with 12 px rounded corners" },
      { name: "scale", value: "0 to 1, easeOutBack", note: "the pop in" },
    ],
    prompt: "Pop a 200 × 112 inset into the bottom right corner with rounded corners and an easeOutBack scale.",
  },
  {
    slug: "clip-reveal",
    params: [{ name: "crop.width", value: "0 to 1 over 1 s", note: "keys, easeInOutQuart: opens from the left" }],
    prompt: "Reveal the shot from the left with keys on its crop.width from 0 to 1.",
  },
];

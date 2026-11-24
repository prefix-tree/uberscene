// The motion catalog: techniques of motion, each a card with a short UberScene file that shows it (motion/<slug>.tsx).
// `pnpm docs:gen` turns these into the site's Motion pages and the skill's references/motion-catalog.md.

/** The catalog's groups, in the order the pages show them. */
export const MOTION_FAMILIES = {
  principles: "Principles",
  type: "Type",
  camera: "Camera",
  cuts: "Cuts",
  footage: "Footage",
} as const;

/** One value the technique turns on, as the file writes it. */
export interface MotionParam {
  readonly name: string;
  readonly value: string;
  readonly note: string;
}

export interface MotionCard {
  /** The file's name in motion/. */
  readonly slug: string;
  readonly name: string;
  readonly family: keyof typeof MOTION_FAMILIES;
  /** What it is, in a sentence. */
  readonly what: string;
  /** What it says to the viewer. */
  readonly conveys: string;
  readonly useWhen: readonly string[];
  /** Other cards' slugs that go with it. */
  readonly pairs: readonly string[];
  readonly params: readonly MotionParam[];
  /** What to ask an agent for, in a sentence it can act on. */
  readonly prompt: string;
}

export const MOTION_CARDS: readonly MotionCard[] = [
  {
    slug: "easing-curves",
    name: "Easing",
    family: "principles",
    what: "How a move speeds up and slows down between its keys, instead of running at one speed.",
    conveys: "Weight and intent: a thing that eases into place looks placed, one at constant speed looks mechanical.",
    useWhen: ["Any move from one place to another.", "A move looks robotic and you can't say why."],
    pairs: ["anticipation", "spring-overshoot"],
    params: [
      { name: "easing", value: '"easeOutQuart"', note: "on the first key: fast off the mark, slow into place" },
      { name: "duration", value: "1 s", note: "between the two keys on `box.x`" },
    ],
    prompt: "Move the square across with keys on box.x and easing easeOutQuart, beside one that moves linearly.",
  },
  {
    slug: "anticipation",
    name: "Anticipation",
    family: "principles",
    what: "A small move the opposite way before the real one, like a hand drawn back before a throw.",
    conveys: "That something is about to happen, and how much force it takes.",
    useWhen: ["A big move that would otherwise start from nowhere.", "A jump, a throw or a launch."],
    pairs: ["easing-curves", "follow-through"],
    params: [
      { name: "pull back", value: "40 px over 0.4 s", note: "the opposite way first, easeOutCubic" },
      { name: "move", value: "340 px over 0.5 s", note: "then the real move, easeOutQuart" },
    ],
    prompt: "Before the square moves right, pull it 40 px left for 0.4 s, then send it right with easeOutQuart.",
  },
  {
    slug: "spring-overshoot",
    name: "Overshoot",
    family: "principles",
    what: "An entrance that goes a little past its place and settles back.",
    conveys: "Life and energy: the thing arrives with some spring in it.",
    useWhen: ["Popping in a card, a badge or a button.", "A result that should land with a little bounce."],
    pairs: ["stagger", "pause-before-payoff"],
    params: [
      { name: "easing", value: '"easeOutBack"', note: "passes its size and settles back" },
      { name: "scale", value: "0 to 1 over 0.6 s", note: "keys on `transform.scale`" },
    ],
    prompt: "Pop the card in with a scale key from 0 to 1 and easing easeOutBack.",
  },
  {
    slug: "spring-damping",
    name: "Spring damping",
    family: "principles",
    what: "A spring's feel is one number, its damping ratio: how much it bounces before it settles.",
    conveys: "Character: a landing that stops dead reads as precise, one that bounces reads as alive.",
    useWhen: ["Anything that lands, pops in or settles.", 'You would have written "bouncy": write the ratio instead.'],
    pairs: ["spring-overshoot", "squash-stretch"],
    params: [
      { name: "ratio 1.0", value: "damping: 20", note: "no bounce: text, UI, anything read" },
      { name: "ratio 0.8", value: "damping: 16", note: "one small bounce: cards, products, logos" },
      { name: "ratio 0.5", value: "damping: 10", note: "two bounces: characters, comedy (the kit's default)" },
    ],
    prompt:
      "Drop the ball on a spring with spring({ time, from, to, damping: 16 }) in a Layer: one small bounce, then still.",
  },
  {
    slug: "squash-stretch",
    name: "Squash and stretch",
    family: "principles",
    what: "A shape stretches while it moves fast and flattens when it hits, keeping its volume.",
    conveys: "That the thing is soft and has weight, and how hard it hit.",
    useWhen: ["A ball, a drop or anything that bounces.", "A small bounce that feels stiff."],
    pairs: ["anticipation", "spring-overshoot"],
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
    name: "Follow-through",
    family: "principles",
    what: "Parts of a thing keep going after the lead stops, and arrive a little later.",
    conveys: "That the pieces are loose and attached, not one rigid block.",
    useWhen: ["A group that moves together: dots, a tail, a row of tags.", "A stop that looks too abrupt."],
    pairs: ["stagger", "easing-curves"],
    params: [
      { name: "lead", value: "easeOutQuart, 0.8 s", note: "the first part" },
      { name: "followers", value: "easeOutBack, +0.18 s each", note: "arrive later and settle past their place" },
    ],
    prompt: "Move the three dots right together; end each follower 0.18 s after the one before, with easeOutBack.",
  },
  {
    slug: "stagger",
    name: "Stagger",
    family: "principles",
    what: "The same entrance on several things, each starting a beat after the one before.",
    conveys: "Order: the eye reads the items one by one instead of all at once.",
    useWhen: ["A list, a grid of cards, a row of logos.", "Several things would otherwise appear in one block."],
    pairs: ["spring-overshoot", "follow-through"],
    params: [
      { name: "step", value: "0.08 s", note: "between one card's start and the next" },
      { name: "entrance", value: "rise 60 px and fade in, 0.6 s", note: "the same for every card, easeOutQuart" },
    ],
    prompt: "Bring the five cards in one after another, 0.08 s apart, each rising 60 px with easeOutQuart.",
  },
  {
    slug: "pause-before-payoff",
    name: "Pause before the payoff",
    family: "principles",
    what: "The action happens, the frame holds still for half a second, then the result lands.",
    conveys: "A dramatic comma: the viewer has a moment to expect the result, so it lands harder.",
    useWhen: [
      "A tap, a click or a reveal whose result is the point of the scene.",
      "Going straight from action to result feels rushed.",
    ],
    pairs: ["spring-overshoot"],
    params: [
      { name: "pause", value: "0.5 s", note: "between the press (1.0 s) and the result (1.6 s); 0.3 to 0.75 s works" },
      { name: "result", value: "easeOutBack", note: "the payoff overshoots a little" },
    ],
    prompt: "After the pointer presses the button, hold for 0.5 s, then pop the star in with easeOutBack.",
  },
  {
    slug: "word-rise-fade",
    name: "Word by word",
    family: "type",
    what: "A line that comes in one word at a time, each rising a little as it fades in.",
    conveys: "Pace: the line is read at the speed it is said.",
    useWhen: ["A headline or a quote with time to land.", "Captions that follow speech."],
    pairs: ["typewriter", "kinetic-beats"],
    params: [{ name: "animation", value: '{ type: "wordByWord", in: 1.2, stagger: 0.14 }', note: "on the `<Title>`" }],
    prompt: 'Bring the line in word by word: animation={{ type: "wordByWord", in: 1.2, stagger: 0.14 }}.',
  },
  {
    slug: "typewriter",
    name: "Typewriter",
    family: "type",
    what: "Text that appears one letter at a time, as if typed.",
    conveys: "Someone writing it now: a prompt, a search, a message.",
    useWhen: ["Showing a prompt or a search being entered.", "A line that should feel live."],
    pairs: ["word-rise-fade"],
    params: [{ name: "animation", value: '{ type: "typewriter", in: 1.6 }', note: "letters appear one by one" }],
    prompt: 'Type the prompt out letter by letter with animation={{ type: "typewriter", in: 1.6 }}.',
  },
  {
    slug: "kinetic-beats",
    name: "Hits on the beat",
    family: "type",
    what: "A word that punches up on each hit of the music and settles back between them.",
    conveys: "Rhythm: the type and the sound feel like one thing.",
    useWhen: ["A word or a title over music with clear hits.", "Promos and openers cut to a track."],
    pairs: ["word-rise-fade"],
    params: [
      { name: "punch", value: "1.35 for 0.05 s", note: "on each beat, then back to 1 with easeOutQuart" },
      { name: "beats", value: "0.5, 1.3 and 2.1 s", note: "anchor them to the music's hits" },
    ],
    prompt: "Punch the word to 1.35 scale on each beat and settle it back with easeOutQuart.",
  },
  {
    slug: "count-up",
    name: "Count up",
    family: "type",
    what: "A number that runs up from zero to its value and holds.",
    conveys: "Size and growth: the viewer feels the number get big.",
    useWhen: ["A statistic, a total or a milestone.", "A number that would otherwise sit flat on screen."],
    pairs: ["stagger"],
    params: [
      { name: "to", value: "12400", note: "the value it counts to and holds" },
      { name: "suffix, label", value: '"+", "cups poured"', note: "what sits beside and under it" },
    ],
    prompt: 'Show a Counter that counts to 12400 with suffix "+" and label "cups poured".',
  },
  {
    slug: "push-in",
    name: "Push in",
    family: "camera",
    what: "The shot grows slowly, as if the camera moves toward the subject.",
    conveys: "Focus and tension: this matters, look closer.",
    useWhen: ["A held shot that needs some life.", "Leading into a key line or a detail."],
    pairs: ["pan", "rack-focus"],
    params: [
      { name: "scale", value: "1 to 1.2 over 3 s", note: "keys on the clip's `transform.scale`, easeInOutSine" },
    ],
    prompt: "Push in slowly on the shot: scale it from 1 to 1.2 across the clip with easeInOutSine.",
  },
  {
    slug: "pan",
    name: "Pan",
    family: "camera",
    what: "The frame travels across a picture larger than itself.",
    conveys: "Space: there is more here than one frame shows.",
    useWhen: ["A wide image, a landscape or a long screenshot.", "Revealing something at one side of the shot."],
    pairs: ["push-in", "parallax"],
    params: [
      { name: "box", value: "960 × 540", note: "larger than the frame, so there is picture to travel over" },
      { name: "box.x", value: "0 to -320 over 3 s", note: "easeInOutSine" },
    ],
    prompt: "Give the clip a box larger than the frame and pan across it with keys on box.x.",
  },
  {
    slug: "parallax",
    name: "Parallax",
    family: "camera",
    what: "Layers move the same way at different speeds: near ones fast, far ones slow.",
    conveys: "Depth in a flat picture.",
    useWhen: ["Graphics or cut-out layers that look flat.", "An opener or a title over layered art."],
    pairs: ["pan"],
    params: [
      { name: "distances", value: "60, 160 and 320 px", note: "far, middle and near layers, over the same 3 s" },
    ],
    prompt: "Move three rows of shapes the same way over 3 s: the far row 60 px, the middle 160, the near 320.",
  },
  {
    slug: "whip-pan",
    name: "Whip pan",
    family: "cuts",
    what: "A fast sideways move that blurs one shot into the next.",
    conveys: "Energy and speed: we jump to the next place without losing momentum.",
    useWhen: ["Fast cuts between places or products.", "A cut that needs to feel quick, not soft."],
    pairs: ["matched-push", "match-on-action"],
    params: [
      { name: "transition", value: '"push", 0.3 s', note: "short, so it reads as a whip" },
      { name: "direction", value: '"left"', note: "the film's main direction" },
    ],
    prompt: 'Join the two shots with a 0.3 s push transition, direction "left".',
  },
  {
    slug: "rack-focus",
    name: "Rack focus",
    family: "camera",
    what: "The sharp part of the picture moves from one thing to another while the first goes soft.",
    conveys: "Where to look now: attention passes from one subject to the next.",
    useWhen: ["Bringing a title or a card in front of footage.", "Two subjects at different depths."],
    pairs: ["push-in"],
    params: [
      { name: "background blur", value: "0 to 8 px", note: "the clip's `blur` effect, keyed" },
      { name: "card blur", value: "10 to 0 px", note: "over the same 0.7 s, easeInOutSine" },
    ],
    prompt: "Move focus from the shot to the card: key the clip's blur from 0 to 8 while the card's goes from 10 to 0.",
  },
  {
    slug: "matched-push",
    name: "Matched push",
    family: "cuts",
    what: "Both shots grow through a hard cut, so the camera seems to keep pushing forward.",
    conveys: "One continuous move across two shots: going deeper into the same thought.",
    useWhen: ["Cutting between two shots of one idea.", "A transition would slow the piece down."],
    pairs: ["match-on-action", "whip-pan"],
    params: [
      { name: "outgoing", value: "1 to 1.25 over the last 0.4 s", note: "easeInQuart: speeding up into the cut" },
      { name: "incoming", value: "0.85 to 1 over the first 0.4 s", note: "easeOutQuart: still moving after it" },
    ],
    prompt:
      "Cut from the first shot to the second while both grow: key the first's scale up with easeInQuart into the cut, and the second's from 0.85 with easeOutQuart.",
  },
  {
    slug: "match-on-action",
    name: "Match on action",
    family: "cuts",
    what: "The cut lands mid-move, and the next shot picks up the same move in the same direction.",
    conveys: "Continuity: two shots read as one action.",
    useWhen: ["Cutting between scenes that both move.", "A cut that should be felt, not seen."],
    pairs: ["matched-push", "match-cut"],
    params: [
      { name: "leaving", value: "320 to 40 px, easeInQuart", note: "fast at the cut" },
      { name: "arriving", value: "600 to 320 px, easeOutQuart", note: "already moving the same way" },
    ],
    prompt:
      "Cut while the subject moves left: it speeds out of the first scene, and the next scene's subject arrives moving left.",
  },
  {
    slug: "iris-mask",
    name: "Iris",
    family: "cuts",
    what: "The next shot opens out of a growing circle.",
    conveys: "A new chapter, or a playful jump to the next scene.",
    useWhen: ["Chapter breaks and openers.", "A light, cartoon-like tone."],
    pairs: ["dip-to-color"],
    params: [{ name: "transition", value: '"iris", 0.8 s', note: "the next shot opens from a circle" }],
    prompt: "Open the second shot from a circle with an 0.8 s iris transition.",
  },
  {
    slug: "match-cut",
    name: "Match cut",
    family: "cuts",
    what: "A shape at the end of one scene becomes the same shape, same size and place, in the next.",
    conveys: "A link between two ideas: this is like that.",
    useWhen: ["Two scenes with a shared form: a circle, a line, a logo.", "Joining ideas without a transition."],
    pairs: ["match-on-action"],
    params: [
      { name: "shape", value: "same size, same place", note: "the first scene's circle becomes the next one's" },
    ],
    prompt: "End the first scene on a circle and start the next on a circle of the same size in the same place.",
  },
  {
    slug: "dip-to-color",
    name: "Dip to black",
    family: "cuts",
    what: "The picture fades to black, then the next shot fades up from it.",
    conveys: "Time passing, or the end of one part.",
    useWhen: ["A jump in time or place.", "Closing a section before the next."],
    pairs: ["iris-mask"],
    params: [{ name: "transition", value: '"dipToBlack", 0.8 s', note: "or dipToWhite" }],
    prompt: "Join the shots with an 0.8 s dipToBlack transition, for time passing.",
  },
  {
    slug: "recolor-reveal",
    name: "Recolour reveal",
    family: "footage",
    what: "One colour of the picture turns into another while you watch.",
    conveys: "A before and after in one shot: this is what changed.",
    useWhen: ["Showing a change of colour, brand or product option.", "A before and after on the same footage."],
    pairs: ["split-compare"],
    params: [
      { name: "from, to", value: '"#c3292a", "#2f9e4f"', note: "the `recolor` effect" },
      { name: "amount", value: "0 to 1 over 0.6 s", note: "keys, easeInOutCubic" },
    ],
    prompt: "Turn the red cup green with a recolor effect whose amount keys from 0 to 1.",
  },
  {
    slug: "speed-ramp",
    name: "Speed ramp",
    family: "footage",
    what: "The shot slows down around its key moment and speeds back up.",
    conveys: "The moment that matters, stretched so it can be seen.",
    useWhen: ["A pour, a jump, a splash: one instant worth watching.", "Action footage that passes too fast."],
    pairs: ["freeze-frame-dressing"],
    params: [{ name: "speed", value: "1, 0.3, 0.3, 1", note: "keys at 0, 0.7, 1.5 and 2.1 s, easeInOutQuad" }],
    prompt: "Slow the shot to 0.3 speed around its key moment and back to 1 with keys on speed.",
  },
  {
    slug: "freeze-frame-dressing",
    name: "Freeze with a label",
    family: "footage",
    what: "The picture holds on one frame while a label names what is in it.",
    conveys: "Stop and look: this is the thing.",
    useWhen: ["Introducing a person or a product in action.", "Pointing at one detail of a moving shot."],
    pairs: ["speed-ramp"],
    params: [
      { name: "freezes", value: "{ start: 0.9, duration: 1.2, source: 18.9 }", note: "one held frame" },
      { name: "label", value: "<Title>", note: "for the hold: starts and ends with the freeze" },
    ],
    prompt: "Hold one frame for 1.2 s with freezes, and show a label for exactly that time.",
  },
  {
    slug: "split-compare",
    name: "Before and after split",
    family: "footage",
    what: "Two versions of a shot side by side, with a divider that slides between them.",
    conveys: "The difference, shown directly rather than described.",
    useWhen: ["A grade, a fix or a filter.", "Any edit whose result is best seen against the original."],
    pairs: ["recolor-reveal", "clip-reveal"],
    params: [
      { name: "after", value: "the same clip, recoloured", note: "on a track above the before" },
      { name: "crop.width", value: "0.15, 0.85, 0.5", note: "keys; a divider shape's box.x follows the same keys" },
    ],
    prompt:
      "Lay the after version over the before, crop it from the left with keys on crop.width, and move a divider with it.",
  },
  {
    slug: "picture-in-picture",
    name: "Picture in picture",
    family: "camera",
    what: "A small shot pops into a corner over the main one.",
    conveys: "Two views at once: a detail or a reaction alongside the main action.",
    useWhen: ["A reaction, a screen or a close-up that belongs with the main shot.", "A talking head over a demo."],
    pairs: ["push-in"],
    params: [
      { name: "box", value: "200 × 112, bottom right", note: "with 12 px rounded corners" },
      { name: "scale", value: "0 to 1, easeOutBack", note: "the pop in" },
    ],
    prompt: "Pop a 200 × 112 inset into the bottom right corner with rounded corners and an easeOutBack scale.",
  },
  {
    slug: "clip-reveal",
    name: "Wipe reveal",
    family: "footage",
    what: "The shot is uncovered from one edge to the other.",
    conveys: "Arrival: here it is, revealed in one sweep.",
    useWhen: ["Bringing in a shot or a product image.", "A cleaner entrance than a fade."],
    pairs: ["split-compare"],
    params: [{ name: "crop.width", value: "0 to 1 over 1 s", note: "keys, easeInOutQuart: opens from the left" }],
    prompt: "Reveal the shot from the left with keys on its crop.width from 0 to 1.",
  },
];

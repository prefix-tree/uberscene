import { Clip, Composition, Shape, Svg, Title, Track } from "@uberscene/kit";

/**
 * A prompt becomes an edit: "Edit my new ad." is typed and sent, the raw shot fans out into the five passes of an
 * edit (cuts, colour, captions, sound, graphics), each lights up in turn, the finished shot fills its card, and then
 * the frame. Built from the motion catalog's techniques: a typewriter, a stagger, spring overshoots, the pause before
 * the payoff, a clip reveal and a push-in.
 */
const INK = "#0f1012";
const CARD = "#1b1c21";
const LINE = "#7476d8";
const TEXT = "#eceef1";
const MUTED = "#8a8f99";

/** Where the five passes sit, top to bottom: cuts, colour, captions, sound, graphics. Each lights 0.55 s after the last. */
const PASS_Y = [230, 315, 400, 485, 570];
/** The grade the colour pass gives: warmer, richer. */
const GRADED = [
  { type: "whiteBalance", temperature: 0.18 },
  { type: "vibrance", amount: 0.45 },
] as const;

/** The lines from the raw card to each pass, and from each pass to the finished card. */
const LINES = `<svg viewBox='0 0 1280 720'><g fill='none' stroke='${LINE}' stroke-width='3' stroke-linecap='round'>${PASS_Y.map(
  (y) => `<path d='M315 400 C 410 400, 410 ${y}, 500 ${y}'/><path d='M780 ${y} C 870 ${y}, 870 400, 965 400'/>`,
).join("")}</g></svg>`;

export default function Video() {
  return (
    <Composition fps={30} width={1280} height={720} background={{ type: "color", color: INK }}>
      {/* 1. The prompt, typed and sent. */}
      <Track id="prompt" layout="free">
        <Shape
          id="bar"
          type="rectangle"
          start={0}
          duration={2.7}
          width={780}
          height={88}
          cornerRadius={44}
          fill={CARD}
          stroke={{ color: LINE, thickness: 2 }}
          box={{ x: 640, y: 360, origin: "center" }}
          enter={{ type: "fade", duration: 0.3 }}
          exit={{ type: "fade", duration: 0.25 }}
        />
        <Shape
          id="orb"
          type="circle"
          start={0}
          duration={2.7}
          width={46}
          height={46}
          fill={{
            type: "gradient",
            gradient: {
              type: "linear",
              angle: 135,
              stops: [
                { offset: 0, color: "#ff5c8a" },
                { offset: 1, color: "#5b8cff" },
              ],
            },
          }}
          box={{ x: 300, y: 360, origin: "center" }}
          exit={{ type: "fade", duration: 0.25 }}
        />
        <Title
          id="ask"
          start={0.3}
          duration={2.4}
          style={{ size: 40, weight: 700, color: TEXT, align: "left" }}
          box={{ x: 345, y: 360, width: 520, height: 60, origin: "left" }}
          animation={{ type: "typewriter", in: 1 }}
          exit={{ type: "fade", duration: 0.25 }}
        >
          Edit my new ad.
        </Title>
        {/* Pressed at 1.9 s; the diagram answers at 2.6 s, after a pause. */}
        <Shape
          id="send"
          type="circle"
          start={0}
          duration={2.7}
          width={58}
          height={58}
          fill={TEXT}
          box={{ x: 980, y: 360, origin: "center" }}
          transform={{
            scale: [
              { at: 1.85, value: 1, easing: "easeOutQuad" },
              { at: 1.92, value: 0.86, easing: "easeOutBack" },
              { at: 2.1, value: 1 },
            ],
          }}
          exit={{ type: "fade", duration: 0.25 }}
        />
        <Title
          id="arrow"
          start={0}
          duration={2.7}
          style={{ size: 30, weight: 800, color: INK }}
          box={{ x: 980, y: 360, origin: "center" }}
          exit={{ type: "fade", duration: 0.25 }}
        >
          ↑
        </Title>
      </Track>

      {/* 2. The edit, pass by pass. */}
      <Track id="diagram" layout="free">
        <Title
          id="heading"
          start={2.6}
          duration={5.8}
          style={{ size: 22, weight: 700, color: MUTED, letterSpacing: 8 }}
          box={{ x: 640, y: 110, origin: "center" }}
          enter={{ type: "fade", duration: 0.4 }}
          exit={{ type: "fade", duration: 0.3 }}
        >
          ONE FILE · FIVE PASSES
        </Title>
        <Shape
          id="raw-card"
          type="rectangle"
          start={2.6}
          duration={5.8}
          width={250}
          height={310}
          cornerRadius={14}
          fill={CARD}
          box={{ x: 190, y: 400, origin: "center" }}
          enter={{ type: "fade", duration: 0.4 }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Shape
          id="done-card"
          type="rectangle"
          start={2.6}
          duration={5.8}
          width={250}
          height={310}
          cornerRadius={14}
          fill={CARD}
          box={{ x: 1090, y: 400, origin: "center" }}
          enter={{ type: "fade", duration: 0.4 }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Title
          id="raw-label"
          start={2.6}
          duration={5.8}
          style={{ size: 18, weight: 700, color: MUTED, letterSpacing: 4 }}
          box={{ x: 190, y: 270, origin: "center" }}
          enter={{ type: "fade", duration: 0.4 }}
          exit={{ type: "fade", duration: 0.3 }}
        >
          RAW
        </Title>
        <Title
          id="done-label"
          start={2.6}
          duration={5.8}
          style={{ size: 18, weight: 700, color: MUTED, letterSpacing: 4 }}
          box={{ x: 1090, y: 270, origin: "center" }}
          enter={{ type: "fade", duration: 0.4 }}
          exit={{ type: "fade", duration: 0.3 }}
        >
          FINISHED
        </Title>
        <Svg
          id="lines"
          start={3.1}
          duration={5.3}
          content={LINES}
          box={{ x: 0, y: 0, width: 1280, height: 720 }}
          enter={{ type: "draw", duration: 1, easing: "easeInOutCubic" }}
          exit={{ type: "fade", duration: 0.3 }}
        />
      </Track>

      {/* The raw shot, flat and grey, in its card. A track of footage draws over the graphics in the tracks before it
          (the cards), so the shot sits on its card rather than under it. */}
      <Track id="raw-shot" layout="free">
        <Clip
          id="raw"
          src="asset:redCup"
          start={2.6}
          in={18}
          out={23.8}
          fit="cover"
          volume={0}
          box={{ x: 190, y: 418, width: 226, height: 246, origin: "center" }}
          effects={[
            { type: "saturation", amount: -0.8 },
            { type: "exposure", stops: -0.4 },
          ]}
          transform={{
            borderRadius: 8,
            opacity: [
              { at: 0, value: 0 },
              { at: 0.4, value: 1 },
              { at: 5.5, value: 1 },
              { at: 5.8, value: 0 },
            ],
          }}
        />
      </Track>

      {/* The passes come in as a stagger, then light up one after another, each with a check that pops. */}
      <Track id="passes" layout="free">
        <Shape
          id="cuts-card"
          type="rectangle"
          start={2.9}
          duration={5.5}
          width={280}
          height={62}
          cornerRadius={12}
          fill={CARD}
          box={{ x: 640, y: 230, origin: "center" }}
          enter={{ type: "slideUp", duration: 0.45, easing: "easeOutQuart" }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Title
          id="cuts-label"
          start={2.9}
          duration={5.5}
          style={{ size: 22, weight: 800, color: TEXT, letterSpacing: 3, align: "left" }}
          box={{ x: 525, y: 230, width: 200, height: 40, origin: "left" }}
          enter={{ type: "slideUp", duration: 0.45, easing: "easeOutQuart" }}
          exit={{ type: "fade", duration: 0.3 }}
        >
          CUTS
        </Title>
        <Shape
          id="cuts-lit"
          type="rectangle"
          start={4.3}
          duration={4.1}
          width={280}
          height={62}
          cornerRadius={12}
          fill={{ type: "none" }}
          stroke={{ color: LINE, thickness: 2 }}
          box={{ x: 640, y: 230, origin: "center" }}
          enter={{ type: "fade", duration: 0.15 }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Shape
          id="cuts-check"
          type="circle"
          start={4.3}
          duration={4.1}
          width={26}
          height={26}
          fill={LINE}
          box={{ x: 750, y: 230, origin: "center" }}
          transform={{
            scale: [
              { at: 0, value: 0.01, easing: "easeOutBack" },
              { at: 0.35, value: 1 },
            ],
          }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Shape
          id="color-card"
          type="rectangle"
          start={3.0}
          duration={5.4}
          width={280}
          height={62}
          cornerRadius={12}
          fill={CARD}
          box={{ x: 640, y: 315, origin: "center" }}
          enter={{ type: "slideUp", duration: 0.45, easing: "easeOutQuart" }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Title
          id="color-label"
          start={3.0}
          duration={5.4}
          style={{ size: 22, weight: 800, color: TEXT, letterSpacing: 3, align: "left" }}
          box={{ x: 525, y: 315, width: 200, height: 40, origin: "left" }}
          enter={{ type: "slideUp", duration: 0.45, easing: "easeOutQuart" }}
          exit={{ type: "fade", duration: 0.3 }}
        >
          COLOR
        </Title>
        <Shape
          id="color-lit"
          type="rectangle"
          start={4.85}
          duration={3.55}
          width={280}
          height={62}
          cornerRadius={12}
          fill={{ type: "none" }}
          stroke={{ color: LINE, thickness: 2 }}
          box={{ x: 640, y: 315, origin: "center" }}
          enter={{ type: "fade", duration: 0.15 }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Shape
          id="color-check"
          type="circle"
          start={4.85}
          duration={3.55}
          width={26}
          height={26}
          fill={LINE}
          box={{ x: 750, y: 315, origin: "center" }}
          transform={{
            scale: [
              { at: 0, value: 0.01, easing: "easeOutBack" },
              { at: 0.35, value: 1 },
            ],
          }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Shape
          id="captions-card"
          type="rectangle"
          start={3.1}
          duration={5.3}
          width={280}
          height={62}
          cornerRadius={12}
          fill={CARD}
          box={{ x: 640, y: 400, origin: "center" }}
          enter={{ type: "slideUp", duration: 0.45, easing: "easeOutQuart" }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Title
          id="captions-label"
          start={3.1}
          duration={5.3}
          style={{ size: 22, weight: 800, color: TEXT, letterSpacing: 3, align: "left" }}
          box={{ x: 525, y: 400, width: 200, height: 40, origin: "left" }}
          enter={{ type: "slideUp", duration: 0.45, easing: "easeOutQuart" }}
          exit={{ type: "fade", duration: 0.3 }}
        >
          CAPTIONS
        </Title>
        <Shape
          id="captions-lit"
          type="rectangle"
          start={5.4}
          duration={3.0}
          width={280}
          height={62}
          cornerRadius={12}
          fill={{ type: "none" }}
          stroke={{ color: LINE, thickness: 2 }}
          box={{ x: 640, y: 400, origin: "center" }}
          enter={{ type: "fade", duration: 0.15 }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Shape
          id="captions-check"
          type="circle"
          start={5.4}
          duration={3.0}
          width={26}
          height={26}
          fill={LINE}
          box={{ x: 750, y: 400, origin: "center" }}
          transform={{
            scale: [
              { at: 0, value: 0.01, easing: "easeOutBack" },
              { at: 0.35, value: 1 },
            ],
          }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Shape
          id="sound-card"
          type="rectangle"
          start={3.2}
          duration={5.2}
          width={280}
          height={62}
          cornerRadius={12}
          fill={CARD}
          box={{ x: 640, y: 485, origin: "center" }}
          enter={{ type: "slideUp", duration: 0.45, easing: "easeOutQuart" }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Title
          id="sound-label"
          start={3.2}
          duration={5.2}
          style={{ size: 22, weight: 800, color: TEXT, letterSpacing: 3, align: "left" }}
          box={{ x: 525, y: 485, width: 200, height: 40, origin: "left" }}
          enter={{ type: "slideUp", duration: 0.45, easing: "easeOutQuart" }}
          exit={{ type: "fade", duration: 0.3 }}
        >
          SOUND
        </Title>
        <Shape
          id="sound-lit"
          type="rectangle"
          start={5.95}
          duration={2.45}
          width={280}
          height={62}
          cornerRadius={12}
          fill={{ type: "none" }}
          stroke={{ color: LINE, thickness: 2 }}
          box={{ x: 640, y: 485, origin: "center" }}
          enter={{ type: "fade", duration: 0.15 }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Shape
          id="sound-check"
          type="circle"
          start={5.95}
          duration={2.45}
          width={26}
          height={26}
          fill={LINE}
          box={{ x: 750, y: 485, origin: "center" }}
          transform={{
            scale: [
              { at: 0, value: 0.01, easing: "easeOutBack" },
              { at: 0.35, value: 1 },
            ],
          }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Shape
          id="graphics-card"
          type="rectangle"
          start={3.3}
          duration={5.1}
          width={280}
          height={62}
          cornerRadius={12}
          fill={CARD}
          box={{ x: 640, y: 570, origin: "center" }}
          enter={{ type: "slideUp", duration: 0.45, easing: "easeOutQuart" }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Title
          id="graphics-label"
          start={3.3}
          duration={5.1}
          style={{ size: 22, weight: 800, color: TEXT, letterSpacing: 3, align: "left" }}
          box={{ x: 525, y: 570, width: 200, height: 40, origin: "left" }}
          enter={{ type: "slideUp", duration: 0.45, easing: "easeOutQuart" }}
          exit={{ type: "fade", duration: 0.3 }}
        >
          GRAPHICS
        </Title>
        <Shape
          id="graphics-lit"
          type="rectangle"
          start={6.5}
          duration={1.9}
          width={280}
          height={62}
          cornerRadius={12}
          fill={{ type: "none" }}
          stroke={{ color: LINE, thickness: 2 }}
          box={{ x: 640, y: 570, origin: "center" }}
          enter={{ type: "fade", duration: 0.15 }}
          exit={{ type: "fade", duration: 0.3 }}
        />
        <Shape
          id="graphics-check"
          type="circle"
          start={6.5}
          duration={1.9}
          width={26}
          height={26}
          fill={LINE}
          box={{ x: 750, y: 570, origin: "center" }}
          transform={{
            scale: [
              { at: 0, value: 0.01, easing: "easeOutBack" },
              { at: 0.35, value: 1 },
            ],
          }}
          exit={{ type: "fade", duration: 0.3 }}
        />
      </Track>

      {/* The finished shot fills its card once the last pass lights, after a pause. */}
      <Track id="done" layout="free">
        <Clip
          id="graded"
          src="asset:redCup"
          start={7.1}
          in={22.5}
          out={23.8}
          fit="cover"
          volume={0}
          box={{ x: 1090, y: 418, width: 226, height: 246, origin: "center" }}
          transform={{
            borderRadius: 8,
            crop: {
              width: [
                { at: 0, value: 0, easing: "easeInOutQuart" },
                { at: 0.6, value: 1 },
              ],
            },
          }}
          effects={GRADED}
        />
      </Track>

      {/* 3. The finished cut grows out of its card to fill the frame, and keeps pushing in. */}
      <Track id="final" layout="free">
        <Clip
          id="finished"
          src="asset:redCup"
          start={8.2}
          in={23.6}
          out={27.4}
          fit="cover"
          volume={0}
          transform={{
            anchor: { x: 0.852, y: 0.58 },
            scale: [
              { at: 0, value: 0.2, easing: "easeInOutCubic" },
              { at: 0.7, value: 1, easing: "easeOutSine" },
              { at: 3.8, value: 1.08 },
            ],
          }}
          effects={GRADED}
        />
        <Title
          id="caption"
          start={9.1}
          duration={2.9}
          style={{ size: 40, weight: 800, color: TEXT, background: "rgba(15, 16, 18, 0.78)" }}
          box={{ x: 640, y: 630, width: 760, height: 72, origin: "center" }}
          animation={{ type: "wordByWord", in: 0.9, stagger: 0.12 }}
          exit={{ type: "fade", duration: 0.3 }}
        >
          Cut, graded, captioned. One file.
        </Title>
      </Track>
    </Composition>
  );
}

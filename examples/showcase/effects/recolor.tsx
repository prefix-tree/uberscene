import { Clip, Composition, Track } from "@uberscene/kit";

// recolor: Turns one colour into another and leaves the rest: a red cup made green.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip
          id="shot"
          src="asset:redCup"
          in={18}
          out={21}
          fit="cover"
          effects={[
            {
              type: "recolor",
              from: "#c4202b",
              to: "#2f9e4f",
              amount: [
                { at: 0.5, value: 0, easing: "easeInOut" },
                { at: 1.5, value: 1 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}

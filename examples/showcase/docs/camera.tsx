import { Camera, Clip, Composition, Shape, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} background={{ type: "color", color: "#3447ff" }}>
      {/* Everything on the camera's tracks moves together: here it pans to make room, then pulls back. */}
      <Camera
        id="cam"
        x={[
          { at: 1, value: 0, easing: "snappy" },
          { at: 1.3, value: -70 },
        ]}
        zoom={[
          { at: 2.2, value: 1, easing: "snappy" },
          { at: 2.5, value: 0.88 },
        ]}
      >
        <Track id="subject" layout="free">
          <Clip
            id="pour"
            src="asset:espresso"
            start={0}
            in={6}
            duration={4}
            volume={0}
            fit="cover"
            box={{ x: 480, y: 280, width: 400, height: 225, origin: "center" }}
            transform={{ borderRadius: 16 }}
          />
        </Track>
        <Track id="cards" layout="free">
          <Shape
            id="card"
            type="rectangle"
            start={1}
            duration={3}
            width={150}
            height={190}
            cornerRadius={12}
            fill="#ffffff"
            box={{ x: 130, y: 280, origin: "center" }}
            enter={{ type: "pop", duration: 0.3 }}
          />
          <Shape
            id="card-2"
            type="rectangle"
            start={2.2}
            duration={1.8}
            width={150}
            height={190}
            cornerRadius={12}
            fill="#ffffff"
            box={{ x: 870, y: 280, origin: "center" }}
            enter={{ type: "pop", duration: 0.3 }}
          />
        </Track>
      </Camera>
      {/* A track outside the camera stays fixed to the screen. */}
      <Track id="brand" layout="free">
        <Title id="mark" start={0} duration={4} box={{ x: 480, y: 48, origin: "center" }} style={{ size: 20 }}>
          fixed to the screen
        </Title>
      </Track>
    </Composition>
  );
}

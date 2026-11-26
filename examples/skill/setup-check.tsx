// setup-check.tsx
import { Composition, Title, Track } from "@uberscene/kit";

export const manifest = { assets: {} };

export default function Video() {
  return (
    <Composition fps={30} width={1080} height={1920}>
      <Track id="text">
        <Title id="hello" duration={3} style="h1">
          UberScene works
        </Title>
      </Track>
    </Composition>
  );
}

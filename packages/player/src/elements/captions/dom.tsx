// How `<Captions>` are drawn as DOM: over every track, for the whole video, the cues showing at the moment.
import type { DomDrawingOf } from "../dom-drawing";
import { Captions } from "./Captions";

export const captionsDom: DomDrawingOf<"captions"> = {
  render: (props) => <Captions placement={props.placement} state={props.state} time={props.time} />,
  where: "top",
  effects: "none",
};

// How a `<Title>` is drawn as DOM.
import type { DomDrawingOf } from "../dom-drawing";
import { Title } from "./Title";

export const titleDom: DomDrawingOf<"title"> = {
  render: (props) => <Title {...props} />,
  where: "track",
  effects: "pipeline",
};
